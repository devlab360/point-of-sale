import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { products, customers, sales, saleItems, categories, brands, units, suppliers, purchases, inventoryMovements, settings } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import type { OfflineSale } from "./lib/db";

// Fetch all products from PostgreSQL
export const getProductsFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      const allProducts = await db.select().from(products).where(eq(products.organizationId, data.orgId));
      return allProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // Return empty array on failure (so offline mode can fallback to Dexie)
      return []; 
    }
  });

// Fetch all customers from PostgreSQL
export const getCustomersFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      const allCustomers = await db.select().from(customers).where(eq(customers.organizationId, data.orgId));
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
          organizationId: sale.orgId || "default",
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
            organizationId: sale.orgId || "default",
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
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(categories).where(eq(categories.organizationId, data.orgId));
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  });

export const getBrandsFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(brands).where(eq(brands.organizationId, data.orgId));
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      return [];
    }
  });

export const getUnitsFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(units).where(eq(units.organizationId, data.orgId));
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
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(suppliers).where(eq(suppliers.organizationId, data.orgId));
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      return [];
    }
  });

export const getPurchasesFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(purchases).where(eq(purchases.organizationId, data.orgId)).orderBy(desc(purchases.createdAt));
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
      return [];
    }
  });

export const getInventoryMovementsFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return [];
      return await db.select().from(inventoryMovements).where(eq(inventoryMovements.organizationId, data.orgId)).orderBy(desc(inventoryMovements.createdAt)).limit(50);
    } catch (error) {
      console.error("Failed to fetch inventory movements:", error);
      return [];
    }
  });

export const getSettingsFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.orgId) return null;
      const result = await db.select().from(settings).where(eq(settings.organizationId, data.orgId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      return null;
    }
  });

// Sync offline products to PostgreSQL
export const syncProductsFn = createServerFn({ method: "POST" })
  .validator((data: { products: any[] }) => data)
  .handler(async ({ data }) => {
    const { products: offlineProducts } = data;
    if (!offlineProducts.length) return { success: true, syncedIds: [] };

    const syncedIds: string[] = [];
    try {
      for (const prod of offlineProducts) {
        await db.insert(products).values({
          id: prod.id,
          organizationId: prod.orgId || "default",
          name: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          category: prod.category,
          brand: prod.brand,
          unit: prod.unit,
          price: prod.price.toString(),
          cost: prod.cost.toString(),
          stock: prod.stock,
          reorderLevel: prod.reorderLevel,
          image: prod.image,
          status: prod.status || "active",
        }).onConflictDoUpdate({
          target: products.id,
          set: {
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            category: prod.category,
            brand: prod.brand,
            unit: prod.unit,
            price: prod.price.toString(),
            cost: prod.cost.toString(),
            stock: prod.stock,
            reorderLevel: prod.reorderLevel,
            image: prod.image,
            status: prod.status || "active",
            updatedAt: new Date(),
          }
        });
        syncedIds.push(prod.id);
      }
      return { success: true, syncedIds };
    } catch (error) {
      console.error("Failed to sync products:", error);
      return { success: false, syncedIds, error: String(error) };
    }
  });

// Sync offline customers to PostgreSQL
export const syncCustomersFn = createServerFn({ method: "POST" })
  .validator((data: { customers: any[] }) => data)
  .handler(async ({ data }) => {
    const { customers: offlineCustomers } = data;
    if (!offlineCustomers.length) return { success: true, syncedIds: [] };

    const syncedIds: string[] = [];
    try {
      for (const cust of offlineCustomers) {
        await db.insert(customers).values({
          id: cust.id,
          organizationId: cust.orgId || "default",
          name: cust.name,
          email: cust.email || null,
          phone: cust.phone || null,
          visits: cust.visits || 0,
          totalSpent: cust.totalSpent?.toString() || "0",
          loyaltyPoints: cust.loyaltyPoints || 0,
          credit: cust.credit?.toString() || "0",
          walletBalance: cust.walletBalance?.toString() || "0",
          status: cust.status || "regular",
        }).onConflictDoUpdate({
          target: customers.id,
          set: {
            name: cust.name,
            email: cust.email || null,
            phone: cust.phone || null,
            visits: cust.visits || 0,
            totalSpent: cust.totalSpent?.toString() || "0",
            loyaltyPoints: cust.loyaltyPoints || 0,
            credit: cust.credit?.toString() || "0",
            walletBalance: cust.walletBalance?.toString() || "0",
            status: cust.status || "regular",
            updatedAt: new Date(),
          }
        });
        syncedIds.push(cust.id);
      }
      return { success: true, syncedIds };
    } catch (error) {
      console.error("Failed to sync customers:", error);
      return { success: false, syncedIds, error: String(error) };
    }
  });
