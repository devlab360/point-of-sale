import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";

export const getPurchasesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        status: z.string().optional(),
        supplierId: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      let conditions = [eq(schema.purchases.organizationId, orgId)];
      if (data.query) {
        const searchCond = or(
          ilike(schema.purchases.supplier, `%${data.query}%`),
          ilike(schema.purchases.invoiceNo, `%${data.query}%`),
        );
        if (searchCond) conditions.push(searchCond);
      }
      if (data.status) {
        conditions.push(eq(schema.purchases.status, data.status));
      }
      if (data.supplierId && data.supplierId !== "all") {
        conditions.push(eq(schema.purchases.supplierId, data.supplierId));
      }

      const whereClause = and(...conditions);

      const all = await db
        .select()
        .from(schema.purchases)
        .where(whereClause)
        .orderBy(desc(schema.purchases.date))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize);

      const totalCountRes = await db
        .select({ count: sql`count(*)` })
        .from(schema.purchases)
        .where(whereClause);
      const totalCount = Number(totalCountRes[0].count);

      return { success: true, data: all, total: totalCount };
    } catch (e) {
      return handleApiError(e);
    }
  });

const PurchaseItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive(),
  cost: z.number().nonnegative(),
});

const PurchaseSchema = z.object({
  supplierId: z.string().optional().nullable(),
  supplier: z.string(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  status: z.string().optional(),
  paid: z.number().optional().nullable(),
  due: z.number().optional().nullable(),
});

export const createPurchaseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();

      await db.transaction(async (tx) => {
        const rawItems = (data.items || data.lines || []).map((l: any) => ({
          productId: l.productId,
          productName: l.productName || "Product",
          quantity: Number(l.quantity || l.qty || 1),
          cost: Number(l.cost || 0),
        }));

        let itemsCount = 0;
        let subtotal = 0;

        for (const line of rawItems) {
          itemsCount += line.quantity;
          subtotal += line.quantity * line.cost;
        }

        // H-1 fix: Don't apply a hardcoded tax rate. Default to 0 if not provided.
        const taxAmt = data.purchase?.taxAmt !== undefined ? Number(data.purchase.taxAmt) : 0;
        const discountAmt = Number(data.purchase?.discountAmt || 0);
        const total =
          data.purchase?.total !== undefined
            ? Number(data.purchase.total)
            : subtotal + taxAmt - discountAmt;

        const purchaseId = uuidv4();
        const invoiceNo = data.purchase?.invoiceNo || `PO-${Date.now().toString().slice(-6)}`;

        const safePurchase = {
          id: purchaseId,
          organizationId: session.orgId,
          supplierId: data.purchase?.supplierId || null,
          supplier: data.purchase?.supplier || "Unknown Supplier",
          date: data.purchase?.date
            ? new Date(data.purchase.date).toISOString()
            : new Date().toISOString(),
          invoiceNo,
          items: itemsCount,
          status: data.purchase?.status || "received",
          subtotal: subtotal.toFixed(2),
          taxAmt: taxAmt.toFixed(2),
          discountAmt: discountAmt.toFixed(2),
          cgstAmt: "0.00",
          sgstAmt: "0.00",
          igstAmt: "0.00",
          total: total.toFixed(2),
          paid: data.purchase?.paid ? Number(data.purchase.paid).toFixed(2) : total.toFixed(2),
          due: data.purchase?.due ? Number(data.purchase.due).toFixed(2) : "0.00",
          purchaseItems: JSON.stringify(
            rawItems.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              qty: i.quantity,
              cost: i.cost,
              total: i.quantity * i.cost,
            })),
          ) as any,
        };

        await tx.insert(schema.purchases).values(safePurchase as any);

        if (rawItems.length > 0) {
          const movements = rawItems.map((line: any) => ({
            organizationId: session.orgId,
            productName: line.productName,
            action: "purchase",
            quantity: line.quantity,
            createdAt: new Date().toISOString(),
          }));
          
          const pItems = rawItems.map((line: any) => ({
            organizationId: session.orgId,
            purchaseId: purchaseId,
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            cost: line.cost.toFixed(2),
            total: (line.quantity * line.cost).toFixed(2),
          }));

          await tx.insert(schema.inventoryMovements).values(movements);
          await tx.insert(schema.purchaseItems).values(pItems);

          for (const line of rawItems) {
            await tx
              .update(schema.products)
              .set({
                stock: sql`${schema.products.stock} + ${line.quantity}`,
                cost: line.cost.toFixed(2),
              })
              .where(eq(schema.products.id, line.productId));
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updatePurchaseStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .update(schema.purchases)
        .set({ status: data.status as any })
        .where(
          and(
            eq(schema.purchases.id, data.id as any),
            eq(schema.purchases.organizationId, session.orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getPurchaseReturnsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const all = await db
        .select()
        .from(schema.purchaseReturns)
        .where(eq(schema.purchaseReturns.organizationId, session.orgId));
      const allItems = await db
        .select()
        .from(schema.purchaseReturnItems)
        .where(eq(schema.purchaseReturnItems.organizationId, session.orgId));

      const mapped = all.map((r) => ({
        ...r,
        items: allItems
          .filter((i) => i.returnId === r.id)
          .map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            cost: Number(i.cost),
            total: Number(i.total),
          })),
      }));
      return { success: true, data: mapped };
    } catch (e) {
      return handleApiError(e);
    }
  });

const PurchaseReturnSchema = z.object({
  ref: z.string(),
  purchaseId: z.string(),
  supplier: z.string(),
  reason: z.string(),
  status: z.string(),
  date: z.string().optional(),
  stockRestored: z.boolean(),
});

export const createPurchaseReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();

      await db.transaction(async (tx) => {
        let total = 0;
        if (data.items) {
          for (const line of data.items) {
            total += line.quantity * line.cost;
          }
        }

        const returnId = uuidv4();
        await tx.insert(schema.purchaseReturns).values({
          id: returnId,
          organizationId: session.orgId,
          ref: data.purchaseReturn.ref,
          purchaseId: data.purchaseReturn.purchaseId,
          supplier: data.purchaseReturn.supplier,
          reason: data.purchaseReturn.reason,
          total: total.toString(),
          status: data.purchaseReturn.status,
          date: data.purchaseReturn.date
            ? new Date(data.purchaseReturn.date).toISOString()
            : new Date().toISOString(),
          stockRestored: data.purchaseReturn.stockRestored,
        });

        if (data.items && data.items.length > 0) {
          const formattedItems = data.items.map((i: any) => ({
            organizationId: session.orgId,
            returnId: returnId,
            productId: i.productId || "",
            productName: i.productName || "Unknown",
            quantity: i.quantity || 1,
            cost: String(i.cost || 0),
            total: String((i.quantity || 1) * (i.cost || 0)),
          }));
          await tx.insert(schema.purchaseReturnItems).values(formattedItems);
        }

        if (data.items && data.purchaseReturn.stockRestored) {
          const validItems = data.items.filter((line: any) => line.quantity > 0);
          
          if (validItems.length > 0) {
            const movements = validItems.map((line: any) => ({
              organizationId: session.orgId,
              productName: line.productName || "Unknown",
              action: "purchase_return",
              quantity: -line.quantity,
              createdAt: new Date().toISOString(),
            }));
            await tx.insert(schema.inventoryMovements).values(movements);

            for (const line of validItems) {
              await tx
                .update(schema.products)
                .set({
                  stock: sql`GREATEST(0, ${schema.products.stock} - ${line.quantity})`,
                })
                .where(eq(schema.products.id, line.productId));
            }
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deletePurchaseReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      await db
        .delete(schema.purchaseReturns)
        .where(
          and(
            eq(schema.purchaseReturns.id, data.id),
            eq(schema.purchaseReturns.organizationId, session.orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
