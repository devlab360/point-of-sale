import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return { db, schema, eq };
}

async function getSchemas() {
  const schema = await import("@/db/schema");
  const insertSchema = schema.settings
    ? createInsertSchema(schema.settings).omit({ id: true }).partial()
    : z.any();
  const updateSchema = schema.settings ? createInsertSchema(schema.settings).partial() : z.any();
  return { schema, insertSchema, updateSchema };
}

export const getSettingsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const { db, schema, eq } = await getDb();
      const res = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.organizationId, orgId))
        .limit(1);
      if (res.length > 0) return { success: true, data: res[0] };
      return { success: false, error: "Settings not found" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSettingsFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      const orgId = session.orgId;
      const payload = data.settings || data.updates || {};
      const { db, schema, eq } = await getDb();
      const existing = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.organizationId, orgId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.settings).values({
          id: `setting_${Date.now()}`,
          organizationId: orgId,
          storeName: payload.storeName || "My Store",
          ...payload,
        });
      } else {
        await db
          .update(schema.settings)
          .set(payload)
          .where(eq(schema.settings.organizationId, orgId))
          .returning();
      }
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getAllSaasPlansFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const { db, schema } = await getDb();
      const plans = await db.select().from(schema.saasPlans);
      return { success: true, data: plans };
    } catch (e) {
      return handleApiError(e);
    }
  });
