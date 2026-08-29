import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export const getPosBootstrapFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // 1. Authenticate once
    const session = await requireAuth();
    const orgId = session.orgId;

    const safeQuery = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await promise;
      } catch (err) {
        console.error("Bootstrap sub-query failed:", err);
        return fallback;
      }
    };

    // 2. Direct parallel DB queries (zero nested server function RPC overhead)
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
    ] = await Promise.all([
      safeQuery(
        db.select().from(schema.categories).where(eq(schema.categories.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.units).where(eq(schema.units.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.brands).where(eq(schema.brands.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.settings).where(eq(schema.settings.organizationId, orgId)).limit(1),
        [],
      ),
      safeQuery(
        db.select().from(schema.coupons).where(eq(schema.coupons.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.users).where(eq(schema.users.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.shifts).where(eq(schema.shifts.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.restaurantTables).where(eq(schema.restaurantTables.organizationId, orgId)),
        [],
      ),
      safeQuery(
        db.select().from(schema.repairs).where(eq(schema.repairs.organizationId, orgId)),
        [],
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
      },
    };
  } catch (error: any) {
    console.error("getPosBootstrapFn error:", error);
    return {
      success: false,
      error: error?.message || "Failed to bootstrap POS data",
      data: {
        categories: [],
        units: [],
        brands: [],
        settings: null,
        coupons: [],
        users: [],
        shifts: [],
        tables: [],
        repairs: [],
      },
    };
  }
});
