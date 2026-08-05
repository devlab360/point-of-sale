import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.settings
  ? createInsertSchema(schema.settings).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.settings ? createInsertSchema(schema.settings).partial() : z.any();
import { eq } from "drizzle-orm";

export const getSettingsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
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
    const session = await requireAdmin();
    const orgId = session.orgId;
    try {
      const updated = await db
        .update(schema.settings)
        .set(data.settings)
        .where(eq(schema.settings.organizationId, orgId))
        .returning();
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getAllSaasPlansFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const plans = await db.select().from(schema.saasPlans);
      return { success: true, data: plans };
    } catch (e) {
      return handleApiError(e);
    }
  });
