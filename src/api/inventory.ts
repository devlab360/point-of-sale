import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and, sql, desc } from "drizzle-orm";

export const getInventoryMovementsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
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
  .validator(
    z.object({
      movement: z
        .object({
          id: z.string().optional(),
          productId: z.string().optional(),
          productName: z.string().optional(),
          action: z.string(),
          quantity: z.union([z.string(), z.number()]),
        })
        .passthrough(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const m = data.movement;
      const inserted = await db
        .insert(schema.inventoryMovements)
        .values({
          organizationId: orgId,
          productId: m.productId,
          productName: m.productName || "Unknown Product",
          action: m.action,
          quantity: m.quantity.toString(),
        })
        .returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- Inventory Adjustments ---
export const getInventoryAdjustmentsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
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
  .validator(
    z.object({
      adjustment: z
        .object({
          id: z.string(),
          ref: z.string(),
          date: z.string().optional(),
          reason: z.string().optional(),
          items: z.any().optional(),
          net: z.union([z.string(), z.number()]),
          status: z.string().optional(),
        })
        .passthrough(),
      lines: z
        .array(
          z.object({
            productId: z.string(),
            productName: z.string(),
            qty: z.number(),
            type: z.enum(["addition", "deduction"]),
            batchId: z.string().optional(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.transaction(async (tx) => {
         await tx.insert(schema.inventoryAdjustments).values({
          id: data.adjustment.id,
          organizationId: orgId,
          ref: data.adjustment.ref,
          date: new Date(data.adjustment.date || Date.now()).toISOString(),
          reason: data.adjustment.reason || "Manual Adjustment",
          items: Array.isArray(data.lines) ? data.lines.length : 0,
          net: data.adjustment.net.toString(),
          status: data.adjustment.status || "completed",
        });

        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productName: line.productName,
            action: line.type === "addition" ? "adjustment_add" : "adjustment_deduct",
            quantity: (line.type === "addition" ? line.qty : -line.qty).toString(),
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
              .where(
                and(
                  eq(schema.products.id, line.productId),
                  eq(schema.products.organizationId, orgId),
                ),
              );

            if (line.batchId) {
              const batchUpdateSql =
                line.type === "addition"
                  ? sql`${schema.inventoryBatches.quantityRemaining} + ${line.qty}`
                  : sql`GREATEST(0, ${schema.inventoryBatches.quantityRemaining} - ${line.qty})`;
              await tx
                .update(schema.inventoryBatches)
                .set({ quantityRemaining: batchUpdateSql })
                .where(
                  and(
                    eq(schema.inventoryBatches.id, line.batchId),
                    eq(schema.inventoryBatches.organizationId, orgId),
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

export const deleteInventoryAdjustmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
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
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
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
  .validator(
    z.object({
      transfer: z
        .object({
          id: z.string(),
          ref: z.string(),
          date: z.string().optional(),
          destination: z.string().optional(),
          items: z.any().optional(),
          status: z.string().optional(),
          supplierId: z.string().optional(),
          totalAmount: z.number().optional(),
          paidAmount: z.number().optional(),
          paymentMethod: z.string().optional(),
        })
        .passthrough(),
      lines: z
        .array(
          z.object({
            productId: z.string(),
            productName: z.string(),
            qty: z.number(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.inventoryTransfers).values({
          id: data.transfer.id,
          organizationId: orgId,
          ref: data.transfer.ref,
          date: new Date(data.transfer.date || Date.now()).toISOString(),
          destination: data.transfer.destination || "",
          items: Number(data.transfer.items) || (data as any).lines?.length || 0,
          status: data.transfer.status || "completed",
        });

        // Khatabook integration (Supplier Ledger)
        if (data.transfer.supplierId && (data.transfer.totalAmount ?? 0) > 0) {
          const supplierId = data.transfer.supplierId;
          const supp = await tx.query.suppliers.findFirst({
            where: (s, { eq, and }) =>
              and(eq(s.id, supplierId), eq(s.organizationId, orgId)),
          });

          if (supp) {
            const currentBalance = Number(supp.balance || 0);
            // Goods transferred to supplier: we owe them less (balance decreases by totalAmount)
            // Supplier pays us: we owe them more (balance increases by paidAmount)
            const netChange =
              Number(data.transfer.paidAmount || 0) - Number(data.transfer.totalAmount || 0);
            const newBalance = currentBalance + netChange;

            await tx
              .update(schema.suppliers)
              .set({ balance: newBalance.toString() })
              .where(eq(schema.suppliers.id, supp.id));

            const ledgerId = crypto.randomUUID();
            await tx.insert(schema.supplierLedgers).values({
              id: ledgerId,
              organizationId: orgId,
              supplierId: supp.id,
              date: new Date().toISOString(),
              type: "Transfer Out",
              amount: netChange.toString(),
              balanceAfter: newBalance.toString(),
              referenceNo: data.transfer.ref,
              note: `Stock Transfer ${data.transfer.ref} - Total: ${data.transfer.totalAmount}, Paid: ${data.transfer.paidAmount}`,
            });

            // If there's a payment, log it to accounts
            if (Number(data.transfer.paidAmount) > 0) {
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) =>
                  and(
                    eq(a.type, data.transfer.paymentMethod || "cash"),
                    eq(a.organizationId, orgId),
                  ),
              });

              if (account) {
                const accBalance = Number(account.balance || 0) + Number(data.transfer.paidAmount);
                await tx
                  .update(schema.accounts)
                  .set({ balance: accBalance.toString() })
                  .where(eq(schema.accounts.id, account.id));
              }
            }
          }
        }

        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productName: line.productName,
            action: "transfer_out",
            quantity: (-line.qty).toString(),
            createdAt: new Date().toISOString(),
          }));
          await tx.insert(schema.inventoryMovements).values(movements);

          for (const line of data.lines) {
            await tx
              .update(schema.products)
              .set({ stock: sql`GREATEST(0, ${schema.products.stock} - ${line.qty})` })
              .where(
                and(
                  eq(schema.products.id, line.productId),
                  eq(schema.products.organizationId, orgId),
                ),
              );
          }
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteInventoryTransferFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
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

// --- Batches ---
export const getInventoryBatchesFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.inventoryBatches)
        .where(eq(schema.inventoryBatches.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const bulkImportBatchesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      batches: z.array(
        z.object({
          id: z.string().optional(),
          productId: z.string(),
          batchNo: z.string().nullable().optional(),
          expiryDate: z.string().nullable().optional(),
          mfgDate: z.string().nullable().optional(),
          purchaseCost: z.union([z.string(), z.number()]).optional(),
          mrp: z.union([z.string(), z.number()]).nullable().optional(),
          sellingPrice: z.union([z.string(), z.number()]).nullable().optional(),
          quantity: z.union([z.string(), z.number()]),
        }).passthrough(),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      if (!data.batches || !Array.isArray(data.batches)) throw new Error("Invalid batch data");

      const batchesToInsert = data.batches.map((b: any) => ({
        id: b.id || crypto.randomUUID(),
        organizationId: orgId,
        productId: b.productId,
        batchNo: b.batchNo || null,
        expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString() : null,
        mfgDate: b.mfgDate ? new Date(b.mfgDate).toISOString() : null,
        purchaseCost: b.purchaseCost?.toString() || "0",
        mrp: b.mrp?.toString() || null,
        sellingPrice: b.sellingPrice?.toString() || null,
        quantityReceived: b.quantity?.toString() || "0",
        quantityRemaining: b.quantity?.toString() || "0",
        receivedAt: new Date().toISOString(),
      }));

      await db.transaction(async (tx) => {
        if (batchesToInsert.length > 0) {
          await tx.insert(schema.inventoryBatches).values(batchesToInsert);

          // Add to inventory movements and update product stock
          const movements: (typeof schema.inventoryMovements.$inferInsert)[] = [];
          for (const b of data.batches) {
            const product = await tx.query.products.findFirst({
              where: (p, { eq, and }) => and(eq(p.id, b.productId), eq(p.organizationId, orgId)),
            });
            if (product) {
              movements.push({
                organizationId: orgId,
                productId: b.productId,
                productName: product.name,
                action: "batch_import",
                quantity: b.quantity?.toString() || "0",
                createdAt: new Date().toISOString(),
              });

              await tx
                .update(schema.products)
                .set({
                  stock: (Number(product.stock || 0) + Number(b.quantity || 0)).toString(),
                  hasBatch: true,
                })
                .where(eq(schema.products.id, product.id));
            }
          }
          if (movements.length > 0) {
            await tx.insert(schema.inventoryMovements).values(movements);
          }
        }
      });

      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
