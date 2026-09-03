import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { notDeleted } from "@/lib/soft-delete";

export const getActivityLogFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.activityLog)
        .where(
          and(
            eq(schema.activityLog.organizationId, orgId),
            notDeleted(schema.activityLog.deletedAt),
          ),
        )
        .orderBy(desc(schema.activityLog.timestamp))
        .limit(200);
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createActivityLogFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      log: z
        .object({
          id: z.string().optional(),
          user: z.string().optional(),
          action: z.string().optional(),
          details: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          type: z.string().nullable().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const logEntry = {
        id: data.log?.id || uuidv4(),
        organizationId: orgId,
        user: data.log?.user || "System",
        action: data.log?.action || "Performed action",
        details: data.log?.details || null,
        timestamp: data.log?.createdAt
          ? new Date(data.log.createdAt).toISOString()
          : new Date().toISOString(),
        type: data.log?.type || null,
      };

      await db.insert(schema.activityLog).values(logEntry);
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
