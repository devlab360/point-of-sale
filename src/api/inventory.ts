import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and, sql, desc, inArray, ilike, or } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";

export const getInventoryMovementsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const res = await db
        .select()
        .from(schema.inventoryMovements)
        .where(
          and(
            eq(schema.inventoryMovements.organizationId, orgId),
            notDeleted(schema.inventoryMovements.deletedAt),
          ),
        )
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
        .where(
          and(
            eq(schema.inventoryAdjustments.organizationId, orgId),
            notDeleted(schema.inventoryAdjustments.deletedAt),
          ),
        );
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
          productId: z.string().optional(),
          productName: z.string().optional(),
          locationId: z.string().optional(),
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
        const adj = data.adjustment;
        const netNum = Number(adj.net) || 0;

        await tx.insert(schema.inventoryAdjustments).values({
          id: adj.id,
          organizationId: orgId,
          ref: adj.ref,
          date: new Date(adj.date || Date.now()).toISOString(),
          productId: adj.productId || (data.lines?.[0]?.productId ?? null),
          productName: adj.productName || (data.lines?.[0]?.productName ?? null),
          locationId: adj.locationId || null,
          reason: adj.reason || "Manual Adjustment",
          items: Array.isArray(data.lines) && data.lines.length > 0 ? data.lines.length : 1,
          net: netNum.toString(),
          status: adj.status || "completed",
        });

        // 1. Single product adjustment payload (from inventory.adjustments UI)
        if (adj.productId) {
          const isAddition = netNum >= 0;
          const absQty = Math.abs(netNum);

          await tx.insert(schema.inventoryMovements).values({
            organizationId: orgId,
            productId: adj.productId,
            productName: adj.productName || "Adjusted Product",
            action: isAddition ? "adjustment_add" : "adjustment_deduct",
            quantity: (isAddition ? absQty : -absQty).toString(),
            createdAt: new Date().toISOString(),
          });

          const updateSql = isAddition
            ? sql`${schema.products.stock} + ${absQty}`
            : sql`GREATEST(0, ${schema.products.stock} - ${absQty})`;

          await tx
            .update(schema.products)
            .set({ stock: updateSql })
            .where(
              and(
                eq(schema.products.id, adj.productId),
                eq(schema.products.organizationId, orgId),
              ),
            );

          if (adj.locationId) {
            await tx
              .insert(schema.productInventory)
              .values({
                id: uuidv4(),
                organizationId: orgId,
                productId: adj.productId,
                locationId: adj.locationId,
                stock: isAddition ? absQty.toString() : "0",
              })
              .onConflictDoUpdate({
                target: [schema.productInventory.productId, schema.productInventory.locationId],
                set: {
                  stock: isAddition
                    ? sql`${schema.productInventory.stock} + ${absQty}`
                    : sql`GREATEST(0, ${schema.productInventory.stock} - ${absQty})`,
                },
              });
          }
        }

        // 2. Multi-line adjustment payload (if provided)
        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productId: line.productId,
            locationId: adj.locationId || null,
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

            if (adj.locationId) {
              await tx
                .insert(schema.productInventory)
                .values({
                  id: uuidv4(),
                  organizationId: orgId,
                  productId: line.productId,
                  locationId: adj.locationId,
                  stock: line.type === "addition" ? line.qty.toString() : "0",
                })
                .onConflictDoUpdate({
                  target: [schema.productInventory.productId, schema.productInventory.locationId],
                  set: {
                    stock:
                      line.type === "addition"
                        ? sql`${schema.productInventory.stock} + ${line.qty}`
                        : sql`GREATEST(0, ${schema.productInventory.stock} - ${line.qty})`,
                  },
                });
            }

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
        .update(schema.inventoryAdjustments)
        .set({ deletedAt: new Date().toISOString() })
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
        .where(
          and(
            eq(schema.inventoryTransfers.organizationId, orgId),
            notDeleted(schema.inventoryTransfers.deletedAt),
          ),
        );
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
          productId: z.string().optional(),
          productName: z.string().optional(),
          supplierId: z.string().optional(),
          supplierName: z.string().optional(),
          quantity: z.union([z.number(), z.string()]).optional(),
          totalAmount: z.union([z.number(), z.string()]).optional(),
          paidAmount: z.union([z.number(), z.string()]).optional(),
          paymentMethod: z.string().optional(),
          sourceLocationId: z.string().optional(),
          destinationLocationId: z.string().optional(),
          destination: z.string().optional(),
          items: z.any().optional(),
          status: z.string().optional(),
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
        const t = data.transfer;
        const qty = Number(t.quantity) || 1;
        const totalAmt = t.totalAmount != null ? Number(t.totalAmount) : 0;
        const paidAmt = t.paidAmount != null ? Number(t.paidAmount) : 0;

        await tx.insert(schema.inventoryTransfers).values({
          id: t.id,
          organizationId: orgId,
          ref: t.ref,
          date: new Date(t.date || Date.now()).toISOString(),
          productId: t.productId || (data.lines?.[0]?.productId ?? null),
          productName: t.productName || (data.lines?.[0]?.productName ?? null),
          supplierId: t.supplierId || null,
          supplierName: t.supplierName || null,
          quantity: qty,
          totalAmount: totalAmt.toString(),
          paidAmount: paidAmt.toString(),
          paymentMethod: t.paymentMethod || null,
          sourceLocationId: t.sourceLocationId || null,
          destinationLocationId: t.destinationLocationId || null,
          destination: t.destination || t.supplierName || "Direct Transfer",
          items: Number(t.items) || (data as any).lines?.length || 1,
          status: t.status || "completed",
        });

        // 1. Single product transfer out (from UI modal)
        if (t.productId) {
          await tx.insert(schema.inventoryMovements).values({
            organizationId: orgId,
            productId: t.productId,
            productName: t.productName || "Transferred Product",
            action: "transfer_out",
            quantity: (-qty).toString(),
            createdAt: new Date().toISOString(),
          });

          await tx
            .update(schema.products)
            .set({ stock: sql`GREATEST(0, ${schema.products.stock} - ${qty})` })
            .where(
              and(
                eq(schema.products.id, t.productId),
                eq(schema.products.organizationId, orgId),
              ),
            );

          if (t.sourceLocationId) {
            await tx
              .update(schema.productInventory)
              .set({ stock: sql`GREATEST(0, ${schema.productInventory.stock} - ${qty})` })
              .where(
                and(
                  eq(schema.productInventory.productId, t.productId),
                  eq(schema.productInventory.locationId, t.sourceLocationId),
                ),
              );
          }

          if (t.destinationLocationId) {
            await tx
              .insert(schema.productInventory)
              .values({
                id: uuidv4(),
                organizationId: orgId,
                productId: t.productId,
                locationId: t.destinationLocationId,
                stock: qty.toString(),
              })
              .onConflictDoUpdate({
                target: [schema.productInventory.productId, schema.productInventory.locationId],
                set: { stock: sql`${schema.productInventory.stock} + ${qty}` },
              });
          }
        }

        // Supplier balance update if supplierId provided
        if (t.supplierId && totalAmt > 0) {
          const supp = await tx.query.suppliers.findFirst({
            where: (s, { eq, and }) => and(eq(s.id, t.supplierId!), eq(s.organizationId, orgId)),
          });

          if (supp) {
            const currentBalance = Number(supp.balance || 0);
            const netChange = paidAmt - totalAmt;
            const newBalance = currentBalance + netChange;

            await tx
              .update(schema.suppliers)
              .set({ balance: newBalance.toString() })
              .where(eq(schema.suppliers.id, supp.id));

            const ledgerId = uuidv4();
            await tx.insert(schema.supplierLedgers).values({
              id: ledgerId,
              organizationId: orgId,
              supplierId: supp.id,
              date: new Date(t.date || Date.now()).toISOString(),
              type: "debit",
              amount: totalAmt.toString(),
              balanceAfter: newBalance.toString(),
              referenceNo: t.ref,
              note: `Stock Transfer ${t.ref} - Total: ${totalAmt}, Paid: ${paidAmt}`,
            });

            if (paidAmt > 0) {
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) =>
                  and(
                    eq(a.type, t.paymentMethod || "cash"),
                    eq(a.organizationId, orgId),
                  ),
              });

              if (account) {
                const accBalance = Number(account.balance || 0) + paidAmt;
                await tx
                  .update(schema.accounts)
                  .set({ balance: accBalance.toString() })
                  .where(eq(schema.accounts.id, account.id));
              }
            }
          }
        }

        // 2. Multi-line transfers if provided
        if (data.lines && data.lines.length > 0) {
          const movements = data.lines.map((line: any) => ({
            organizationId: orgId,
            productId: line.productId,
            locationId: t.sourceLocationId || null,
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

            if (t.sourceLocationId) {
              await tx
                .update(schema.productInventory)
                .set({ stock: sql`GREATEST(0, ${schema.productInventory.stock} - ${line.qty})` })
                .where(
                  and(
                    eq(schema.productInventory.productId, line.productId),
                    eq(schema.productInventory.locationId, t.sourceLocationId),
                    eq(schema.productInventory.organizationId, orgId),
                  ),
                );
            }

            if (t.destinationLocationId) {
              await tx
                .insert(schema.productInventory)
                .values({
                  id: uuidv4(),
                  organizationId: orgId,
                  productId: line.productId,
                  locationId: t.destinationLocationId,
                  stock: line.qty.toString(),
                })
                .onConflictDoUpdate({
                  target: [schema.productInventory.productId, schema.productInventory.locationId],
                  set: { stock: sql`${schema.productInventory.stock} + ${line.qty}` },
                });
            }
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
        .update(schema.inventoryTransfers)
        .set({ deletedAt: new Date().toISOString() })
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
        .where(
          and(
            eq(schema.inventoryBatches.organizationId, orgId),
            notDeleted(schema.inventoryBatches.deletedAt),
          ),
        );
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const bulkImportBatchesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      batches: z.array(
        z
          .object({
            id: z.string().optional(),
            productId: z.string(),
            batchNo: z.string().nullable().optional(),
            expiryDate: z.string().nullable().optional(),
            mfgDate: z.string().nullable().optional(),
            purchaseCost: z.union([z.string(), z.number()]).optional(),
            mrp: z.union([z.string(), z.number()]).nullable().optional(),
            sellingPrice: z.union([z.string(), z.number()]).nullable().optional(),
            quantity: z.union([z.string(), z.number()]),
          })
          .passthrough(),
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

// ── MULTI-BRANCH STOCK MATRIX SERVER FUNCTIONS ────────────────────────

export const getMultiBranchStockMatrixFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        categoryId: z.string().optional(),
        query: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      // 1. Fetch all locations for org
      const locations = await db
        .select({
          id: schema.locations.id,
          name: schema.locations.name,
          type: schema.locations.type,
          city: schema.locations.city,
          isHeadOffice: schema.locations.isHeadOffice,
        })
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.organizationId, orgId),
            notDeleted(schema.locations.deletedAt),
          ),
        )
        .orderBy(desc(schema.locations.isHeadOffice), schema.locations.name);

      // 2. Fetch products
      let prodConds = [
        eq(schema.products.organizationId, orgId),
        notDeleted(schema.products.deletedAt),
      ];
      if (data.categoryId && data.categoryId !== "all") {
        prodConds.push(eq(schema.products.category, data.categoryId));
      }
      if (data.query) {
        prodConds.push(
          or(
            ilike(schema.products.name, `%${data.query}%`),
            ilike(schema.products.sku, `%${data.query}%`),
            ilike(schema.products.barcode, `%${data.query}%`),
          )!,
        );
      }

      const products = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          sku: schema.products.sku,
          barcode: schema.products.barcode,
          category: schema.products.category,
          price: schema.products.price,
          cost: schema.products.cost,
          stock: schema.products.stock,
          hasVariants: schema.products.hasVariants,
          unit: schema.products.unit,
        })
        .from(schema.products)
        .where(and(...prodConds))
        .orderBy(desc(schema.products.createdAt))
        .limit(200);

      if (products.length === 0) {
        return { success: true as const, locations, rows: [] };
      }

      const prodIds = products.map((p) => p.id);

      // 3. Fetch variants
      const variants = await db
        .select({
          id: schema.productVariants.id,
          productId: schema.productVariants.productId,
          name: schema.productVariants.name,
          sku: schema.productVariants.sku,
          barcode: schema.productVariants.barcode,
          price: schema.productVariants.price,
          cost: schema.productVariants.cost,
        })
        .from(schema.productVariants)
        .where(
          and(
            inArray(schema.productVariants.productId, prodIds),
            eq(schema.productVariants.organizationId, orgId),
            notDeleted(schema.productVariants.deletedAt),
          ),
        );

      // 4. Fetch branch product inventory
      const prodInv = await db
        .select({
          productId: schema.productInventory.productId,
          locationId: schema.productInventory.locationId,
          stock: schema.productInventory.stock,
          reorderLevel: schema.productInventory.reorderLevel,
        })
        .from(schema.productInventory)
        .where(
          and(
            inArray(schema.productInventory.productId, prodIds),
            eq(schema.productInventory.organizationId, orgId),
            notDeleted(schema.productInventory.deletedAt),
          ),
        );

      // 5. Fetch branch variant inventory
      const varIds = variants.map((v) => v.id);
      let varInv: (typeof schema.variantInventory.$inferSelect)[] = [];
      if (varIds.length > 0) {
        varInv = await db
          .select()
          .from(schema.variantInventory)
          .where(
            and(
              inArray(schema.variantInventory.variantId, varIds),
              eq(schema.variantInventory.organizationId, orgId),
              notDeleted(schema.variantInventory.deletedAt),
            ),
          );
      }

      // Index inventory maps
      const prodStockMap = new Map<string, { stock: number; reorderLevel: number }>();
      prodInv.forEach((pi) => {
        prodStockMap.set(`${pi.productId}:${pi.locationId}`, {
          stock: Number(pi.stock || 0),
          reorderLevel: Number(pi.reorderLevel || 0),
        });
      });

      const varStockMap = new Map<string, { stock: number; reorderLevel: number }>();
      varInv.forEach((vi) => {
        varStockMap.set(`${vi.variantId}:${vi.locationId}`, {
          stock: Number(vi.stock || 0),
          reorderLevel: Number(vi.reorderLevel || 0),
        });
      });

      // Construct matrix rows
      const rows: any[] = [];
      products.forEach((p) => {
        const pVariants = variants.filter((v) => v.productId === p.id);

        if (pVariants.length > 0) {
          pVariants.forEach((v) => {
            const branchStocks: Record<string, { stock: number; reorderLevel: number }> = {};
            let totalBranchStock = 0;

            locations.forEach((loc) => {
              const entry = varStockMap.get(`${v.id}:${loc.id}`) || { stock: 0, reorderLevel: 5 };
              branchStocks[loc.id] = entry;
              totalBranchStock += entry.stock;
            });

            rows.push({
              key: `${p.id}:${v.id}`,
              productId: p.id,
              variantId: v.id,
              productName: p.name,
              variantName: v.name,
              sku: v.sku || p.sku,
              barcode: v.barcode || p.barcode,
              category: p.category,
              unit: p.unit,
              totalStock: totalBranchStock,
              branchStocks,
            });
          });
        } else {
          const branchStocks: Record<string, { stock: number; reorderLevel: number }> = {};
          let totalBranchStock = 0;

          locations.forEach((loc) => {
            const entry = prodStockMap.get(`${p.id}:${loc.id}`) || {
              stock: locations.length === 1 ? Number(p.stock || 0) : 0,
              reorderLevel: 5,
            };
            branchStocks[loc.id] = entry;
            totalBranchStock += entry.stock;
          });

          rows.push({
            key: `${p.id}:base`,
            productId: p.id,
            variantId: null,
            productName: p.name,
            variantName: null,
            sku: p.sku,
            barcode: p.barcode,
            category: p.category,
            unit: p.unit,
            totalStock: totalBranchStock,
            branchStocks,
          });
        }
      });

      return {
        success: true as const,
        locations,
        rows,
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateMultiBranchStockMatrixFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      updates: z.array(
        z.object({
          productId: z.string(),
          variantId: z.string().nullable().optional(),
          locationId: z.string(),
          newStock: z.number().nonnegative(),
          reorderLevel: z.number().nonnegative().optional(),
          reason: z.string().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db.transaction(async (tx) => {
        const touchedProductIds = new Set<string>();

        for (const u of data.updates) {
          touchedProductIds.add(u.productId);

          // 1. If variant, update variantInventory
          if (u.variantId) {
            const existingVar = await tx
              .select({ stock: schema.variantInventory.stock })
              .from(schema.variantInventory)
              .where(
                and(
                  eq(schema.variantInventory.variantId, u.variantId),
                  eq(schema.variantInventory.locationId, u.locationId),
                  eq(schema.variantInventory.organizationId, orgId),
                ),
              )
              .limit(1);

            const oldStock = existingVar[0] ? Number(existingVar[0].stock || 0) : 0;
            const diff = u.newStock - oldStock;

            // Fetch product name for movement audit
            const prodRow = await tx
              .select({ name: schema.products.name })
              .from(schema.products)
              .where(eq(schema.products.id, u.productId))
              .limit(1);
            const pName = prodRow[0]?.name || "Product";

            await tx
              .insert(schema.variantInventory)
              .values({
                id: uuidv4(),
                organizationId: orgId,
                variantId: u.variantId,
                locationId: u.locationId,
                stock: u.newStock.toString(),
                reorderLevel: (u.reorderLevel !== undefined ? u.reorderLevel : 5).toString(),
              })
              .onConflictDoUpdate({
                target: [
                  schema.variantInventory.variantId,
                  schema.variantInventory.locationId,
                ],
                set: {
                  stock: u.newStock.toString(),
                  ...(u.reorderLevel !== undefined
                    ? { reorderLevel: u.reorderLevel.toString() }
                    : {}),
                  updatedAt: new Date().toISOString(),
                },
              });

            // Double-entry movement
            if (diff !== 0) {
              await tx.insert(schema.inventoryMovements).values({
                organizationId: orgId,
                locationId: u.locationId,
                productId: u.productId,
                variantId: u.variantId,
                productName: pName,
                action: diff > 0 ? "stock_matrix_in" : "stock_matrix_out",
                quantity: Math.abs(diff).toString(),
              });
            }
          }

          // 2. Update productInventory for the product at this location
          const existingProd = await tx
            .select({ stock: schema.productInventory.stock })
            .from(schema.productInventory)
            .where(
              and(
                eq(schema.productInventory.productId, u.productId),
                eq(schema.productInventory.locationId, u.locationId),
                eq(schema.productInventory.organizationId, orgId),
              ),
            )
            .limit(1);

          const oldProdStock = existingProd[0] ? Number(existingProd[0].stock || 0) : 0;
          const diffProd = u.newStock - oldProdStock;

          const prodRow = await tx
            .select({ name: schema.products.name })
            .from(schema.products)
            .where(eq(schema.products.id, u.productId))
            .limit(1);
          const pName = prodRow[0]?.name || "Product";

          await tx
            .insert(schema.productInventory)
            .values({
              id: uuidv4(),
              organizationId: orgId,
              productId: u.productId,
              locationId: u.locationId,
              stock: u.newStock.toString(),
              reorderLevel: (u.reorderLevel !== undefined ? u.reorderLevel : 5).toString(),
            })
            .onConflictDoUpdate({
              target: [
                schema.productInventory.productId,
                schema.productInventory.locationId,
              ],
              set: {
                stock: u.newStock.toString(),
                ...(u.reorderLevel !== undefined
                  ? { reorderLevel: u.reorderLevel.toString() }
                  : {}),
                updatedAt: new Date().toISOString(),
              },
            });

          if (!u.variantId && diffProd !== 0) {
            await tx.insert(schema.inventoryMovements).values({
              organizationId: orgId,
              locationId: u.locationId,
              productId: u.productId,
              productName: pName,
              action: diffProd > 0 ? "stock_matrix_in" : "stock_matrix_out",
              quantity: Math.abs(diffProd).toString(),
            });
          }
        }

        // 3. Recalculate aggregate stock for all touched products
        for (const prodId of touchedProductIds) {
          const allBranchStock = await tx
            .select({ stock: schema.productInventory.stock })
            .from(schema.productInventory)
            .where(
              and(
                eq(schema.productInventory.productId, prodId),
                eq(schema.productInventory.organizationId, orgId),
                notDeleted(schema.productInventory.deletedAt),
              ),
            );

          const totalAggregate = allBranchStock.reduce(
            (sum, row) => sum + Number(row.stock || 0),
            0,
          );

          await tx
            .update(schema.products)
            .set({
              stock: totalAggregate.toString(),
              updatedAt: new Date().toISOString(),
            })
            .where(and(eq(schema.products.id, prodId), eq(schema.products.organizationId, orgId)));
        }
      });

      return {
        success: true as const,
        count: data.updates.length,
        message: `Successfully updated stock across ${data.updates.length} branch points`,
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const bulkImportStockMatrixFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rows: z.array(
        z.object({
          sku: z.string(),
          branchStocks: z.array(
            z.object({
              locationId: z.string(),
              stock: z.number().nonnegative(),
            }),
          ),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      if (data.rows.length === 0) {
        return { success: true as const, count: 0, message: "No data provided" };
      }

      const skus = data.rows.map((r) => r.sku.trim());

      // Fetch products by SKU
      const prods = await db
        .select({
          id: schema.products.id,
          sku: schema.products.sku,
        })
        .from(schema.products)
        .where(
          and(
            inArray(schema.products.sku, skus),
            eq(schema.products.organizationId, orgId),
            notDeleted(schema.products.deletedAt),
          ),
        );

      const prodMap = new Map<string, string>();
      prods.forEach((p) => prodMap.set(p.sku.toLowerCase(), p.id));

      const updates: {
        productId: string;
        locationId: string;
        newStock: number;
        reason?: string;
      }[] = [];

      data.rows.forEach((row) => {
        const prodId = prodMap.get(row.sku.trim().toLowerCase());
        if (prodId) {
          row.branchStocks.forEach((bs) => {
            updates.push({
              productId: prodId,
              locationId: bs.locationId,
              newStock: bs.stock,
              reason: "CSV Master Stock Matrix Import",
            });
          });
        }
      });

      if (updates.length === 0) {
        return {
          success: false as const,
          error: "No matching product SKUs found in organization catalog",
        };
      }

      // Execute via matrix update logic
      return await updateMultiBranchStockMatrixFn({ data: { updates } });
    } catch (e) {
      return handleApiError(e);
    }
  });

