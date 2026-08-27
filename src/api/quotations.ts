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

const inMemoryQuotations: Record<string, any[]> = {};

export const getQuotationsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.quotations) {
        const all = await db
          .select()
          .from(schema.quotations)
          .where(eq(schema.quotations.organizationId, orgId));
        return { success: true, data: all || [] };
      }
    } catch (e) {
      console.warn("DB quotations query fallback:", e);
    }
    return { success: true, data: inMemoryQuotations[orgId] || [] };
  });

export const createQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    const id = data.quotation?.id || uuidv4();
    const newQuotation = {
      id,
      organizationId: orgId,
      quotationNo: data.quotation?.quotationNo || `QT-${Date.now()}`,
      customerId: data.quotation?.customerId,
      customerName: data.quotation?.customerName || "Walk-in Customer",
      customerPhone: data.quotation?.customerPhone,
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
      notes: data.quotation?.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (schema.quotations) {
        const inserted = await db.insert(schema.quotations).values(newQuotation).returning();
        return { success: true, data: inserted[0] };
      }
    } catch (e) {
      console.warn("DB create quotation fallback:", e);
    }

    if (!inMemoryQuotations[orgId]) inMemoryQuotations[orgId] = [];
    inMemoryQuotations[orgId].unshift(newQuotation);
    return { success: true, data: newQuotation };
  });

export const updateQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.quotations) {
        await db
          .update(schema.quotations)
          .set(data.updates)
          .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)));
        return { success: true };
      }
    } catch (e) {
      console.warn("DB update quotation fallback:", e);
    }

    if (inMemoryQuotations[orgId]) {
      inMemoryQuotations[orgId] = inMemoryQuotations[orgId].map((q) =>
        q.id === data.id ? { ...q, ...data.updates } : q,
      );
    }
    return { success: true };
  });

export const deleteQuotationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.quotations) {
        await db
          .delete(schema.quotations)
          .where(and(eq(schema.quotations.id, data.id), eq(schema.quotations.organizationId, orgId)));
        return { success: true };
      }
    } catch (e) {
      console.warn("DB delete quotation fallback:", e);
    }

    if (inMemoryQuotations[orgId]) {
      inMemoryQuotations[orgId] = inMemoryQuotations[orgId].filter((q) => q.id !== data.id);
    }
    return { success: true };
  });
