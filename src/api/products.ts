import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
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
      const orgId = session.orgId;

      let conditions = [eq(schema.products.organizationId, orgId)];
      if (data.query) {
        const searchCond = or(
          ilike(schema.products.name, `%${data.query}%`),
          ilike(schema.products.sku, `%${data.query}%`),
          ilike(schema.products.barcode, `%${data.query}%`),
        );
        if (searchCond) conditions.push(searchCond);
      }
      if (data.categoryId && data.categoryId !== "all") {
        conditions.push(eq(schema.products.category, data.categoryId));
      }
      if (data.status) {
        conditions.push(eq(schema.products.status, data.status));
      }

      const whereClause = and(...conditions);

      const products = await db
        .select()
        .from(schema.products)
        .where(whereClause)
        .orderBy(desc(schema.products.createdAt))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize);

      const totalCountRes = await db
        .select({ count: sql`count(*)` })
        .from(schema.products)
        .where(whereClause);
      const totalCount = Number(totalCountRes[0].count);

      const summaryRes = await db
        .select({
          totalStock: sql`sum(${schema.products.stock})`,
          totalValue: sql`sum(${schema.products.stock} * ${schema.products.cost})`,
          totalRetailValue: sql`sum(${schema.products.stock} * ${schema.products.price})`,
          lowStockCount: sql`count(CASE WHEN ${schema.products.stock} <= ${schema.products.reorderLevel} THEN 1 END)`
        })
        .from(schema.products)
        .where(whereClause);

      const summary = {
        totalStock: Number(summaryRes[0]?.totalStock || 0),
        totalValue: Number(summaryRes[0]?.totalValue || 0),
        totalRetailValue: Number(summaryRes[0]?.totalRetailValue || 0),
        lowStockCount: Number(summaryRes[0]?.lowStockCount || 0),
      };

      return { success: true, data: products, total: totalCount, summary };
    } catch (e) {
      return handleApiError(e);
    }
  });

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
    type: z.string().nullable().optional(),
    hasVariants: z.boolean().nullable().optional(),
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
      const product = data.product;
      const now = Date.now();
      const productData = {
        ...product,
        id: product.id || uuidv4(),
        organizationId: session.orgId,
        name: product.name,
        sku: product.sku || `SKU-${now}`,
        barcode: product.barcode || `${now}`,
        category: (product as any).category || product.categoryId || "General",
        brand: (product as any).brand || "Generic",
        unit: (product as any).unit || product.unitId || "Pcs",
        cost: product.cost.toString(),
        price: product.price.toString(),
      };
      const inserted = await db
        .insert(schema.products)
        .values(productData as any)
        .returning();

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
      const updateData: Record<string, unknown> = {
        ...updatesObj,
        updatedAt: new Date().toISOString(),
      };
      if (updatesObj.cost !== undefined) updateData.cost = updatesObj.cost.toString();
      if (updatesObj.price !== undefined) updateData.price = updatesObj.price.toString();

      await db
        .update(schema.products)
        .set(updateData as any)
        .where(
          and(eq(schema.products.id, data.id), eq(schema.products.organizationId, session.orgId)),
        );

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
