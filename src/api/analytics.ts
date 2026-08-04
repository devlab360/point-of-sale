import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";

export const getDashboardStatsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional().default({})
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const salesConditions = [eq(schema.sales.organizationId, orgId), eq(schema.sales.status, "completed")];
      const expensesConditions = [eq(schema.expenses.organizationId, orgId)];

      if (data?.startDate) {
        salesConditions.push(gte(schema.sales.date, data.startDate));
        expensesConditions.push(gte(schema.expenses.date, data.startDate));
      }
      if (data?.endDate) {
        salesConditions.push(lte(schema.sales.date, data.endDate));
        expensesConditions.push(lte(schema.expenses.date, data.endDate));
      }

      // 1. Total Sales Revenue
      const [salesStats] = await db
        .select({
          totalRevenue: sql`COALESCE(SUM(CAST(${schema.sales.total} AS NUMERIC)), 0)`,
          totalSubtotal: sql`COALESCE(SUM(CAST(${schema.sales.subtotal} AS NUMERIC)), 0)`,
          salesCount: sql`COUNT(*)`,
        })
        .from(schema.sales)
        .where(and(...salesConditions));

      // 2. Total Expenses
      const [expenseStats] = await db
        .select({
          totalExpenses: sql`COALESCE(SUM(CAST(${schema.expenses.amount} AS NUMERIC)), 0)`,
        })
        .from(schema.expenses)
        .where(and(...expensesConditions));

      // 3. Customer & Product Counts
      const [customerStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.customers)
        .where(eq(schema.customers.organizationId, orgId));

      const [productStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.products)
        .where(eq(schema.products.organizationId, orgId));

      // 4. Low Stock Count
      const [lowStockStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.organizationId, orgId),
            sql`${schema.products.stock} <= COALESCE(${schema.products.reorderLevel}, 5)`
          )
        );

      return {
        success: true,
        data: {
          totalRevenue: Number(salesStats.totalRevenue),
          totalSubtotal: Number(salesStats.totalSubtotal),
          salesCount: Number(salesStats.salesCount),
          totalExpenses: Number(expenseStats.totalExpenses),
          totalCustomers: Number(customerStats.count),
          totalProducts: Number(productStats.count),
          lowStockCount: Number(lowStockStats.count),
        },
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
