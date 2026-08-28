import { formatErrorResponse } from "@/lib/errors/errors";
import { createServerFn } from "@tanstack/react-start";
import { salesService } from "@/services/sales.service";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

export const getSalesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        status: z.string().optional(),
        payment: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { sales, totalCount } = await salesService.getSales(session.orgId, data);
      return { success: true, data: sales, total: totalCount };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const getSaleItemsFn = createServerFn({ method: "GET" })
  .validator(z.object({ saleId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const items = await salesService.getSaleItems(session.orgId, data.saleId);
      const safeItems = items.map((item) => ({
        ...item,
        modifiers: (item.modifiers as Record<string, any>) || null,
      }));
      return { success: true, data: safeItems };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

const SaleItemSchema = z.object({
  referenceType: z.enum(["PRODUCT", "SERVICE"]).optional().default("PRODUCT"),
  referenceId: z.string(),
  productId: z.string().optional(),
  productName: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  taxAmt: z.number().optional().nullable(),
  discountAmt: z.number().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  batchNo: z.string().optional().nullable(),
});

const SaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional().default("completed"),
  paymentMethod: z.string().optional().default("cash"),
  paid: z.number().optional().nullable(),
  payments: z.array(z.any()).optional().nullable(),
  salesmanName: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

export const createSaleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sale: SaleSchema,
      items: z.array(SaleItemSchema),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const result = await salesService.createSale(
        session.orgId,
        session.userId,
        session.userName || "Cashier",
        {
          customerId: data.sale.customerId,
          customerName: data.sale.customerName,
          salesmanName: data.sale.salesmanName,
          date: data.sale.date,
          status: data.sale.status,
          paymentMethod: data.sale.paymentMethod,
          paid: data.sale.paid,
          payments: data.sale.payments || undefined,
          items: data.items,
        },
      );
      return { success: true, ...result, data: { id: result.saleId }, message: "Sale transaction recorded successfully" };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });
