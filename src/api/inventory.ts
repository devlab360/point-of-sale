import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and, sql, desc } from "drizzle-orm";

export const getInventoryMovementsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const res = await db
        .select()
        .from(schema.inventoryMovements)
        .where(eq(schema.inventoryMovements.organizationId, orgId))
        .orderBy(desc(schema.inventoryMovements.createdAt));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createInventoryMovementFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const { id, ...movementWithoutId } = data.movement || {};
      const inserted = await db
        .insert(schema.inventoryMovements)
        .values({
          ...movementWithoutId,
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- Inventory Adjustments ---
export const getInventoryAdjustmentsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const res = await db
        .select()
        .from(schema.inventoryAdjustments)
        .where(eq(schema.inventoryAdjustments.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createInventoryAdjustmentFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.inventoryAdjustments).values({
          id: data.adjustment.id,
          organizationId: orgId,
          ref: data.adjustment.ref,
          date: new Date(
            data.adjustment
              ? data.adjustment.date
              : data.transfer
                ? data.transfer.date
                : Date.now(),
          ).toISOString(),
          reason: data.adjustment.reason,
          items: data.adjustment.items,
          net: data.adjustment.net.toString(),
          status: data.adjustment.status,
        });

        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productName: line.productName,
            action: line.type === "addition" ? "adjustment_add" : "adjustment_deduct",
            quantity: line.type === "addition" ? line.qty : -line.qty,
            createdAt: new Date().toISOString(),
          }));
          await tx.insert(schema.inventoryMovements).values(movements);

          for (const line of data.lines) {
            const updateSql =
              line.type === "addition"
                ? sql`${schema.products.stock} + ${line.qty}`
                : sql`GREATEST(0, ${schema.products.stock} - ${line.qty})`;
            await tx
              .update(schema.products)
              .set({ stock: updateSql })
              .where(eq(schema.products.id, line.productId));
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteInventoryAdjustmentFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.inventoryAdjustments)
        .where(
          and(
            eq(schema.inventoryAdjustments.id, data.id),
            eq(schema.inventoryAdjustments.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- Inventory Transfers ---
export const getInventoryTransfersFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const res = await db
        .select()
        .from(schema.inventoryTransfers)
        .where(eq(schema.inventoryTransfers.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createInventoryTransferFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.inventoryTransfers).values({
          id: data.transfer.id,
          organizationId: orgId,
          ref: data.transfer.ref,
          date: new Date(
            data.adjustment
              ? data.adjustment.date
              : data.transfer
                ? data.transfer.date
                : Date.now(),
          ).toISOString(),
          destination: data.transfer.destination,
          items: data.transfer.items,
          status: data.transfer.status,
        });

        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productName: line.productName,
            action: "transfer_out",
            quantity: -line.qty,
            createdAt: new Date().toISOString(),
          }));
          await tx.insert(schema.inventoryMovements).values(movements);

          for (const line of data.lines) {
            await tx
              .update(schema.products)
              .set({ stock: sql`GREATEST(0, ${schema.products.stock} - ${line.qty})` })
              .where(eq(schema.products.id, line.productId));
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteInventoryTransferFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.inventoryTransfers)
        .where(
          and(
            eq(schema.inventoryTransfers.id, data.id),
            eq(schema.inventoryTransfers.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
