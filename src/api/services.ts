import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export {
  getRentalsFn,
  createRentalFn,
  updateRentalFn,
  deleteRentalFn,
  updateRentalStatusFn,
} from "./rentals";
export {
  getRepairsFn,
  createRepairFn,
  updateRepairFn,
  deleteRepairFn,
  updateRepairStatusFn,
} from "./repairs";

// --- SUBSCRIPTIONS ---
export const getSubscriptionsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

const safeIsoDate = (val: any) => {
  if (!val) return new Date().toISOString();
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString();
  const str = String(val).replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const createSubscriptionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const s = data?.subscription || data || {};
    try {
      const subData = {
        id: s.id || uuidv4(),
        organizationId: orgId,
        subscriptionNo: s.subscriptionNo || `SUB-${Date.now().toString().slice(-6)}`,
        customerName: s.customerName || "Customer",
        customerPhone: s.customerPhone || null,
        planName: s.planName || "Standard Plan",
        billingCycle: s.billingCycle || "monthly",
        amount: (Number(s.amount) || 0).toFixed(2),
        nextBillingDate: safeIsoDate(s.nextBillingDate),
        status: s.status || "active",
      };

      await db.insert(schema.subscriptions).values(subData);
      return { success: true, data: subData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSubscriptionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const updates = data.updates || data.subscription || data;
    try {
      const payload: any = {};
      if (updates.subscriptionNo !== undefined) payload.subscriptionNo = updates.subscriptionNo;
      if (updates.customerName !== undefined) payload.customerName = updates.customerName;
      if (updates.customerPhone !== undefined) payload.customerPhone = updates.customerPhone;
      if (updates.planName !== undefined) payload.planName = updates.planName;
      if (updates.billingCycle !== undefined) payload.billingCycle = updates.billingCycle;
      if (updates.amount !== undefined) payload.amount = (Number(updates.amount) || 0).toFixed(2);
      if (updates.nextBillingDate !== undefined)
        payload.nextBillingDate = new Date(updates.nextBillingDate).toISOString();
      if (updates.status !== undefined) payload.status = updates.status;

      await db
        .update(schema.subscriptions)
        .set(payload)
        .where(
          and(
            eq(schema.subscriptions.id, data.id || updates.id),
            eq(schema.subscriptions.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteSubscriptionFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.subscriptions)
        .where(
          and(eq(schema.subscriptions.id, data.id), eq(schema.subscriptions.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
