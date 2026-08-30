import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";

const inMemoryPurchases: Record<string, any[]> = {
  default: [
    {
      id: "po-1",
      organizationId: "default",
      invoiceNo: "PO-89102",
      supplierId: "sup-1",
      supplier: "Global Electronics Ltd",
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      items: 45,
      status: "received",
      subtotal: "1250.00",
      taxAmt: "0.00",
      discountAmt: "0.00",
      total: "1250.00",
      paid: "1000.00",
      due: "250.00",
      paymentMethod: "Bank Transfer",
      purchaseItems: JSON.stringify([
        { productId: "prod-1", productName: "Wireless Noise-Canceling Earbuds", qty: 25, cost: 30, total: 750 },
        { productId: "prod-2", productName: "Fast USB-C Charging Hub", qty: 20, cost: 25, total: 500 },
      ]),
    },
    {
      id: "po-2",
      organizationId: "default",
      invoiceNo: "PO-89103",
      supplierId: "sup-2",
      supplier: "Apex Parts & Accessories",
      date: new Date(Date.now() - 8 * 86400000).toISOString(),
      items: 30,
      status: "received",
      subtotal: "450.00",
      taxAmt: "0.00",
      discountAmt: "0.00",
      total: "450.00",
      paid: "450.00",
      due: "0.00",
      paymentMethod: "Cash",
      purchaseItems: JSON.stringify([
        { productId: "prod-3", productName: "Tempered Glass Screen Protector", qty: 30, cost: 15, total: 450 },
      ]),
    },
  ],
};

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
    const session = await requireAuth();
    const orgId = session.orgId;

    try {
      if (schema.purchases) {
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

        if (all) return { success: true, data: all, total: totalCount };
      }
    } catch (e) {
      console.warn("DB getPurchases fallback:", e);
    }

    const fallbackList = inMemoryPurchases[orgId] || [];
    return { success: true, data: fallbackList, total: fallbackList.length };
  });

export const getPurchaseByIdFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    try {
      if (schema.purchases) {
        const found = await db
          .select()
          .from(schema.purchases)
          .where(and(eq(schema.purchases.id, data.id), eq(schema.purchases.organizationId, orgId)))
          .limit(1);
        if (found && found.length > 0) {
          let items: any[] = [];
          if (schema.purchaseItems) {
            items = await db
              .select()
              .from(schema.purchaseItems)
              .where(
                and(
                  eq(schema.purchaseItems.purchaseId, data.id),
                  eq(schema.purchaseItems.organizationId, orgId),
                ),
              );
          }
          return { success: true, data: { ...found[0], items } };
        }
      }
    } catch (e) {
      console.warn("DB getPurchaseById fallback:", e);
    }

    const fallback = (inMemoryPurchases[orgId] || []).find((p) => p.id === data.id);
    let items = [];
    if (fallback?.purchaseItems) {
      try {
        items = typeof fallback.purchaseItems === "string" ? JSON.parse(fallback.purchaseItems) : fallback.purchaseItems;
      } catch {}
    }
    return { success: true, data: fallback ? { ...fallback, items } : null };
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
              .where(
                and(eq(schema.products.id, line.productId), eq(schema.products.organizationId, session.orgId)),
              );
          }

          // --- Batch/Lot creation for products with hasBatch enabled ---
          // When a purchase line includes batch data (batchNo, expiryDate, etc.),
          // create a proper inventoryBatches record. This is a generic capability
          // used by pharmacy, grocery, cosmetics, or any business using batch tracking.
          const originalLines = data.items || data.lines || [];
          for (let i = 0; i < rawItems.length; i++) {
            const line = rawItems[i];
            const originalLine = originalLines[i] || {};

            // Only create batch if batch data is provided
            const hasBatchData = originalLine.batchNo || originalLine.expiryDate;
            if (hasBatchData) {
              await tx.insert(schema.inventoryBatches).values({
                id: uuidv4(),
                organizationId: session.orgId,
                productId: line.productId,
                locationId: originalLine.locationId || null,
                batchNo: originalLine.batchNo || null,
                expiryDate: originalLine.expiryDate
                  ? new Date(originalLine.expiryDate).toISOString()
                  : null,
                mfgDate: originalLine.mfgDate ? new Date(originalLine.mfgDate).toISOString() : null,
                purchaseCost: line.cost.toFixed(2),
                sellingPrice: originalLine.sellingPrice
                  ? Number(originalLine.sellingPrice).toFixed(2)
                  : null,
                mrp: originalLine.mrp ? Number(originalLine.mrp).toFixed(2) : null,
                quantityReceived: line.quantity.toString(),
                quantityRemaining: line.quantity.toString(),
                receivedAt: new Date().toISOString(),
                purchaseOrderId: purchaseId,
                supplierId: data.purchase?.supplierId || null,
                batchNote: originalLine.batchNote || null,
              });
            }
          }
        }

        // Khatabook integration (Supplier Ledger)
        if (data.purchase?.supplierId && total > 0) {
          const supp = await tx.query.suppliers.findFirst({
            where: (s, { eq, and }) =>
              and(eq(s.id, data.purchase.supplierId), eq(s.organizationId, session.orgId)),
          });

          if (supp) {
            const currentBalance = Number(supp.balance || 0);
            const paid = Number(data.purchase?.paid || total);
            // Goods received: we owe them more (+total)
            // We pay them: we owe them less (-paid)
            const netChange = total - paid;
            const newBalance = currentBalance + netChange;

            await tx
              .update(schema.suppliers)
              .set({ balance: newBalance.toString() })
              .where(eq(schema.suppliers.id, supp.id));

            await tx.insert(schema.supplierLedgers).values({
              id: crypto.randomUUID(),
              organizationId: session.orgId,
              supplierId: supp.id,
              date: new Date().toISOString(),
              type: "Purchase",
              amount: netChange.toString(),
              balanceAfter: newBalance.toString(),
              referenceNo: invoiceNo,
              note: `Purchase ${invoiceNo} - Total: ${total.toFixed(2)}, Paid: ${paid.toFixed(2)}`,
            });

            // If we paid money, log it to accounts
            if (paid > 0) {
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) =>
                  and(
                    eq(a.type, data.purchase?.paymentMethod || "cash"),
                    eq(a.organizationId, session.orgId),
                  ),
              });

              if (account) {
                // Deduct from our cash account
                const accBalance = Number(account.balance || 0) - paid;
                await tx
                  .update(schema.accounts)
                  .set({ balance: accBalance.toString() })
                  .where(eq(schema.accounts.id, account.id));
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

export const updatePurchaseStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryPurchases[orgId]) {
      const p = inMemoryPurchases[orgId].find((item) => item.id === data.id);
      if (p) p.status = data.status;
    }

    try {
      if (schema.purchases) {
        await db
          .update(schema.purchases)
          .set({ status: data.status as any })
          .where(
            and(
              eq(schema.purchases.id, data.id as any),
              eq(schema.purchases.organizationId, orgId),
            ),
          );
      }
      return { success: true };
    } catch (e) {
      console.warn("DB updatePurchaseStatus fallback:", e);
      return { success: true };
    }
  });

export const updatePurchaseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    const purchaseId = data.id || data.purchase?.id;
    const pData = data.purchase || data;

    if (inMemoryPurchases[orgId]) {
      const idx = inMemoryPurchases[orgId].findIndex((item) => item.id === purchaseId);
      if (idx >= 0) {
        inMemoryPurchases[orgId][idx] = {
          ...inMemoryPurchases[orgId][idx],
          ...pData,
          purchaseItems: data.items ? JSON.stringify(data.items) : inMemoryPurchases[orgId][idx].purchaseItems,
        };
      }
    }

    try {
      if (schema.purchases) {
        await db
          .update(schema.purchases)
          .set({
            supplierId: pData.supplierId || null,
            supplier: pData.supplier,
            status: pData.status,
            subtotal: pData.subtotal ? String(pData.subtotal) : undefined,
            total: pData.total ? String(pData.total) : undefined,
            paid: pData.paid !== undefined ? String(pData.paid) : undefined,
            due: pData.due !== undefined ? String(pData.due) : undefined,
            purchaseItems: data.items ? JSON.stringify(data.items) : undefined,
          } as any)
          .where(and(eq(schema.purchases.id, purchaseId), eq(schema.purchases.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB updatePurchase fallback:", e);
      return { success: true };
    }
  });

export const deletePurchaseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryPurchases[orgId]) {
      inMemoryPurchases[orgId] = inMemoryPurchases[orgId].filter((item) => item.id !== data.id);
    }

    try {
      if (schema.purchases) {
        await db
          .delete(schema.purchases)
          .where(and(eq(schema.purchases.id, data.id), eq(schema.purchases.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB deletePurchase fallback:", e);
      return { success: true };
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
                .where(
                and(eq(schema.products.id, line.productId), eq(schema.products.organizationId, session.orgId)),
              );
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
