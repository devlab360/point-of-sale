import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getCouponsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.coupons)
        .where(eq(schema.coupons.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createCouponFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const c = data?.coupon || data || {};
    try {
      const couponData = {
        id: c.id || uuidv4(),
        organizationId: orgId,
        code: c.code || `CPN-${Date.now().toString().slice(-6)}`,
        type: c.type || "percentage",
        discount: (Number(c.discount ?? c.value) || 0).toFixed(2),
        usageLimit: Number(c.usageLimit ?? c.limit) || 100,
        used: Number(c.used ?? c.usedCount) || 0,
        expires: c.expires
          ? new Date(c.expires).toISOString()
          : c.validUntil
            ? new Date(c.validUntil).toISOString()
            : new Date(Date.now() + 30 * 86400000).toISOString(),
        status: c.status || "active",
      };

      await db.insert(schema.coupons).values(couponData);
      return { success: true, data: couponData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateCouponStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .update(schema.coupons)
        .set({ status: data.status })
        .where(and(eq(schema.coupons.id, data.id), eq(schema.coupons.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateCouponFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const updates = data.updates || data.coupon || data;
    try {
      const payload: any = {};
      if (updates.code !== undefined) payload.code = updates.code;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.discount !== undefined || updates.value !== undefined) {
        payload.discount = (Number(updates.discount ?? updates.value) || 0).toFixed(2);
      }
      if (updates.usageLimit !== undefined || updates.limit !== undefined) {
        payload.usageLimit = Number(updates.usageLimit ?? updates.limit) || 100;
      }
      if (updates.used !== undefined || updates.usedCount !== undefined) {
        payload.used = Number(updates.used ?? updates.usedCount) || 0;
      }
      if (updates.expires !== undefined || updates.validUntil !== undefined) {
        payload.expires = new Date(updates.expires ?? updates.validUntil).toISOString();
      }
      if (updates.status !== undefined) payload.status = updates.status;

      await db
        .update(schema.coupons)
        .set(payload)
        .where(
          and(
            eq(schema.coupons.id, data.id || updates.id),
            eq(schema.coupons.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteCouponFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.coupons)
        .where(and(eq(schema.coupons.id, data.id), eq(schema.coupons.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
