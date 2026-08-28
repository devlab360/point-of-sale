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

// --- SERVICES TABLE CRUD ---

import { desc, ilike, or, sql } from "drizzle-orm";

export const getServicesListFn = createServerFn({ method: "GET" })
  .validator((data: any) => data || {})
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const page = data.page || 1;
      const pageSize = data.pageSize || 50;

      const conditions = [eq(schema.services.organizationId, orgId)];
      if (data.query) {
        conditions.push(ilike(schema.services.name, `%${data.query}%`));
      }
      if (data.categoryId && data.categoryId !== "all") {
        conditions.push(eq(schema.services.category, data.categoryId));
      }
      if (data.status) {
        conditions.push(eq(schema.services.status, data.status));
      }

      const whereClause = and(...conditions);

      const items = await db
        .select()
        .from(schema.services)
        .where(whereClause)
        .orderBy(desc(schema.services.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const countRes = await db
        .select({ count: sql`count(*)` })
        .from(schema.services)
        .where(whereClause);
      const totalCount = Number(countRes[0].count);

      return { success: true, data: items, total: totalCount };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createServiceItemFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const payload = {
        id: data.id || uuidv4(),
        organizationId: orgId,
        name: data.name,
        category: data.category || "General",
        price: String(data.price || 0),
        cost: String(data.cost || 0),
        duration: data.duration ? Number(data.duration) : null,
        hasVariants: Boolean(data.hasVariants),
        status: data.status || "active",
      };

      const { variants, ...restPayload } = payload as any;

      await db.transaction(async (tx) => {
        await tx.insert(schema.services).values(payload);

        if (payload.hasVariants && data.variants && data.variants.length > 0) {
          for (const variant of data.variants) {
            const variantId = uuidv4();
            await tx.insert(schema.serviceVariants).values({
              id: variantId,
              organizationId: orgId,
              serviceId: payload.id,
              name: variant.name,
              price: String(variant.price || 0),
              cost: String(variant.cost || 0),
              duration: variant.duration ? Number(variant.duration) : null,
            });

            if (variant.attributes && variant.attributes.length > 0) {
              const attributes = variant.attributes.map((attr: any) => ({
                id: uuidv4(),
                variantId: variantId,
                name: attr.name,
                value: String(attr.value),
              }));
              await tx.insert(schema.serviceVariantAttributes).values(attributes);
            }
          }
        }
      });
      return { success: true, data: payload };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateServiceItemFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.category !== undefined) payload.category = data.category;
      if (data.price !== undefined) payload.price = String(data.price);
      if (data.cost !== undefined) payload.cost = String(data.cost);
      if (data.duration !== undefined)
        payload.duration = data.duration ? Number(data.duration) : null;
      if (data.status !== undefined) payload.status = data.status;
      if (data.hasVariants !== undefined) payload.hasVariants = Boolean(data.hasVariants);
      payload.updatedAt = new Date().toISOString();

      await db.transaction(async (tx) => {
        await tx
          .update(schema.services)
          .set(payload)
          .where(and(eq(schema.services.id, data.id), eq(schema.services.organizationId, orgId)));

        if (data.hasVariants !== undefined) {
          await tx
            .delete(schema.serviceVariants)
            .where(eq(schema.serviceVariants.serviceId, data.id));

          if (data.hasVariants && data.variants && data.variants.length > 0) {
            for (const variant of data.variants) {
              const variantId = uuidv4();
              await tx.insert(schema.serviceVariants).values({
                id: variantId,
                organizationId: orgId,
                serviceId: data.id,
                name: variant.name,
                price: String(variant.price || 0),
                cost: String(variant.cost || 0),
                duration: variant.duration ? Number(variant.duration) : null,
              });

              if (variant.attributes && variant.attributes.length > 0) {
                const attributes = variant.attributes.map((attr: any) => ({
                  id: uuidv4(),
                  variantId: variantId,
                  name: attr.name,
                  value: String(attr.value),
                }));
                await tx.insert(schema.serviceVariantAttributes).values(attributes);
              }
            }
          }
        }
      });

      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getServiceVariantsFn = createServerFn({ method: "GET" })
  .validator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    try {
      const session = await requireAuth();

      const variants = await db
        .select()
        .from(schema.serviceVariants)
        .where(
          and(
            eq(schema.serviceVariants.serviceId, serviceId),
            eq(schema.serviceVariants.organizationId, session.orgId),
          ),
        );

      const variantsWithAttributes = await Promise.all(
        variants.map(async (v) => {
          const attributes = await db
            .select()
            .from(schema.serviceVariantAttributes)
            .where(eq(schema.serviceVariantAttributes.variantId, v.id));
          return { ...v, attributes };
        }),
      );

      return { success: true, data: variantsWithAttributes };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteServiceItemFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db
        .delete(schema.services)
        .where(and(eq(schema.services.id, data.id), eq(schema.services.organizationId, orgId)));

      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getAllServiceVariantsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data || {})
  .handler(async () => {
    try {
      const session = await requireAuth();
      const variants = await db
        .select()
        .from(schema.serviceVariants)
        .where(eq(schema.serviceVariants.organizationId, session.orgId));

      const attributes = await db.select().from(schema.serviceVariantAttributes);

      const variantsWithAttributes = variants.map((v) => {
        const vAttrs = attributes.filter((a) => a.variantId === v.id);
        return { ...v, attributes: vAttrs };
      });

      return { success: true, data: variantsWithAttributes };
    } catch (e) {
      return handleApiError(e);
    }
  });
