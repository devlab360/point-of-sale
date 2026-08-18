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
  referenceType: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  referenceId: z.string(),
  productId: z.string().optional(),
  productName: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  taxAmt: z.number().optional().nullable(),
  discountAmt: z.number().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  batchNo: z.string().optional().nullable(),
});

const SaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  date: z.string().optional(),
  status: z.string(),
  paymentMethod: z.string(),
  paid: z.number().optional().nullable(),
  payments: z.array(z.any()).optional().nullable(),
  salesmanName: z.string().optional().nullable(),
});

export const createSaleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sale: SaleSchema,
      items: z.array(SaleItemSchema),
    }),
  )
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
          itemsCount += Number(item.quantity || 1);
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

        if (
          data.sale.payments &&
          Array.isArray(data.sale.payments) &&
          data.sale.payments.length > 0
        ) {
          const paymentsToInsert = data.sale.payments.map((p: any) => ({
            organizationId: session.orgId,
            saleId,
            amount: p.amount?.toString() || total.toFixed(2),
            method: p.method || data.sale.paymentMethod || "cash",
            transactionRef: p.transactionRef || null,
            date: new Date().toISOString(),
          }));
          await tx.insert(schema.salePayments).values(paymentsToInsert as any);
        }

        if (data.items && data.items.length > 0) {
          const itemsWithSaleId = data.items.map((item) => ({
            organizationId: session.orgId,
            saleId,
            referenceType: item.referenceType,
            referenceId: item.referenceId,
            productId: item.productId || item.referenceId, // For backwards compatibility
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

          // Only deduct stock for PRODUCT types
          for (const item of data.items) {
            if (item.referenceType === "PRODUCT") {
              const prodRes = await tx
                .select()
                .from(schema.products)
                .where(
                  and(
                    eq(schema.products.id, item.referenceId),
                    eq(schema.products.organizationId, session.orgId),
                  ),
                )
                .limit(1);
              if (prodRes.length > 0) {
                const currentStock = Number(prodRes[0].stock || "0");
                const newStock = Math.max(0, currentStock - item.quantity);
                await tx
                  .update(schema.products)
                  .set({ stock: newStock.toString() })
                  .where(eq(schema.products.id, item.referenceId));

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
        }

        // Khatabook integration (Customer Ledger)
        if (data.sale.customerId) {
          const cust = await tx.query.customers.findFirst({
            where: (c, { eq, and }) => and(eq(c.id, data.sale.customerId), eq(c.organizationId, session.orgId))
          });

          if (cust) {
            const currentCredit = Number(cust.credit || 0); // What they owe us
            const total = Number(data.sale.total || 0);
            const paid = Number(data.sale.paid || 0);

            // Goods sold: they owe us more (+total)
            // They pay us: they owe us less (-paid)
            const netChange = total - paid;
            const newCredit = currentCredit + netChange;

            await tx.update(schema.customers)
              .set({ credit: newCredit.toString() })
              .where(eq(schema.customers.id, cust.id));

            await tx.insert(schema.customerLedgers).values({
              id: crypto.randomUUID(),
              organizationId: session.orgId,
              customerId: cust.id,
              date: new Date().toISOString(),
              type: "Sale",
              amount: netChange.toString(), // The change to their balance
              balanceAfter: newCredit.toString(),
              referenceNo: invoiceNo,
              note: `Sale ${invoiceNo} - Total: ${total.toFixed(2)}, Paid: ${paid.toFixed(2)}`
            });

            // If we received money, log it to accounts
            if (paid > 0) {
              const paymentMethod = data.payments?.[0]?.method || data.sale.paymentMethod || "cash";
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) => and(eq(a.type, paymentMethod), eq(a.organizationId, session.orgId))
              });

              if (account) {
                // Add to our cash/bank account
                const accBalance = Number(account.balance || 0) + paid;
                await tx.update(schema.accounts)
                  .set({ balance: accBalance.toString() })
                  .where(eq(schema.accounts.id, account.id));

                await tx.insert(schema.vouchers).values({
                  id: crypto.randomUUID(),
                  organizationId: session.orgId,
                  ref: `VOU-${Math.floor(Math.random() * 10000)}`,
                  date: new Date().toISOString(),
                  type: "Receipt", // Receiving money from customer
                  accountId: account.id,
                  amount: paid.toString(),
                  status: "completed"
                });
              }
            }
          }
        }
      });
      return { success: true, data: { id: saleId } };
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
