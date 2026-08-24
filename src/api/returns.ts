import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// SALES RETURNS
export const getSalesReturnsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.salesReturns)
        .where(eq(schema.salesReturns.organizationId, orgId));
      const allItems = await db
        .select()
        .from(schema.salesReturnItems)
        .where(eq(schema.salesReturnItems.organizationId, orgId));

      const mapped = all.map((r) => ({
        ...r,
        items: allItems
          .filter((i) => i.returnId === r.id)
          .map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            price: Number(i.price),
            total: Number(i.total),
          })),
      }));
      return { success: true, data: mapped };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createSalesReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const newReturn = {
        id: data.returnData.id || uuidv4(),
        organizationId: orgId,
        ref: data.returnData.ref || `RET-${Date.now()}`,
        saleId: data.returnData.saleId,
        customerName: data.returnData.customerName,
        reason: data.returnData.reason,
        total: data.returnData.total?.toString() || "0",
        status: data.returnData.status || "approved",
        date: new Date(data.returnData.date || Date.now()).toISOString(),
        stockRestored: data.returnData.stockRestored ?? false,
      };

      let returnObj;
      await db.transaction(async (tx) => {
        const inserted = await tx.insert(schema.salesReturns).values(newReturn).returning();
        returnObj = inserted[0];

        const items = data.returnData.items || [];
        if (items.length > 0) {
          const formattedItems = items.map((i: any) => ({
            organizationId: orgId,
            returnId: returnObj.id,
            productId: i.productId || "",
            productName: i.productName || "Unknown",
            quantity: i.quantity || 1,
            price: String(i.price || 0),
            total: String(i.total || 0),
            batchId: i.batchId || null,
          }));
          await tx.insert(schema.salesReturnItems).values(formattedItems);
        }

        // Stock restoration — only if stockRestored=true
        if (newReturn.stockRestored && items.length > 0) {
          for (const item of items) {
            if (!item.productId || !item.quantity) continue;

            await tx
              .update(schema.products)
              .set({ stock: sql`${schema.products.stock} + ${item.quantity}` })
              .where(
                and(
                  eq(schema.products.id, item.productId),
                  eq(schema.products.organizationId, orgId),
                ),
              );

            if (item.batchId) {
              await tx
                .update(schema.inventoryBatches)
                .set({ quantityRemaining: sql`${schema.inventoryBatches.quantityRemaining} + ${item.quantity}` })
                .where(
                  and(
                    eq(schema.inventoryBatches.id, item.batchId),
                    eq(schema.inventoryBatches.organizationId, orgId),
                  ),
                );
            }
          }
        }

        // Mock items back on for the frontend
        (returnObj as any).items = items;

        const userName = session.userName || session.userId || "User";
        await tx.insert(schema.activityLog).values({
          id: uuidv4(),
          organizationId: orgId,
          user: userName,
          action: "Sales Return Processed",
          details: `Return #${newReturn.ref} processed for ${newReturn.customerName} - Refund: ₹${newReturn.total}`,
          timestamp: new Date().toISOString(),
          type: "return",
        });

        await tx.insert(schema.notifications).values({
          id: uuidv4(),
          organizationId: orgId,
          title: "Sales Return Processed",
          description: `Return #${newReturn.ref} of ₹${newReturn.total} approved by ${userName}`,
          type: "return",
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      return { success: true, data: returnObj };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteSalesReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.salesReturns)
        .where(
          and(eq(schema.salesReturns.id, data.id), eq(schema.salesReturns.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

// PURCHASE RETURNS
export const getPurchaseReturnsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.purchaseReturns)
        .where(eq(schema.purchaseReturns.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createPurchaseReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const newReturn = {
        id: data.returnData.id || uuidv4(),
        organizationId: orgId,
        ref: data.returnData.ref || `PRET-${Date.now()}`,
        purchaseId: data.returnData.purchaseId,
        supplier: data.returnData.supplier,
        reason: data.returnData.reason,
        items: (data.returnData.items || []).map((i: any) => ({
           ...i,
           batchId: i.batchId || null
        })),
        total: data.returnData.total?.toString() || "0",
        status: data.returnData.status || "approved",
        date: new Date(data.returnData.date || Date.now()).toISOString(),
        stockRestored: data.returnData.stockRestored ?? false,
      };

      let returnObj;
      await db.transaction(async (tx) => {
        const inserted = await tx.insert(schema.purchaseReturns).values(newReturn).returning();
        returnObj = inserted[0];

        const items = data.returnData.items || [];
        if (items.length > 0) {
          const formattedItems = items.map((i: any) => ({
            organizationId: orgId,
            returnId: returnObj.id,
            productId: i.productId || "",
            productName: i.productName || "Unknown",
            quantity: i.quantity || 1,
            cost: String(i.cost || 0),
            total: String(i.total || 0),
            batchId: i.batchId || null,
          }));
          await tx.insert(schema.purchaseReturnItems).values(formattedItems);
        }

        // Stock restoration — only if stockRestored=true (For purchases, "restoring" means deducting stock since we returned it)
        if (newReturn.stockRestored && items.length > 0) {
          for (const item of items) {
            if (!item.productId || !item.quantity) continue;

            await tx
              .update(schema.products)
              .set({ stock: sql`GREATEST(0, ${schema.products.stock} - ${item.quantity})` })
              .where(
                and(
                  eq(schema.products.id, item.productId),
                  eq(schema.products.organizationId, orgId),
                ),
              );

            if (item.batchId) {
              await tx
                .update(schema.inventoryBatches)
                .set({ quantityRemaining: sql`GREATEST(0, ${schema.inventoryBatches.quantityRemaining} - ${item.quantity})` })
                .where(
                  and(
                    eq(schema.inventoryBatches.id, item.batchId),
                    eq(schema.inventoryBatches.organizationId, orgId),
                  ),
                );
            }
          }
        }
      });
      return { success: true, data: returnObj };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deletePurchaseReturnFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.purchaseReturns)
        .where(
          and(
            eq(schema.purchaseReturns.id, data.id),
            eq(schema.purchaseReturns.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
