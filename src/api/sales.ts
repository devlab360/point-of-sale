import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

export const getSalesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        status: z.string().optional(),
        payment: z.string().optional(),
        sync: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      let conditions = [eq(schema.sales.organizationId, orgId)];
      if (data.query) {
        const searchCond = or(
          ilike(schema.sales.customerName, `%${data.query}%`),
          // H-3 fix: Also allow searching by invoice/sale ID fragment
          ilike(schema.sales.id, `%${data.query}%`),
        );
        if (searchCond) conditions.push(searchCond);
      }
      if (data.status) {
        conditions.push(eq(schema.sales.status, data.status));
      }
      if (data.payment) {
        conditions.push(eq(schema.sales.paymentMethod, data.payment));
      }

      const whereClause = and(...conditions);

      const res = await db
        .select()
        .from(schema.sales)
        .where(whereClause)
        .orderBy(desc(schema.sales.date))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize);

      const totalCountRes = await db
        .select({ count: sql`count(*)` })
        .from(schema.sales)
        .where(whereClause);
      const totalCount = Number(totalCountRes[0].count);

      // C-1 fix: Fetch and merge saleItems so dashboard charts and top sellers work
      let salesWithItems = res.map((s) => ({ ...s, saleItems: [] as any[] }));
      if (res.length > 0) {
        const saleIds = res.map((s) => s.id);
        const allItems = await db
          .select()
          .from(schema.saleItems)
          .where(inArray(schema.saleItems.saleId, saleIds));
        const itemsMap = new Map<string, any[]>();
        allItems.forEach((item) => {
          if (!itemsMap.has(item.saleId)) itemsMap.set(item.saleId, []);
          itemsMap.get(item.saleId)!.push(item);
        });
        salesWithItems = res.map((s) => ({ ...s, saleItems: itemsMap.get(s.id) || [] }));
      }

      return { success: true, data: salesWithItems, total: totalCount };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getSaleItemsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      // Enforce tenant isolation
      const sales = await db
        .select()
        .from(schema.sales)
        .where(
          and(eq(schema.sales.id, data.saleId), eq(schema.sales.organizationId, session.orgId)),
        )
        .limit(1);
      if (!sales.length) return { success: false, error: "Unauthorized or not found" };

      const res = await db
        .select()
        .from(schema.saleItems)
        .where(eq(schema.saleItems.saleId, data.saleId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  taxAmt: z.number().optional().nullable(),
  discountAmt: z.number().optional().nullable(),
});

const SaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  date: z.string().optional(),
  status: z.string(),
  paymentMethod: z.string(),
  paid: z.number().optional().nullable(),
});

export const createSaleFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();

      const saleId = uuidv4();
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let itemsCount = 0;

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          subtotal += item.quantity * item.price;
          totalTax += item.taxAmt || 0;
          totalDiscount += item.discountAmt || 0;
          itemsCount += item.quantity;
        }
      }

      const total = subtotal + totalTax - totalDiscount;

      await db.transaction(async (tx) => {
        await tx.insert(schema.sales).values({
          id: saleId,
          organizationId: session.orgId,
          customerId:
            data.sale.customerId && data.sale.customerId !== "walkin" ? data.sale.customerId : null,
          customerName: data.sale.customerName || "Walk-in Customer",
          salesmanId: session.userId,
          salesmanName:
            typeof data.sale.salesmanName === "string"
              ? data.sale.salesmanName
              : session.userName || "Cashier",
          date: data.sale.date ? new Date(data.sale.date).toISOString() : new Date().toISOString(),
          items: itemsCount,
          subtotal: subtotal.toFixed(2),
          taxAmt: totalTax.toFixed(2),
          discountAmt: totalDiscount.toFixed(2),
          total: total.toFixed(2),
          status: data.sale.status || "completed",
          paymentMethod: data.sale.paymentMethod || "cash",
          payments: Array.isArray(data.sale.payments) ? data.sale.payments : null,
        } as any);

        if (data.items && data.items.length > 0) {
          const itemsWithSaleId = data.items.map((item: any) => ({
            organizationId: session.orgId,
            saleId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price.toString(),
            total: (
              item.quantity * item.price +
              (item.taxAmt || 0) -
              (item.discountAmt || 0)
            ).toString(),
            serialNumber: item.serialNumber || null,
            batchNo: item.batchNo || null,
          }));
          await tx.insert(schema.saleItems).values(itemsWithSaleId as any);

          // H-5 fix: Deduct stock and trigger low-stock notifications
          for (const item of data.items) {
            const prodRes = await tx
              .select()
              .from(schema.products)
              .where(
                and(
                  eq(schema.products.id, item.productId),
                  eq(schema.products.organizationId, session.orgId),
                ),
              )
              .limit(1);
            if (prodRes.length > 0) {
              const currentStock = prodRes[0].stock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              await tx
                .update(schema.products)
                .set({ stock: newStock })
                .where(eq(schema.products.id, item.productId));

              if (newStock <= Number(prodRes[0].reorderLevel || 5)) {
                await tx.insert(schema.notifications).values({
                  id: uuidv4(),
                  organizationId: session.orgId,
                  title: newStock <= 0 ? "Out of Stock Alert" : "Low Stock Alert",
                  description: `Product "${prodRes[0].name}" is ${newStock <= 0 ? "out of stock" : `down to ${newStock} units`}`,
                  type: "inventory",
                  timestamp: new Date().toISOString(),
                  read: false,
                });
              }
            }
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSaleFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { id, ...safeUpdates } = data.updates as any;

      await db
        .update(schema.sales)
        .set(safeUpdates)
        .where(and(eq(schema.sales.id, data.id), eq(schema.sales.organizationId, session.orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteSaleFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      await db.transaction(async (tx) => {
        // Enforce tenant isolation by checking if sale belongs to org first
        const sales = await tx
          .select()
          .from(schema.sales)
          .where(and(eq(schema.sales.id, data.id), eq(schema.sales.organizationId, session.orgId)))
          .limit(1);
        if (!sales.length) throw new Error("Unauthorized");

        await tx.delete(schema.saleItems).where(eq(schema.saleItems.saleId, data.id));
        await tx.delete(schema.sales).where(eq(schema.sales.id, data.id));
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
