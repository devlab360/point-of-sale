import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getPromotionsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.promotions)
        .where(eq(schema.promotions.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createPromotionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const p = data?.promotion || data || {};
    try {
      const promoData = {
        id: p.id || uuidv4(),
        organizationId: orgId,
        title: p.title || "Special Offer",
        type: p.type || "percentage",
        value: (Number(p.value) || 0).toFixed(2),
        conditions:
          typeof p.conditions === "string" ? p.conditions : JSON.stringify(p.conditions || {}),
        startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
        endDate: p.endDate
          ? new Date(p.endDate).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
        status: p.status || "active",
      };

      await db.insert(schema.promotions).values(promoData);
      return { success: true, data: promoData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updatePromotionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const updates = data.updates || data.promotion || data;
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.value !== undefined) payload.value = (Number(updates.value) || 0).toFixed(2);
      if (updates.conditions !== undefined)
        payload.conditions =
          typeof updates.conditions === "string"
            ? updates.conditions
            : JSON.stringify(updates.conditions);
      if (updates.startDate !== undefined)
        payload.startDate = new Date(updates.startDate).toISOString();
      if (updates.endDate !== undefined) payload.endDate = new Date(updates.endDate).toISOString();
      if (updates.status !== undefined) payload.status = updates.status;

      await db
        .update(schema.promotions)
        .set(payload)
        .where(
          and(
            eq(schema.promotions.id, data.id || updates.id),
            eq(schema.promotions.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deletePromotionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.promotions)
        .where(and(eq(schema.promotions.id, data.id), eq(schema.promotions.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
