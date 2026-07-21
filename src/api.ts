import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { products, customers, sales, saleItems, categories, brands, units, suppliers, purchases, inventoryMovements, settings } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import type { OfflineSale } from "./lib/db";

// Fetch all products from PostgreSQL
export const getProductsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const allProducts = await db.select().from(products);
      return allProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // Return empty array on failure (so offline mode can fallback to Dexie)
      return []; 
    }
  });

// Fetch all customers from PostgreSQL
export const getCustomersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const allCustomers = await db.select().from(customers);
      return allCustomers;
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      return [];
    }
  });

// Sync offline sales to PostgreSQL
export const syncSalesFn = createServerFn({ method: "POST" })
  .validator((data: { sales: OfflineSale[] }) => data)
  .handler(async ({ data }) => {
    const { sales: offlineSales } = data;
    
    if (!offlineSales.length) return { success: true, syncedIds: [] };

    const syncedIds: string[] = [];

    try {
      // We should ideally use a transaction here, but for simplicity we iterate
      for (const sale of offlineSales) {
        // Insert sale
        await db.insert(sales).values({
          id: sale.id,
          customerId: sale.customerId || null,
          customerName: sale.customerName || null,
          date: new Date(sale.date),
          items: sale.items,
          paymentMethod: sale.paymentMethod,
          status: "completed",
          total: sale.total.toString(),
        }).onConflictDoNothing(); // Prevent duplicate syncs

        // Insert sale items
        for (const item of sale.saleItems) {
          await db.insert(saleItems).values({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.toString(),
            total: item.total.toString(),
          });
          
          // Optionally: Update inventory in PostgreSQL
          // await db.update(products).set({ stock: sql`stock - ${item.quantity}` }).where(eq(products.id, item.productId));
        }

        syncedIds.push(sale.id);
      }
      
      return { success: true, syncedIds };
    } catch (error) {
      console.error("Failed to sync sales:", error);
      // Return the ones that successfully synced before the error
      return { success: false, syncedIds, error: String(error) };
    }
  });

export const getCategoriesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(categories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  });

export const getBrandsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(brands);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      return [];
    }
  });

export const getUnitsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(units);
    } catch (error) {
      console.error("Failed to fetch units:", error);
      return [];
    }
  });

// Product Creation
export const createProductFn = createServerFn({ method: "POST" })
  .validator((data: Omit<typeof products.$inferInsert, "createdAt" | "updatedAt">) => data)
  .handler(async ({ data }) => {
    try {
      const result = await db.insert(products).values(data).returning();
      return { success: true, product: result[0] };
    } catch (error) {
      console.error("Failed to create product:", error);
      return { success: false, error: String(error) };
    }
  });

export const getSuppliersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(suppliers);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      return [];
    }
  });

export const getPurchasesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
      return [];
    }
  });

export const getInventoryMovementsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(50);
    } catch (error) {
      console.error("Failed to fetch inventory movements:", error);
      return [];
    }
  });

export const getSettingsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const result = await db.select().from(settings).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      return null;
    }
  });
