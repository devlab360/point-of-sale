import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ─── Get bundle components for a product ──────────────────────────────────────
export const getBundleComponentsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ productId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const components = await db
        .select({
          id: schema.productBundles.id,
          bundleProductId: schema.productBundles.bundleProductId,
          componentProductId: schema.productBundles.componentProductId,
          componentVariantId: schema.productBundles.componentVariantId,
          quantity: schema.productBundles.quantity,
          // Join product details
          productName: schema.products.name,
          productSku: schema.products.sku,
          productPrice: schema.products.price,
          productCost: schema.products.cost,
          productImage: schema.products.image,
          productStock: schema.products.stock,
        })
        .from(schema.productBundles)
        .innerJoin(
          schema.products,
          and(
            eq(schema.productBundles.componentProductId, schema.products.id),
            eq(schema.products.organizationId, session.orgId),
          ),
        )
        .where(
          and(
            eq(schema.productBundles.bundleProductId, data.productId),
            eq(schema.productBundles.organizationId, session.orgId),
          ),
        );
      return { success: true, data: components };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Save bundle components (full replace) ────────────────────────────────────
const BundleComponentSchema = z.object({
  componentProductId: z.string(),
  componentVariantId: z.string().optional().nullable(),
  quantity: z.number().positive(),
});

export const saveBundleComponentsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        bundleProductId: z.string(),
        components: z.array(BundleComponentSchema),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      // Delete all existing components for this bundle
      await db
        .delete(schema.productBundles)
        .where(
          and(
            eq(schema.productBundles.bundleProductId, data.bundleProductId),
            eq(schema.productBundles.organizationId, session.orgId),
          ),
        );

      // Insert new components
      if (data.components.length > 0) {
        await db.insert(schema.productBundles).values(
          data.components.map((c) => ({
            id: uuidv4(),
            organizationId: session.orgId,
            bundleProductId: data.bundleProductId,
            componentProductId: c.componentProductId,
            componentVariantId: c.componentVariantId || null,
            quantity: c.quantity.toString(),
          })),
        );
      }

      return { success: true, message: "Bundle components saved successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Receive FIFO inventory batch ─────────────────────────────────────────────
export const receiveInventoryBatchFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        productId: z.string(),
        locationId: z.string().optional().nullable(),
        purchaseCost: z.number().positive(),
        quantity: z.number().positive(),
        purchaseOrderId: z.string().optional().nullable(),
        batchNote: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const batchId = uuidv4();
      await db.insert(schema.inventoryBatches).values({
        id: batchId,
        organizationId: session.orgId,
        productId: data.productId,
        locationId: data.locationId || null,
        purchaseCost: data.purchaseCost.toString(),
        quantityReceived: data.quantity.toString(),
        quantityRemaining: data.quantity.toString(),
        purchaseOrderId: data.purchaseOrderId || null,
        batchNote: data.batchNote || null,
      });
      return { success: true, data: { id: batchId }, message: "Inventory batch received" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Get FIFO batches for a product ───────────────────────────────────────────
export const getInventoryBatchesFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ productId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const batches = await db
        .select()
        .from(schema.inventoryBatches)
        .where(
          and(
            eq(schema.inventoryBatches.productId, data.productId),
            eq(schema.inventoryBatches.organizationId, session.orgId),
          ),
        )
        .orderBy(schema.inventoryBatches.receivedAt); // FIFO order — oldest first
      return { success: true, data: batches };
    } catch (e) {
      return handleApiError(e);
    }
  });
