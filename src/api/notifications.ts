import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.notifications
  ? createInsertSchema(schema.notifications).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.notifications
  ? createInsertSchema(schema.notifications).partial()
  : z.any();
import { eq, inArray, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getNotificationsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      // L-3 fix: Order by newest first and limit to 100 to prevent unbounded queries
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
  .validator(z.any() as any)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(
          and(eq(schema.notifications.id, data.id), eq(schema.notifications.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .validator(z.any() as any)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      if (data.ids.length > 0) {
        await db
          .update(schema.notifications)
          .set({ read: true })
          .where(
            and(
              inArray(schema.notifications.id, data.ids),
              eq(schema.notifications.organizationId, orgId),
            ),
          );
      }
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createNotificationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .insert(schema.notifications)
        .values({ ...data.notification, organizationId: session.orgId });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
