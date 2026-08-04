import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
export const getActivityLogFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.activityLog)
        .where(eq(schema.activityLog.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createActivityLogFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.insert(schema.activityLog).values({
        id: data.log.id || uuidv4(),
        organizationId: orgId,
        user: data.log.user || "System",
        action: data.log.action,
        details: data.log.details || null,
        timestamp: data.log.createdAt
          ? new Date(data.log.createdAt).toISOString()
          : new Date().toISOString(),
        type: data.log.type || null,
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
