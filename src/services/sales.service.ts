import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/lib/errors/errors";

export interface CreateSaleInput {
  customerId?: string | null;
  customerName?: string;
  salesmanId?: string;
  salesmanName?: string | null;
  date?: string;
  status: string;
  paymentMethod: string;
  paid?: number | null;
  payments?: Array<{ amount: number; method: string; transactionRef?: string }>;
  items: Array<{
    referenceType?: string;
    referenceId: string;
    productId?: string;
    productName: string;
    quantity: number;
    price: number;
    taxAmt?: number | null;
    discountAmt?: number | null;
    serialNumber?: string | null;
    batchNo?: string | null;
  }>;
}

export interface SalesQueryFilters {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  payment?: string;
}

export class SalesService {
  async getSales(orgId: string, filters: SalesQueryFilters) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;

    let conditions = [eq(schema.sales.organizationId, orgId)];

    if (filters.query) {
      const searchCond = or(
        ilike(schema.sales.customerName, `%${filters.query}%`),
        ilike(schema.sales.id, `%${filters.query}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }
    if (filters.status) {
      conditions.push(eq(schema.sales.status, filters.status));
    }
    if (filters.payment) {
      conditions.push(eq(schema.sales.paymentMethod, filters.payment));
    }

    const whereClause = and(...conditions);

    const salesList = await db
      .select()
      .from(schema.sales)
      .where(whereClause)
      .orderBy(desc(schema.sales.date))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalCountRes = await db
      .select({ count: sql`count(*)` })
      .from(schema.sales)
      .where(whereClause);
    const totalCount = Number(totalCountRes[0]?.count || 0);

    let salesWithItems = salesList.map((s) => ({ ...s, saleItems: [] as any[] }));

    if (salesList.length > 0) {
      const saleIds = salesList.map((s) => s.id);
      const allItems = await db
        .select()
        .from(schema.saleItems)
        .where(inArray(schema.saleItems.saleId, saleIds));

      const itemsMap = new Map<string, any[]>();
      allItems.forEach((item) => {
        if (!itemsMap.has(item.saleId)) itemsMap.set(item.saleId, []);
        itemsMap.get(item.saleId)!.push(item);
      });
      salesWithItems = salesList.map((s) => ({ ...s, saleItems: itemsMap.get(s.id) || [] }));
    }

    return { sales: salesWithItems, totalCount };
  }

  async getSaleItems(orgId: string, saleId: string) {
    const sales = await db
      .select()
      .from(schema.sales)
      .where(and(eq(schema.sales.id, saleId), eq(schema.sales.organizationId, orgId)))
      .limit(1);

    if (!sales.length) {
      throw new NotFoundError(`Sale transaction with ID ${saleId} not found`);
    }

    return await db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId));
  }

  async createSale(orgId: string, userId: string, userName: string, input: CreateSaleInput) {
    const saleId = uuidv4();
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let itemsCount = 0;

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        subtotal += item.quantity * item.price;
        totalTax += item.taxAmt || 0;
        totalDiscount += item.discountAmt || 0;
        itemsCount += Number(item.quantity || 1);
      }
    }

    const total = subtotal + totalTax - totalDiscount;

    await db.transaction(async (tx) => {
      await tx.insert(schema.sales).values({
        id: saleId,
        organizationId: orgId,
        customerId: input.customerId && input.customerId !== "walkin" ? input.customerId : null,
        customerName: input.customerName || "Walk-in Customer",
        salesmanId: userId,
        salesmanName: input.salesmanName || userName || "Cashier",
        date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
        items: itemsCount,
        subtotal: subtotal.toFixed(2),
        taxAmt: totalTax.toFixed(2),
        discountAmt: totalDiscount.toFixed(2),
        total: total.toFixed(2),
        status: input.status || "completed",
        paymentMethod: input.paymentMethod || "cash",
        payments: Array.isArray(input.payments) ? input.payments : null,
        locationId: (input as any).locationId || null,
      } as any);

      if (input.payments && Array.isArray(input.payments) && input.payments.length > 0) {
        const paymentsToInsert = input.payments.map((p) => ({
          organizationId: orgId,
          saleId,
          amount: p.amount?.toString() || total.toFixed(2),
          method: p.method || input.paymentMethod || "cash",
          transactionRef: p.transactionRef || null,
          date: new Date().toISOString(),
        }));
        await tx.insert(schema.salePayments).values(paymentsToInsert as any);
      }

      if (input.items && input.items.length > 0) {
        const itemsWithSaleId = input.items.map((item) => ({
          organizationId: orgId,
          saleId,
          referenceType: item.referenceType || "PRODUCT",
          referenceId: item.referenceId,
          productId: item.productId || item.referenceId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          total: (item.quantity * item.price).toFixed(2),
          taxAmt: (item.taxAmt || 0).toFixed(2),
          discountAmt: (item.discountAmt || 0).toFixed(2),
          serialNumber: item.serialNumber || null,
          batchNo: item.batchNo || null,
        }));
        await tx.insert(schema.saleItems).values(itemsWithSaleId as any);

        // Deduct Inventory Stock
        for (const item of input.items) {
          if (item.referenceType !== "SERVICE") {
            const targetProductId = item.productId || item.referenceId;
            const existingProds = await tx
              .select()
              .from(schema.products)
              .where(eq(schema.products.id, targetProductId))
              .limit(1);

            if (existingProds.length > 0) {
              const currentStock = Number(existingProds[0].stock || 0);
              const newStock = Math.max(0, currentStock - item.quantity);
              await tx
                .update(schema.products)
                .set({ stock: newStock.toString() })
                .where(eq(schema.products.id, targetProductId));
            }
          }
        }
      }

      // Customer Loyalty & Spending Update
      if (input.customerId && input.customerId !== "walkin") {
        const custRes = await tx
          .select()
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.id, input.customerId),
              eq(schema.customers.organizationId, orgId),
            ),
          )
          .limit(1);

        if (custRes.length > 0) {
          const c = custRes[0];
          const earnedPoints = Math.floor(total / 10);
          const currentPoints = Number(c.loyaltyPoints || 0);
          await tx
            .update(schema.customers)
            .set({
              totalSpent: String(Number(c.totalSpent || 0) + total),
              visits: (c.visits || 0) + 1,
              loyaltyPoints: currentPoints + earnedPoints,
            })
            .where(eq(schema.customers.id, input.customerId));
        }
      }
    });

    return { saleId, total };
  }
}

export const salesService = new SalesService();
