import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/lib/errors/errors";

export interface StockAdjustmentInput {
  productId: string;
  productName: string;
  type: "addition" | "subtraction" | "set";
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface InventoryQueryFilters {
  page?: number;
  pageSize?: number;
  query?: string;
  category?: string;
}

export class InventoryService {
  async getInventory(orgId: string, filters: InventoryQueryFilters) {
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
    if (filters.category) {
      conditions.push(eq(schema.products.category, filters.category));
    }

    const whereClause = and(...conditions);

    const productsList = await db
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(desc(schema.products.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalCountRes = await db
      .select({ count: sql`count(*)` })
      .from(schema.products)
      .where(whereClause);

    const totalCount = Number(totalCountRes[0]?.count || 0);

    return { products: productsList, totalCount };
  }

  async adjustStock(orgId: string, userId: string, input: StockAdjustmentInput) {
    const existing = await db
      .select()
      .from(schema.products)
      .where(
        and(eq(schema.products.id, input.productId), eq(schema.products.organizationId, orgId)),
      )
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Product with ID ${input.productId} not found`);
    }

    const product = existing[0];
    const currentStock = Number(product.stock || 0);
    let newStock = currentStock;

    if (input.type === "addition") {
      newStock = currentStock + input.quantity;
    } else if (input.type === "subtraction") {
      newStock = Math.max(0, currentStock - input.quantity);
    } else if (input.type === "set") {
      newStock = Math.max(0, input.quantity);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.products)
        .set({ stock: newStock.toString(), updatedAt: new Date().toISOString() })
        .where(eq(schema.products.id, input.productId));

      await tx.insert(schema.inventoryMovements).values({
        organizationId: orgId,
        productId: input.productId,
        productName: input.productName || product.name,
        action: `ADJUSTMENT_${input.type.toUpperCase()}`,
        quantity: input.quantity.toString(),
      });
    });

    return { productId: input.productId, previousStock: currentStock, newStock };
  }

  async getMovements(orgId: string, productId?: string) {
    let conditions = [eq(schema.inventoryMovements.organizationId, orgId)];
    if (productId) {
      conditions.push(eq(schema.inventoryMovements.productId, productId));
    }

    return await db
      .select()
      .from(schema.inventoryMovements)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryMovements.createdAt))
      .limit(100);
  }
}

export const inventoryService = new InventoryService();
