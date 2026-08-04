import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.quotations
  ? createInsertSchema(schema.quotations).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.quotations ? createInsertSchema(schema.quotations).partial() : z.any();
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getQuotationsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.quotations)
        .where(eq(schema.quotations.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const id = data.quotation.id || uuidv4();
      const newQuotation = {
        id,
        organizationId: orgId,
        quotationNo: data.quotation.quotationNo || `QT-${Date.now()}`,
        customerId: data.quotation.customerId,
        customerName: data.quotation.customerName || "Walk-in Customer",
        customerPhone: data.quotation.customerPhone,
        date: new Date(data.quotation.date || Date.now()).toISOString(),
        validUntil: new Date(
          data.quotation.validUntil || Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        items: data.quotation.items || [],
        subtotal: data.quotation.subtotal?.toString() || "0",
        discountAmt: data.quotation.discountAmt?.toString() || "0",
        taxAmt: data.quotation.taxAmt?.toString() || "0",
        total: data.quotation.total?.toString() || "0",
        status: data.quotation.status || "draft",
        notes: data.quotation.notes,
      };

      const inserted = await db.insert(schema.quotations).values(newQuotation).returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const updated = await db
        .update(schema.quotations)
        .set(data.updates)
        .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)))
        .returning();
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.quotations)
        .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
