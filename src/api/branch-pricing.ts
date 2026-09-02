import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  return { db, schema, eq, and };
}

// Toggle branch-wise pricing for the organization.
export const toggleBranchPricingFn = createServerFn({ method: "POST" })
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq } = await getDb();
      await db
        .update(schema.organizations)
        .set({ branchPricingEnabled: data.enabled })
        .where(eq(schema.organizations.id, session.orgId));
      return { success: true as const, message: "Branch pricing updated" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// List price overrides for a branch.
export const getBranchPriceOverridesFn = createServerFn({ method: "GET" })
  .validator(z.object({ locationId: z.string() }).optional().default({ locationId: "" }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq, and } = await getDb();
      const rows = data.locationId
        ? await db
            .select()
            .from(schema.branchPriceOverrides)
            .where(
              and(
                eq(schema.branchPriceOverrides.organizationId, session.orgId),
                eq(schema.branchPriceOverrides.locationId, data.locationId),
              ),
            )
        : await db
            .select()
            .from(schema.branchPriceOverrides)
            .where(eq(schema.branchPriceOverrides.organizationId, session.orgId));
      return { success: true as const, data: rows };
    } catch (e) {
      return handleApiError(e);
    }
  });

const PriceOverrideSchema = z.object({
  locationId: z.string().min(1),
  entityType: z.string().default("product"),
  entityId: z.string().min(1),
  price: z.string().optional(),
  cost: z.string().optional(),
  wholesalePrice: z.string().optional(),
  dealerPrice: z.string().optional(),
  mrp: z.string().optional(),
});

// Upsert a single branch price override.
export const upsertBranchPriceFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => PriceOverrideSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq, and } = await getDb();

      const branch = await db
        .select()
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.id, data.locationId),
            eq(schema.locations.organizationId, session.orgId),
          ),
        )
        .limit(1);
      if (!branch.length) throw new Error("Branch not found");

      const existing = await db
        .select()
        .from(schema.branchPriceOverrides)
        .where(
          and(
            eq(schema.branchPriceOverrides.organizationId, session.orgId),
            eq(schema.branchPriceOverrides.locationId, data.locationId),
            eq(schema.branchPriceOverrides.entityType, data.entityType),
            eq(schema.branchPriceOverrides.entityId, data.entityId),
          ),
        )
        .limit(1);

      const payload: any = {
        price: data.price,
        cost: data.cost,
        wholesalePrice: data.wholesalePrice,
        dealerPrice: data.dealerPrice,
        mrp: data.mrp,
        updatedAt: new Date().toISOString(),
      };

      if (existing.length) {
        await db
          .update(schema.branchPriceOverrides)
          .set(payload)
          .where(eq(schema.branchPriceOverrides.id, existing[0].id));
      } else {
        await db.insert(schema.branchPriceOverrides).values({
          id: uuidv4(),
          organizationId: session.orgId,
          locationId: data.locationId,
          entityType: data.entityType,
          entityId: data.entityId,
          price: data.price,
          cost: data.cost,
          wholesalePrice: data.wholesalePrice,
          dealerPrice: data.dealerPrice,
          mrp: data.mrp,
        });
      }

      return { success: true as const, message: "Branch price saved" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// Fetch products and services for the branch pricing catalog.
export const getBranchPricingCatalogFn = createServerFn({ method: "GET" })
  .validator(z.object({ orgId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await requireAuth();
      const { db, schema, eq } = await getDb();
      const [products, services] = await Promise.all([
        db.select().from(schema.products).where(eq(schema.products.organizationId, data.orgId)),
        db.select().from(schema.services).where(eq(schema.services.organizationId, data.orgId)),
      ]);
      return { success: true as const, data: { products, services } };
    } catch (e) {
      return handleApiError(e);
    }
  });

// Delete a branch price override (falls back to default pricing).
export const deleteBranchPriceFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq, and } = await getDb();
      await db
        .delete(schema.branchPriceOverrides)
        .where(
          and(
            eq(schema.branchPriceOverrides.id, data.id),
            eq(schema.branchPriceOverrides.organizationId, session.orgId),
          ),
        );
      return { success: true as const, message: "Branch price override removed" };
    } catch (e) {
      return handleApiError(e);
    }
  });
