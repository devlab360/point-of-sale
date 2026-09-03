import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { notDeleted } from "@/lib/soft-delete";

export const getDashboardStatsFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .optional()
      .default({}),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const salesConditions = [
        eq(schema.sales.organizationId, orgId),
        eq(schema.sales.status, "completed"),
        notDeleted(schema.sales.deletedAt),
      ];
      const expensesConditions = [
        eq(schema.expenses.organizationId, orgId),
        notDeleted(schema.expenses.deletedAt),
      ];

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

      // Revenue by Type
      const revenueByType = await db
        .select({
          referenceType: schema.saleItems.referenceType,
          total: sql`COALESCE(SUM(CAST(${schema.saleItems.total} AS NUMERIC)), 0)`,
        })
        .from(schema.saleItems)
        .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
        .where(and(...salesConditions))
        .groupBy(schema.saleItems.referenceType);

      let totalProductRevenue = 0;
      let totalServiceRevenue = 0;
      revenueByType.forEach((rt) => {
        if (rt.referenceType === "PRODUCT") totalProductRevenue = Number(rt.total);
        if (rt.referenceType === "SERVICE") totalServiceRevenue = Number(rt.total);
      });

      // 2. Total Expenses
      const [expenseStats] = await db
        .select({
          totalExpenses: sql`COALESCE(SUM(CAST(${schema.expenses.amount} AS NUMERIC)), 0)`,
        })
        .from(schema.expenses)
        .where(and(...expensesConditions));

      // 3. Customer, Product & Service Counts
      const [customerStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.customers)
        .where(
          and(eq(schema.customers.organizationId, orgId), notDeleted(schema.customers.deletedAt)),
        );

      const [productStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.products)
        .where(
          and(eq(schema.products.organizationId, orgId), notDeleted(schema.products.deletedAt)),
        );

      const [serviceStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.services)
        .where(
          and(eq(schema.services.organizationId, orgId), notDeleted(schema.services.deletedAt)),
        );

      // 4. Low Stock Count
      const [lowStockStats] = await db
        .select({ count: sql`COUNT(*)` })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.organizationId, orgId),
            notDeleted(schema.products.deletedAt),
            sql`${schema.products.stock} <= COALESCE(${schema.products.reorderLevel}, 5)`,
          ),
        );

      return {
        success: true,
        data: {
          totalRevenue: Number(salesStats.totalRevenue),
          totalProductRevenue,
          totalServiceRevenue,
          totalSubtotal: Number(salesStats.totalSubtotal),
          salesCount: Number(salesStats.salesCount),
          totalExpenses: Number(expenseStats.totalExpenses),
          totalCustomers: Number(customerStats.count),
          totalProducts: Number(productStats.count),
          totalServices: Number(serviceStats.count),
          lowStockCount: Number(lowStockStats.count),
        },
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
