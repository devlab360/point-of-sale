import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export const getNotificationsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.organizationId, orgId))
        .orderBy(desc(schema.notifications.timestamp))
        .limit(100);
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .validator(
    z.union([
      z.object({ id: z.string() }),
      z.string(),
    ]),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const targetId = typeof data === "string" ? data : (data as any).id;

      if (!targetId) return { success: true };

      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(
          and(
            eq(schema.notifications.id, targetId),
            eq(schema.notifications.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ids: z.array(z.string()).optional(),
    }).optional().default({}),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      if (data?.ids && Array.isArray(data.ids) && data.ids.length > 0) {
        await db
          .update(schema.notifications)
          .set({ read: true })
          .where(
            and(
              inArray(schema.notifications.id, data.ids),
              eq(schema.notifications.organizationId, orgId),
            ),
          );
      } else {
        await db
          .update(schema.notifications)
          .set({ read: true })
          .where(eq(schema.notifications.organizationId, orgId));
      }
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createNotificationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      notification: z
        .object({
          id: z.string().optional(),
          title: z.string().optional(),
          message: z.string().optional(),
          type: z.string().optional(),
          read: z.boolean().optional(),
          link: z.string().nullable().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const newNotif = {
        id: data.notification?.id || uuidv4(),
        organizationId: orgId,
        title: data.notification?.title || "System Alert",
        message: data.notification?.message || "",
        timestamp: new Date().toISOString(),
        type: data.notification?.type || "info",
        read: false,
        link: data.notification?.link || null,
      };

      await db.insert(schema.notifications).values(newNotif);
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
