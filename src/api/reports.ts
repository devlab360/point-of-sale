import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { notDeleted } from "@/lib/soft-delete";
import { eq, and, sql, gte, lte, inArray, desc } from "drizzle-orm";
import { z } from "zod";

export const getProfitabilityReportFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        locationId: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      let salesConditions = [
        eq(schema.sales.organizationId, orgId),
        eq(schema.sales.status, "completed"),
        notDeleted(schema.sales.deletedAt),
      ];
      if (data.startDate) {
        salesConditions.push(gte(schema.sales.date, data.startDate));
      }
      if (data.endDate) {
        salesConditions.push(lte(schema.sales.date, data.endDate + "T23:59:59.999Z"));
      }
      if (data.locationId && data.locationId !== "all") {
        salesConditions.push(eq(schema.sales.locationId, data.locationId));
      }

      // Fetch all completed sales in range
      const validSales = await db
        .select({
          id: schema.sales.id,
          total: schema.sales.total,
          discountAmt: schema.sales.discountAmt,
          taxAmt: schema.sales.taxAmt,
        })
        .from(schema.sales)
        .where(and(...salesConditions));

      const saleIds = validSales.map((s) => s.id);

      let totalRevenue = 0;
      let totalDiscounts = 0;
      let totalTax = 0;

      for (const sale of validSales) {
        totalRevenue += Number(sale.total) || 0;
        totalDiscounts += Number(sale.discountAmt) || 0;
        totalTax += Number(sale.taxAmt) || 0;
      }

      const netRevenue = totalRevenue - totalTax;

      let totalCogs = 0;
      let productBreakdown: Record<
        string,
        { quantitySold: number; revenue: number; cogs: number }
      > = {};
      let topProducts: any[] = [];

      if (saleIds.length > 0) {
        // Fetch all sale items to get revenue per product
        const saleItems = await db
          .select()
          .from(schema.saleItems)
          .where(
            and(
              inArray(schema.saleItems.saleId, saleIds),
              eq(schema.saleItems.organizationId, orgId),
            ),
          );

        for (const item of saleItems) {
          const pid = item.productId;
          if (pid) {
            if (!productBreakdown[pid]) {
              productBreakdown[pid] = { quantitySold: 0, revenue: 0, cogs: 0 };
            }
            productBreakdown[pid].quantitySold += Number(item.quantity) || 0;
            productBreakdown[pid].revenue += Number(item.total) || 0;
          }
        }

        // Fetch consumptions for COGS
        const consumptions = await db
          .select({
            quantityConsumed: schema.inventoryBatchConsumptions.quantityConsumed,
            productId: schema.inventoryBatches.productId,
            purchaseCost: schema.inventoryBatches.purchaseCost,
          })
          .from(schema.inventoryBatchConsumptions)
          .innerJoin(
            schema.inventoryBatches,
            eq(schema.inventoryBatchConsumptions.batchId, schema.inventoryBatches.id),
          )
          .where(
            and(
              inArray(schema.inventoryBatchConsumptions.saleId, saleIds),
              eq(schema.inventoryBatches.organizationId, orgId),
              notDeleted(schema.inventoryBatches.deletedAt),
            ),
          );

        const consumedProductIds = new Set<string>();
        for (const cons of consumptions) {
          const cost = (Number(cons.quantityConsumed) || 0) * (Number(cons.purchaseCost) || 0);
          totalCogs += cost;

          if (cons.productId && productBreakdown[cons.productId]) {
            productBreakdown[cons.productId].cogs += cost;
            consumedProductIds.add(cons.productId);
          }
        }

        const productIds = Object.keys(productBreakdown);
        let productsInfo: Array<{ id: string; name: string; cost: string | null }> = [];
        if (productIds.length > 0) {
          productsInfo = await db
            .select({
              id: schema.products.id,
              name: schema.products.name,
              cost: schema.products.cost,
            })
            .from(schema.products)
            .where(
              and(
                inArray(schema.products.id, productIds),
                eq(schema.products.organizationId, orgId),
                notDeleted(schema.products.deletedAt),
              ),
            );

          const productMap = new Map(productsInfo.map((p) => [p.id, p]));

          // For products without batch consumptions, fall back to product.cost * quantitySold
          for (const [pid, data] of Object.entries(productBreakdown)) {
            if (!consumedProductIds.has(pid)) {
              const p = productMap.get(pid);
              const unitCost = Number(p?.cost) || 0;
              const fallbackCost = unitCost * data.quantitySold;
              data.cogs += fallbackCost;
              totalCogs += fallbackCost;
            }
          }
        }

        const nameMap = productsInfo.reduce(
          (acc, p) => ({ ...acc, [p.id]: p.name }),
          {} as Record<string, string>,
        );

        topProducts = Object.entries(productBreakdown)
          .map(([pid, data]) => ({
            productId: pid,
            name: nameMap[pid] || "Unknown Product",
            quantitySold: data.quantitySold,
            revenue: data.revenue,
            cogs: data.cogs,
            profit: data.revenue - data.cogs,
            margin: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
          }))
          .sort((a, b) => b.profit - a.profit);
      }

      const grossProfit = netRevenue - totalCogs;
      const marginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      return {
        success: true,
        data: {
          netRevenue,
          totalCogs,
          grossProfit,
          marginPct,
          topProducts,
        },
      };
    } catch (e: any) {
      console.error("COGS Error:", e);
      return { success: false, error: e.message };
    }
  });
