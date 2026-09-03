import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { notDeleted } from "@/lib/soft-delete";

const QuotationItemSchema = z
  .object({
    productId: z.string().optional(),
    productName: z.string(),
    quantity: z.number().positive(),
    price: z.union([z.string(), z.number()]),
    total: z.union([z.string(), z.number()]),
    discount: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const QuotationInputSchema = z
  .object({
    id: z.string().optional(),
    quotationNo: z.string().optional(),
    customerId: z.string().nullable().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().nullable().optional(),
    date: z.string().optional(),
    validUntil: z.string().optional(),
    items: z.array(QuotationItemSchema).optional(),
    subtotal: z.union([z.string(), z.number()]).optional(),
    discountAmt: z.union([z.string(), z.number()]).optional(),
    taxAmt: z.union([z.string(), z.number()]).optional(),
    total: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

export const getQuotationsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.quotations)
        .where(
          and(eq(schema.quotations.organizationId, orgId), notDeleted(schema.quotations.deletedAt)),
        );
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createQuotationFn = createServerFn({ method: "POST" })
  .validator(z.object({ quotation: QuotationInputSchema }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const newQuotation = {
        id: data.quotation?.id || uuidv4(),
        organizationId: orgId,
        quotationNo: data.quotation?.quotationNo || `QT-${Date.now()}`,
        customerId: data.quotation?.customerId || null,
        customerName: data.quotation?.customerName || "Walk-in Customer",
        customerPhone: data.quotation?.customerPhone || null,
        date: new Date(data.quotation?.date || Date.now()).toISOString(),
        validUntil: new Date(
          data.quotation?.validUntil || Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        items: data.quotation?.items || [],
        subtotal: data.quotation?.subtotal?.toString() || "0",
        discountAmt: data.quotation?.discountAmt?.toString() || "0",
        taxAmt: data.quotation?.taxAmt?.toString() || "0",
        total: data.quotation?.total?.toString() || "0",
        status: data.quotation?.status || "draft",
        notes: data.quotation?.notes || null,
      };

      const inserted = await db.insert(schema.quotations).values(newQuotation).returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateQuotationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      updates: z.record(z.any()),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.quotations)
        .set({ ...data.updates })
        .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteQuotationFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.quotations)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
