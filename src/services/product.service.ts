import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/lib/errors/errors";

export interface ProductQueryFilters {
  page?: number;
  pageSize?: number;
  query?: string;
  categoryId?: string;
  status?: string;
}

export interface CreateProductInput {
  id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  cost: string | number;
  price: string | number;
  stock?: number;
  minStock?: number | null;
  hasVariants?: boolean | null;
  isBundle?: boolean | null;
  trackFifo?: boolean | null;
  hasModifiers?: boolean | null;
  variants?: any[];
  locationStocks?: { locationId: string; stock: number }[];
  description?: string | null;
  status?: string | null;
  images?: string[] | null;
  category?: string;
  brand?: string;
  unit?: string;
}

const ALLOWED_PRODUCT_COLUMNS = [
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
  "taxInclusive",
  "mrp",
  "metadata",
  "isBundle",
  "trackFifo",
  "hasModifiers",
  "createdAt",
  "updatedAt",
];

export class ProductService {
  async getProducts(orgId: string, filters: ProductQueryFilters) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;

    let conditions = [eq(schema.products.organizationId, orgId)];

    if (filters.query) {
      const searchCond = or(
        ilike(schema.products.name, `%${filters.query}%`),
        ilike(schema.products.sku, `%${filters.query}%`),
        ilike(schema.products.barcode, `%${filters.query}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    if (filters.categoryId && filters.categoryId !== "all") {
      conditions.push(eq(schema.products.category, filters.categoryId));
    }

    if (filters.status) {
      conditions.push(eq(schema.products.status, filters.status));
    }

    const whereClause = and(...conditions);

    // Parallelize DB queries for products, count, and summary
    const [products, totalCountRes, summaryRes] = await Promise.all([
      db
        .select()
        .from(schema.products)
        .where(whereClause)
        .orderBy(desc(schema.products.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql`count(*)` })
        .from(schema.products)
        .where(whereClause),
      db
        .select({
          totalStock: sql`sum(COALESCE(${schema.productInventory.stock}, 0))`,
          totalValue: sql`sum(COALESCE(${schema.productInventory.stock}, 0) * COALESCE(${schema.products.cost}, 0))`,
          totalRetailValue: sql`sum(COALESCE(${schema.productInventory.stock}, 0) * COALESCE(${schema.products.price}, 0))`,
          lowStockCount: sql`count(CASE WHEN COALESCE(${schema.productInventory.stock}, 0) <= COALESCE(${schema.productInventory.reorderLevel}, 0) THEN 1 END)`,
        })
        .from(schema.products)
        .leftJoin(
          schema.productInventory,
          eq(schema.products.id, schema.productInventory.productId),
        )
        .where(whereClause),
    ]);

    const totalCount = Number(totalCountRes[0]?.count || 0);

    const summary = {
      totalStock: Number(summaryRes[0]?.totalStock || 0),
      totalValue: Number(summaryRes[0]?.totalValue || 0),
      totalRetailValue: Number(summaryRes[0]?.totalRetailValue || 0),
      lowStockCount: Number(summaryRes[0]?.lowStockCount || 0),
    };

    // Clean numeric fields — PostgreSQL numeric(10,3) returns strings like "9.000"
    // parseFloat strips trailing zeros: "9.000" → 9, "2.500" → 2.5
    const cleanProducts = products.map((p) => ({
      ...p,
      stock: parseFloat(String(p.stock)) || 0,
      reorderLevel: parseFloat(String(p.reorderLevel)) || 0,
      price: parseFloat(String(p.price)) || 0,
      cost: parseFloat(String(p.cost)) || 0,
      wholesalePrice: p.wholesalePrice ? parseFloat(String(p.wholesalePrice)) : null,
      dealerPrice: p.dealerPrice ? parseFloat(String(p.dealerPrice)) : null,
      mrp: p.mrp ? parseFloat(String(p.mrp)) : null,
      gstRate: p.gstRate ? parseFloat(String(p.gstRate)) : null,
    }));

    return { products: cleanProducts, totalCount, summary };
  }

  async createProduct(orgId: string, input: CreateProductInput) {
    const now = Date.now();
    const productId = input.id || uuidv4();

    const productData: Record<string, any> = {
      ...input,
      id: productId,
      organizationId: orgId,
      name: input.name,
      sku: input.sku || `SKU-${now}`,
      barcode: input.barcode || `${now}`,
      category: input.category || input.categoryId || "General",
      brand: input.brand || "Generic",
      unit: input.unit || input.unitId || "Pcs",
      cost: input.cost.toString(),
      price: input.price.toString(),
      hasVariants: Boolean(input.hasVariants),
      isBundle: Boolean(input.isBundle),
      trackFifo: Boolean(input.trackFifo),
      hasModifiers: Boolean(input.hasModifiers),
    };

    // Sanitize non-schema properties
    const cleanData: Record<string, any> = {};
    for (const key of ALLOWED_PRODUCT_COLUMNS) {
      if (productData[key] !== undefined) {
        cleanData[key] = productData[key];
      }
    }

    const inserted = await db
      .insert(schema.products)
      .values(cleanData as any)
      .returning();

    // Create variants if defined
    if (input.hasVariants && input.variants && input.variants.length > 0) {
      for (const variant of input.variants) {
        const variantId = variant.id || uuidv4();
        await db.insert(schema.productVariants).values({
          id: variantId,
          organizationId: orgId,
          productId,
          name: variant.name,
          sku: variant.sku || `${cleanData.sku}-${variant.name}`,
          barcode: variant.barcode || `${now}-${variant.name}`,
          price: variant.price.toString(),
          cost: variant.cost.toString(),
          image: variant.image || null,
        });

        if (variant.attributes && variant.attributes.length > 0) {
          for (const attr of variant.attributes) {
            await db.insert(schema.productVariantAttributes).values({
              id: uuidv4(),
              variantId,
              name: attr.name,
              value: attr.value,
            });
          }
        }
      }
    }

    return inserted[0];
  }

  async getAllProductVariants(orgId: string) {
    const variants = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.organizationId, orgId));

    if (!variants.length) return [];

    const variantIds = variants.map((v) => v.id);
    const attributes = await db
      .select()
      .from(schema.productVariantAttributes)
      .where(inArray(schema.productVariantAttributes.variantId, variantIds));

    return variants.map((v) => {
      const vAttrs = attributes.filter((a) => a.variantId === v.id);
      return { ...v, attributes: vAttrs };
    });
  }

  async deleteProduct(orgId: string, productId: string) {
    const existing = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }

    await db
      .delete(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.organizationId, orgId)));
  }

  async getProductById(orgId: string, productId: string) {
    const existing = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }

    const product = existing[0];

    const variants = await db
      .select()
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productId, productId),
          eq(schema.productVariants.organizationId, orgId),
        ),
      );

    const bundleComponents = await db
      .select()
      .from(schema.productBundles)
      .where(eq(schema.productBundles.bundleProductId, productId));

    const modifiers = await db
      .select()
      .from(schema.productModifiers)
      .where(eq(schema.productModifiers.productId, productId));

    return {
      ...product,
      stock: parseFloat(String(product.stock)) || 0,
      reorderLevel: parseFloat(String(product.reorderLevel)) || 0,
      price: parseFloat(String(product.price)) || 0,
      cost: parseFloat(String(product.cost)) || 0,
      wholesalePrice: product.wholesalePrice ? parseFloat(String(product.wholesalePrice)) : null,
      dealerPrice: product.dealerPrice ? parseFloat(String(product.dealerPrice)) : null,
      mrp: product.mrp ? parseFloat(String(product.mrp)) : null,
      gstRate: product.gstRate ? parseFloat(String(product.gstRate)) : null,
      variants,
      bundleComponents,
      modifiers,
    };
  }
}

export const productService = new ProductService();
