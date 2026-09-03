import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { notDeleted } from "@/lib/soft-delete";

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

      conditions.push(notDeleted(schema.purchases.deletedAt));

      const whereClause = and(...conditions);

      const [all, totalCountRes] = await Promise.all([
        db
          .select()
          .from(schema.purchases)
          .where(whereClause)
          .orderBy(desc(schema.purchases.date))
          .limit(data.pageSize)
          .offset((data.page - 1) * data.pageSize),
        db
          .select({ count: sql`count(*)` })
          .from(schema.purchases)
          .where(whereClause),
      ]);

      return { success: true, data: all, total: Number(totalCountRes[0].count) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getPurchaseByIdFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const [found, items] = await Promise.all([
        db
          .select()
          .from(schema.purchases)
          .where(
            and(
              eq(schema.purchases.id, data.id),
              eq(schema.purchases.organizationId, orgId),
              notDeleted(schema.purchases.deletedAt),
            ),
          )
          .limit(1),
        db
          .select()
          .from(schema.purchaseItems)
          .where(
            and(
              eq(schema.purchaseItems.purchaseId, data.id),
              eq(schema.purchaseItems.organizationId, orgId),
            ),
          ),
      ]);

      if (!found.length) {
        return { success: false, error: "Purchase not found", code: 404 };
      }
      return { success: true, data: { ...found[0], items } };
    } catch (e) {
      return handleApiError(e);
    }
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
          locationId: data.purchase?.locationId || null,
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
            rawItems.map((i: any) => ({
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
          const originalLines = data.items || data.lines || [];
          const movements = rawItems.map((line: any, idx: number) => ({
            organizationId: session.orgId,
            productId: line.productId,
            variantId: originalLines[idx]?.variantId || null,
            locationId: originalLines[idx]?.locationId || data.purchase?.locationId || null,
            productName: line.productName,
            action: "purchase",
            quantity: line.quantity.toString(),
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

          for (let i = 0; i < rawItems.length; i++) {
            const line = rawItems[i];
            const originalLine = originalLines[i] || {};
            const locId = originalLine.locationId || data.purchase?.locationId || null;

            await tx
              .update(schema.products)
              .set({
                stock: sql`${schema.products.stock} + ${line.quantity}`,
                cost: line.cost.toFixed(2),
              })
              .where(
                and(
                  eq(schema.products.id, line.productId),
                  eq(schema.products.organizationId, session.orgId),
                ),
              );

            if (locId) {
              await tx
                .insert(schema.productInventory)
                .values({
                  id: uuidv4(),
                  organizationId: session.orgId,
                  productId: line.productId,
                  locationId: locId,
                  stock: line.quantity.toString(),
                })
                .onConflictDoUpdate({
                  target: [schema.productInventory.productId, schema.productInventory.locationId],
                  set: { stock: sql`${schema.productInventory.stock} + ${line.quantity}` },
                });

              if (originalLine.variantId) {
                await tx
                  .insert(schema.variantInventory)
                  .values({
                    id: uuidv4(),
                    organizationId: session.orgId,
                    variantId: originalLine.variantId,
                    locationId: locId,
                    stock: line.quantity.toString(),
                  })
                  .onConflictDoUpdate({
                    target: [schema.variantInventory.variantId, schema.variantInventory.locationId],
                    set: { stock: sql`${schema.variantInventory.stock} + ${line.quantity}` },
                  });
              }
            }
          }

          for (let i = 0; i < rawItems.length; i++) {
            const line = rawItems[i];
            const originalLine = originalLines[i] || {};
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

        if (data.purchase?.supplierId && total > 0) {
          const supp = await tx.query.suppliers.findFirst({
            where: (s, { eq, and }) =>
              and(eq(s.id, data.purchase.supplierId), eq(s.organizationId, session.orgId)),
          });

          if (supp) {
            const currentBalance = Number(supp.balance || 0);
            const paid = Number(data.purchase?.paid || total);
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

            if (paid > 0) {
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) =>
                  and(
                    eq(a.type, data.purchase?.paymentMethod || "cash"),
                    eq(a.organizationId, session.orgId),
                  ),
              });

              if (account) {
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
  .validator(
    z.object({
      id: z.string(),
      status: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.purchases)
        .set({ status: data.status as any })
        .where(
          and(eq(schema.purchases.id, data.id as any), eq(schema.purchases.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updatePurchaseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const purchaseId = data.id || data.purchase?.id;
      const pData = data.purchase || data;

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
        .where(
          and(eq(schema.purchases.id, purchaseId), eq(schema.purchases.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deletePurchaseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.purchases)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.purchases.id, data.id), eq(schema.purchases.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getPurchaseReturnsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const [all, allItems] = await Promise.all([
        db
          .select()
          .from(schema.purchaseReturns)
          .where(
            and(
              eq(schema.purchaseReturns.organizationId, session.orgId),
              notDeleted(schema.purchaseReturns.deletedAt),
            ),
          ),
        db
          .select()
          .from(schema.purchaseReturnItems)
          .where(eq(schema.purchaseReturnItems.organizationId, session.orgId)),
      ]);

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
                  and(
                    eq(schema.products.id, line.productId),
                    eq(schema.products.organizationId, session.orgId),
                  ),
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
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      await db
        .update(schema.purchaseReturns)
        .set({ deletedAt: new Date().toISOString() })
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
