import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray, desc, ilike, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { notDeleted } from "@/lib/soft-delete";

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
        .where(
          and(
            eq(schema.subscriptions.organizationId, orgId),
            notDeleted(schema.subscriptions.deletedAt),
          ),
        );
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
        .update(schema.subscriptions)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(eq(schema.subscriptions.id, data.id), eq(schema.subscriptions.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- SERVICES TABLE CRUD ---

export const getServicesListFn = createServerFn({ method: "GET" })
  .validator((data: any) => data || {})
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const page = data.page || 1;
      const pageSize = data.pageSize || 100;
      const locationId = data.locationId;

      const conditions = [
        eq(schema.services.organizationId, orgId),
        notDeleted(schema.services.deletedAt),
      ];
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

      if (items.length === 0) {
        return { success: true, data: [], total: 0 };
      }

      const serviceIds = items.map((s) => s.id);

      // Fetch variants and location-specific overrides in parallel
      const [variants, locOverrides] = await Promise.all([
        db
          .select()
          .from(schema.serviceVariants)
          .where(
            and(
              inArray(schema.serviceVariants.serviceId, serviceIds),
              eq(schema.serviceVariants.organizationId, orgId),
              notDeleted(schema.serviceVariants.deletedAt),
            ),
          ),
        locationId
          ? db
              .select()
              .from(schema.serviceLocations)
              .where(
                and(
                  eq(schema.serviceLocations.organizationId, orgId),
                  eq(schema.serviceLocations.locationId, locationId),
                  inArray(schema.serviceLocations.serviceId, serviceIds),
                  notDeleted(schema.serviceLocations.deletedAt),
                ),
              )
          : Promise.resolve([]),
      ]);

      const varMap = new Map<string, any[]>();
      variants.forEach((v) => {
        if (!varMap.has(v.serviceId)) varMap.set(v.serviceId, []);
        varMap.get(v.serviceId)!.push(v);
      });

      const locMap = new Map<string, typeof schema.serviceLocations.$inferSelect>();
      (locOverrides as any[]).forEach((lo) => {
        const key = lo.serviceVariantId ? `${lo.serviceId}:${lo.serviceVariantId}` : `${lo.serviceId}:base`;
        locMap.set(key, lo);
      });

      // Assemble enriched services with outlet price and availability
      let enrichedItems = items.map((svc) => {
        const baseLoc = locMap.get(`${svc.id}:base`);
        const isAvailable = baseLoc ? baseLoc.isAvailable : true;
        const effectivePrice = baseLoc?.price ? String(baseLoc.price) : svc.price;
        const effectiveDuration = baseLoc?.duration ?? svc.duration;

        const svcVariants = (varMap.get(svc.id) || []).map((v) => {
          const varLoc = locMap.get(`${svc.id}:${v.id}`);
          return {
            ...v,
            isAvailable: varLoc ? varLoc.isAvailable : true,
            price: varLoc?.price ? String(varLoc.price) : v.price,
            duration: varLoc?.duration ?? v.duration,
          };
        });

        return {
          ...svc,
          isAvailable,
          effectivePrice,
          price: effectivePrice,
          duration: effectiveDuration,
          variants: svcVariants,
        };
      });

      // If locationId specified, optionally filter out unavailable services
      if (locationId && data.onlyAvailable) {
        enrichedItems = enrichedItems.filter((s) => s.isAvailable);
      }

      return { success: true, data: enrichedItems, total: totalCount };
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
        image: data.image || null,
        status: data.status || "active",
      };

      await db.transaction(async (tx) => {
        await tx.insert(schema.services).values(payload);

        if (payload.hasVariants && data.variants && data.variants.length > 0) {
          for (const variant of data.variants) {
            const variantId = variant.id || uuidv4();
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

        // Outlet availability & custom pricing if supplied
        if (data.locationSettings && Array.isArray(data.locationSettings)) {
          for (const ls of data.locationSettings) {
            await tx.insert(schema.serviceLocations).values({
              id: uuidv4(),
              organizationId: orgId,
              serviceId: payload.id,
              serviceVariantId: ls.serviceVariantId || null,
              locationId: ls.locationId,
              isAvailable: ls.isAvailable !== false,
              price: ls.price ? String(ls.price) : null,
              cost: ls.cost ? String(ls.cost) : null,
              duration: ls.duration ? Number(ls.duration) : null,
            });
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
      if (data.image !== undefined) payload.image = data.image || null;
      payload.updatedAt = new Date().toISOString();

      await db.transaction(async (tx) => {
        await tx
          .update(schema.services)
          .set(payload)
          .where(and(eq(schema.services.id, data.id), eq(schema.services.organizationId, orgId)));

        if (data.hasVariants !== undefined) {
          await tx
            .update(schema.serviceVariants)
            .set({ deletedAt: new Date().toISOString() })
            .where(
              and(
                eq(schema.serviceVariants.serviceId, data.id),
                eq(schema.serviceVariants.organizationId, orgId),
              ),
            );

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

        // Outlet availability & custom pricing if supplied
        if (data.locationSettings && Array.isArray(data.locationSettings)) {
          for (const ls of data.locationSettings) {
            const existing = await tx
              .select({ id: schema.serviceLocations.id })
              .from(schema.serviceLocations)
              .where(
                and(
                  eq(schema.serviceLocations.organizationId, orgId),
                  eq(schema.serviceLocations.serviceId, data.id),
                  eq(schema.serviceLocations.locationId, ls.locationId),
                  ls.serviceVariantId
                    ? eq(schema.serviceLocations.serviceVariantId, ls.serviceVariantId)
                    : sql`${schema.serviceLocations.serviceVariantId} IS NULL`,
                ),
              )
              .limit(1);

            if (existing.length > 0) {
              await tx
                .update(schema.serviceLocations)
                .set({
                  isAvailable: ls.isAvailable !== false,
                  price: ls.price ? String(ls.price) : null,
                  cost: ls.cost ? String(ls.cost) : null,
                  duration: ls.duration ? Number(ls.duration) : null,
                  deletedAt: null,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(schema.serviceLocations.id, existing[0].id));
            } else {
              await tx.insert(schema.serviceLocations).values({
                id: uuidv4(),
                organizationId: orgId,
                serviceId: data.id,
                serviceVariantId: ls.serviceVariantId || null,
                locationId: ls.locationId,
                isAvailable: ls.isAvailable !== false,
                price: ls.price ? String(ls.price) : null,
                cost: ls.cost ? String(ls.cost) : null,
                duration: ls.duration ? Number(ls.duration) : null,
              });
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
            notDeleted(schema.serviceVariants.deletedAt),
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
        .update(schema.services)
        .set({ deletedAt: new Date().toISOString() })
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
        .where(
          and(
            eq(schema.serviceVariants.organizationId, session.orgId),
            notDeleted(schema.serviceVariants.deletedAt),
          ),
        );

      if (variants.length === 0) {
        return { success: true, data: [] };
      }

      const variantIds = variants.map((v) => v.id);
      const attributes = await db
        .select()
        .from(schema.serviceVariantAttributes)
        .where(inArray(schema.serviceVariantAttributes.variantId, variantIds));

      const variantsWithAttributes = variants.map((v) => {
        const vAttrs = attributes.filter((a) => a.variantId === v.id);
        return { ...v, attributes: vAttrs };
      });

      return { success: true, data: variantsWithAttributes };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ── OUTLET-WISE SERVICE PRICING & AVAILABILITY ──────────────────────

export const getServiceLocationsFn = createServerFn({ method: "GET" })
  .validator(
    (data: { serviceId: string; locationId?: string }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const conds = [
        eq(schema.serviceLocations.organizationId, orgId),
        eq(schema.serviceLocations.serviceId, data.serviceId),
        notDeleted(schema.serviceLocations.deletedAt),
      ];
      if (data.locationId) {
        conds.push(eq(schema.serviceLocations.locationId, data.locationId));
      }

      const rows = await db
        .select()
        .from(schema.serviceLocations)
        .where(and(...conds));

      return { success: true as const, data: rows };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateServiceLocationsFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      serviceId: string;
      locations: {
        locationId: string;
        serviceVariantId?: string | null;
        isAvailable: boolean;
        price?: string | number | null;
        cost?: string | number | null;
        duration?: number | null;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db.transaction(async (tx) => {
        for (const loc of data.locations) {
          const varId = loc.serviceVariantId || null;

          // Check if exists
          const existing = await tx
            .select({ id: schema.serviceLocations.id })
            .from(schema.serviceLocations)
            .where(
              and(
                eq(schema.serviceLocations.organizationId, orgId),
                eq(schema.serviceLocations.serviceId, data.serviceId),
                eq(schema.serviceLocations.locationId, loc.locationId),
                varId
                  ? eq(schema.serviceLocations.serviceVariantId, varId)
                  : sql`${schema.serviceLocations.serviceVariantId} IS NULL`,
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            await tx
              .update(schema.serviceLocations)
              .set({
                isAvailable: loc.isAvailable,
                price: loc.price ? String(loc.price) : null,
                cost: loc.cost ? String(loc.cost) : null,
                duration: loc.duration ? Number(loc.duration) : null,
                deletedAt: null,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(schema.serviceLocations.id, existing[0].id));
          } else {
            await tx.insert(schema.serviceLocations).values({
              id: uuidv4(),
              organizationId: orgId,
              serviceId: data.serviceId,
              serviceVariantId: varId,
              locationId: loc.locationId,
              isAvailable: loc.isAvailable,
              price: loc.price ? String(loc.price) : null,
              cost: loc.cost ? String(loc.cost) : null,
              duration: loc.duration ? Number(loc.duration) : null,
            });
          }
        }
      });

      return { success: true as const, message: "Outlet service pricing and availability saved" };
    } catch (e) {
      return handleApiError(e);
    }
  });

