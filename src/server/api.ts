import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { products, customers, sales, saleItems } from "../db/schema";
import { eq } from "drizzle-orm";
import type { OfflineSale } from "../lib/db";

// Fetch all products from PostgreSQL
export const getProductsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const allProducts = await db.select().from(products);
      return allProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw new Error("Failed to fetch products from server");
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
      throw new Error("Failed to fetch customers from server");
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
