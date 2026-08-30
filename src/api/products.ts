import { handleApiError } from "@/lib/error-utils";
import { formatErrorResponse } from "@/lib/errors/errors";
import { createServerFn } from "@tanstack/react-start";
import { productService } from "@/services/product.service";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { assertProductLimit } from "@/lib/plan-limits";
import { z } from "zod";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";

export const getProductsFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        categoryId: z.string().optional(),
        status: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { products, totalCount, summary } = await productService.getProducts(
        session.orgId,
        data,
      );

      return { success: true, data: products, total: totalCount, summary };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const getProductByIdFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const product = await productService.getProductById(session.orgId, data.id);
      return { success: true, data: product };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

const VariantInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Variant name is required"),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.union([z.string(), z.number()]),
    cost: z.union([z.string(), z.number()]),
    image: z.string().nullable().optional(),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          value: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();

const ProductInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Product name is required"),
    sku: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    unitId: z.string().nullable().optional(),
    cost: z.union([z.string(), z.number()]),
    price: z.union([z.string(), z.number()]),
    stock: z.number().optional().default(0),
    minStock: z.number().nullable().optional(),
    taxPct: z.string().nullable().optional(),
    gstRate: z.union([z.string(), z.number()]).nullable().optional(),
    taxMasterId: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    hasVariants: z.boolean().nullable().optional(),
    isBundle: z.boolean().nullable().optional(),
    trackFifo: z.boolean().nullable().optional(),
    hasModifiers: z.boolean().nullable().optional(),
    course: z.string().nullable().optional(),
    variants: z.array(VariantInputSchema).optional(),
    locationStocks: z.array(z.object({ locationId: z.string(), stock: z.number() })).optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    images: z.array(z.string()).nullable().optional(),
  })
  .passthrough();

const CreateProductSchema = z.object({
  product: ProductInputSchema,
});

export const createProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateProductSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      if (!orgId) return { success: false, error: "Unauthorized" };

      // Validate SaaS plan limit for products
      await assertProductLimit(orgId);

      const product = data.product;
      const now = Date.now();
      const productId = product.id || uuidv4();

      const productData = {
        ...product,
        id: productId,
        organizationId: session.orgId,
        name: product.name,
        sku: product.sku || `SKU-${now}`,
        barcode: product.barcode || `${now}`,
        category: (product as any).category || product.categoryId || "General",
        brand: (product as any).brand || "Generic",
        unit: (product as any).unit || product.unitId || "Pcs",
        cost: product.cost.toString(),
        price: product.price.toString(),
        hasVariants: Boolean(product.hasVariants),
        isBundle: Boolean(product.isBundle),
        trackFifo: Boolean(product.trackFifo),
        hasModifiers: Boolean(product.hasModifiers),
      };

      const {
        categoryId,
        unitId,
        minStock,
        taxPct,
        type,
        variants,
        locationStocks,
        images,
        ...restProductData
      } = productData;

      const allowedKeys = [
        "id",
        "organizationId",
        "name",
        "sku",
        "barcode",
        "category",
        "brand",
        "unit",
        "price",
        "cost",
        "image",
        "status",
        "expiryDate",
        "wholesalePrice",
        "dealerPrice",
        "minWholesaleQty",
        "stock",
        "reorderLevel",
        "hasVariants",
        "hasSerial",
        "course",
        "serials",
        "hasBatch",
        "batches",
        "locationRack",
        "locationShelf",
        "locationBin",
        "hsnCode",
        "gstRate",
        "taxMasterId",
        "taxInclusive",
        "mrp",
        "metadata",
        "isBundle",
        "trackFifo",
        "hasModifiers",
        "createdAt",
        "updatedAt",
      ];
      const cleanData: Record<string, any> = {};
      for (const k of allowedKeys) {
        if ((restProductData as any)[k] !== undefined) {
          cleanData[k] = (restProductData as any)[k];
        }
      }

      const inserted = await db
        .insert(schema.products)
        .values(cleanData as any)
        .returning();

      if (product.hasVariants && variants && variants.length > 0) {
        for (const variant of variants) {
          const variantId = variant.id || uuidv4();
          await db.insert(schema.productVariants).values({
            id: variantId,
            organizationId: session.orgId,
            productId: productId,
            name: variant.name,
            sku: variant.sku || `${restProductData.sku}-${variant.name}`,
            barcode: variant.barcode || `${now}-${variant.name}`,
            price: variant.price.toString(),
            cost: variant.cost.toString(),
            image: variant.image || null,
          });

          if (variant.attributes && variant.attributes.length > 0) {
            for (const attr of variant.attributes) {
              await db.insert(schema.productVariantAttributes).values({
                id: uuidv4(),
                variantId: variantId,
                name: attr.name,
                value: attr.value,
              });
            }
          }
        }
      }

      // Handle per-location stock seeding
      if (!product.hasVariants) {
        const locationStocksInput = (product as any).locationStocks as
          { locationId: string; stock: number }[] | undefined;
        if (locationStocksInput && locationStocksInput.length > 0) {
          // New UI: explicit per-location stock array
          for (const ls of locationStocksInput) {
            if (ls.stock > 0) {
              await db.insert(schema.productInventory).values({
                id: uuidv4(),
                organizationId: session.orgId,
                productId,
                locationId: ls.locationId,
                stock: ls.stock.toString(),
                reorderLevel: product.minStock ? product.minStock.toString() : "10",
              });
            }
          }
        } else if (product.stock !== undefined && product.stock > 0) {
          // Fallback: single stock, seed to Main Store
          const orgLocations = await db
            .select()
            .from(schema.locations)
            .where(eq(schema.locations.organizationId, session.orgId));
          if (orgLocations.length > 0) {
            const mainLocation =
              orgLocations.find((l) => l.name === "Main Store") || orgLocations[0];
            await db.insert(schema.productInventory).values({
              id: uuidv4(),
              organizationId: session.orgId,
              productId,
              locationId: mainLocation.id,
              stock: product.stock.toString(),
              reorderLevel: product.minStock ? product.minStock.toString() : "10",
            });
          }
        }
      }

      const userName = session.userName || session.userId || "Admin";
      await db.insert(schema.activityLog).values({
        id: uuidv4(),
        organizationId: session.orgId,
        user: userName,
        action: "Product Created",
        details: `Created new product "${product.name}" (Price: ₹${product.price})`,
        timestamp: new Date().toISOString(),
        type: "inventory",
      });

      await db.insert(schema.notifications).values({
        id: uuidv4(),
        organizationId: session.orgId,
        title: "Product Added",
        description: `New product "${product.name}" added to catalog by ${userName}`,
        type: "inventory",
        timestamp: new Date().toISOString(),
        read: false,
      });

      return { success: true, data: inserted[0], message: "Product created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  updates: ProductInputSchema.partial(),
});

export const updateProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateProductSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();

      const updatesObj = data.updates;
      const {
        categoryId,
        unitId,
        minStock,
        taxPct,
        type,
        variants,
        locationStocks,
        images,
        ...restUpdates
      } = updatesObj;

      const allowedKeys = [
        "name",
        "sku",
        "barcode",
        "category",
        "brand",
        "unit",
        "price",
        "cost",
        "image",
        "status",
        "expiryDate",
        "wholesalePrice",
        "dealerPrice",
        "minWholesaleQty",
        "stock",
        "reorderLevel",
        "hasVariants",
        "hasSerial",
        "course",
        "serials",
        "hasBatch",
        "batches",
        "locationRack",
        "locationShelf",
        "locationBin",
        "hsnCode",
        "gstRate",
        "taxMasterId",
        "taxInclusive",
        "mrp",
        "metadata",
        "isBundle",
        "trackFifo",
        "hasModifiers",
        "updatedAt",
      ];
      const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      for (const k of allowedKeys) {
        if ((restUpdates as any)[k] !== undefined) {
          updateData[k] = (restUpdates as any)[k];
        }
      }
      if (updatesObj.cost !== undefined) updateData.cost = updatesObj.cost.toString();
      if (updatesObj.price !== undefined) updateData.price = updatesObj.price.toString();
      if (updatesObj.hasVariants !== undefined)
        updateData.hasVariants = Boolean(updatesObj.hasVariants);
      if (updatesObj.isBundle !== undefined) updateData.isBundle = Boolean(updatesObj.isBundle);
      if (updatesObj.trackFifo !== undefined) updateData.trackFifo = Boolean(updatesObj.trackFifo);
      if (updatesObj.hasModifiers !== undefined)
        updateData.hasModifiers = Boolean(updatesObj.hasModifiers);

      await db
        .update(schema.products)
        .set(updateData as any)
        .where(
          and(eq(schema.products.id, data.id), eq(schema.products.organizationId, session.orgId)),
        );

      if (updatesObj.hasVariants && variants) {
        // This is a naive implementation: delete all existing variants and recreate them
        await db
          .delete(schema.productVariants)
          .where(
            and(
              eq(schema.productVariants.productId, data.id),
              eq(schema.productVariants.organizationId, session.orgId),
            ),
          );
        const now = Date.now();
        for (const variant of variants) {
          const variantId = variant.id || uuidv4();
          await db.insert(schema.productVariants).values({
            id: variantId,
            organizationId: session.orgId,
            productId: data.id,
            name: variant.name,
            sku: variant.sku || `VAR-${now}-${variant.name}`,
            barcode: variant.barcode || `${now}-${variant.name}`,
            price: variant.price.toString(),
            cost: variant.cost.toString(),
            image: variant.image || null,
          });

          if (variant.attributes && variant.attributes.length > 0) {
            for (const attr of variant.attributes) {
              await db.insert(schema.productVariantAttributes).values({
                id: uuidv4(),
                variantId: variantId,
                name: attr.name,
                value: attr.value,
              });
            }
          }
        }
      }

      // Handle legacy single stock update
      if (updatesObj.stock !== undefined && !updatesObj.hasVariants) {
        const locations = await db
          .select()
          .from(schema.locations)
          .where(eq(schema.locations.organizationId, session.orgId));
        if (locations.length > 0) {
          const mainLocation = locations.find((l) => l.name === "Main Store") || locations[0];

          const existingInv = await db
            .select()
            .from(schema.productInventory)
            .where(
              and(
                eq(schema.productInventory.productId, data.id),
                eq(schema.productInventory.locationId, mainLocation.id),
              ),
            );

          if (existingInv.length > 0) {
            await db
              .update(schema.productInventory)
              .set({
                stock: updatesObj.stock.toString(),
                reorderLevel: updatesObj.minStock
                  ? updatesObj.minStock.toString()
                  : existingInv[0].reorderLevel,
              })
              .where(
                and(
                  eq(schema.productInventory.productId, data.id),
                  eq(schema.productInventory.locationId, mainLocation.id),
                ),
              );
          } else {
            await db.insert(schema.productInventory).values({
              id: uuidv4(),
              organizationId: session.orgId,
              productId: data.id,
              locationId: mainLocation.id,
              stock: updatesObj.stock.toString(),
              reorderLevel: updatesObj.minStock ? updatesObj.minStock.toString() : "10",
            });
          }
        }
      }

      const userName = session.userName || session.userId || "Admin";
      await db.insert(schema.activityLog).values({
        id: uuidv4(),
        organizationId: session.orgId,
        user: userName,
        action: "Product Updated",
        details: `Updated product details (ID: ${data.id})`,
        timestamp: new Date().toISOString(),
        type: "inventory",
      });

      return { success: true, message: "Product updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteProductSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      await db
        .delete(schema.products)
        .where(
          and(eq(schema.products.id, data.id), eq(schema.products.organizationId, session.orgId)),
        );

      const userName = session.userName || session.userId || "Admin";
      await db.insert(schema.activityLog).values({
        id: uuidv4(),
        organizationId: session.orgId,
        user: userName,
        action: "Product Deleted",
        details: `Deleted product ID: ${data.id}`,
        timestamp: new Date().toISOString(),
        type: "inventory",
      });

      return { success: true, message: "Product deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getProductVariantsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ productId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const variants = await db
        .select()
        .from(schema.productVariants)
        .where(
          and(
            eq(schema.productVariants.productId, data.productId),
            eq(schema.productVariants.organizationId, session.orgId),
          ),
        );

      const variantsWithAttributes = await Promise.all(
        variants.map(async (v) => {
          const attributes = await db
            .select()
            .from(schema.productVariantAttributes)
            .where(eq(schema.productVariantAttributes.variantId, v.id));
          return { ...v, attributes };
        }),
      );

      return { success: true, data: variantsWithAttributes };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getAllProductVariantsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data || {})
  .handler(async () => {
    try {
      const session = await requireAuth();
      const variants = await db
        .select()
        .from(schema.productVariants)
        .where(eq(schema.productVariants.organizationId, session.orgId));

      if (!variants.length) return { success: true, data: [] };

      const variantIds = variants.map((v) => v.id);
      const attributes = await db
        .select()
        .from(schema.productVariantAttributes)
        .where(inArray(schema.productVariantAttributes.variantId, variantIds));

      const variantsWithAttributes = variants.map((v) => {
        const vAttrs = attributes.filter((a) => a.variantId === v.id);
        return { ...v, attributes: vAttrs };
      });

      return { success: true, data: variantsWithAttributes };
    } catch (e) {
      return handleApiError(e);
    }
  });
