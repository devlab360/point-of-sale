import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";
import { handleApiError } from "@/lib/error-utils";

export const getPosBootstrapFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // Ensure the user is authenticated once
    const session = await requireAuth();
    const orgId = session.orgId;

    // Fetch all static/semi-static POS data in parallel direct DB queries
    const [
      categories,
      units,
      brands,
      settingsRows,
      coupons,
      users,
      shifts,
      tables,
      repairs,
      taxMasters,
    ] = await Promise.all([
      db
        .select()
        .from(schema.categories)
        .where(
          and(eq(schema.categories.organizationId, orgId), notDeleted(schema.categories.deletedAt)),
        ),
      db
        .select()
        .from(schema.units)
        .where(and(eq(schema.units.organizationId, orgId), notDeleted(schema.units.deletedAt))),
      db
        .select()
        .from(schema.brands)
        .where(and(eq(schema.brands.organizationId, orgId), notDeleted(schema.brands.deletedAt))),
      db
        .select()
        .from(schema.settings)
        .where(
          and(eq(schema.settings.organizationId, orgId), notDeleted(schema.settings.deletedAt)),
        )
        .limit(1),
      db
        .select()
        .from(schema.coupons)
        .where(
          and(eq(schema.coupons.organizationId, orgId), notDeleted(schema.coupons.deletedAt)),
        ),
      db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.organizationId, orgId), notDeleted(schema.users.deletedAt))),
      db
        .select()
        .from(schema.shifts)
        .where(and(eq(schema.shifts.organizationId, orgId), notDeleted(schema.shifts.deletedAt)))
        .orderBy(desc(schema.shifts.createdAt))
        .limit(20),
      db
        .select()
        .from(schema.restaurantTables)
        .where(
          and(
            eq(schema.restaurantTables.organizationId, orgId),
            notDeleted(schema.restaurantTables.deletedAt),
          ),
        ),
      db
        .select()
        .from(schema.repairs)
        .where(
          and(eq(schema.repairs.organizationId, orgId), notDeleted(schema.repairs.deletedAt)),
        ),
      db
        .select()
        .from(schema.taxMasters)
        .where(
          and(eq(schema.taxMasters.organizationId, orgId), notDeleted(schema.taxMasters.deletedAt)),
        ),
    ]);

    return {
      success: true,
      data: {
        categories: categories || [],
        units: units || [],
        brands: brands || [],
        settings: settingsRows?.[0] || null,
        coupons: coupons || [],
        users: users || [],
        shifts: shifts || [],
        tables: tables || [],
        repairs: repairs || [],
        taxMasters: taxMasters || [],
      },
    };
  } catch (e) {
    return handleApiError(e);
  }
});

