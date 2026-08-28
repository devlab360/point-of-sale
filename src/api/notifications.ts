import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const inMemoryNotifications: Record<string, any[]> = {
  default: [
    {
      id: "notif-1",
      organizationId: "default",
      title: "Low Stock Alert: Wireless Headset",
      message: "Only 2 units remaining in stock. Threshold is 5 units.",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      type: "warning",
      read: false,
      link: "/inventory",
    },
    {
      id: "notif-2",
      organizationId: "default",
      title: "Payment Received: $340.00",
      message: "Customer Emma Watson settled invoice #INV-1092 in full.",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      type: "success",
      read: false,
      link: "/sales",
    },
    {
      id: "notif-3",
      organizationId: "default",
      title: "Khata Credit Due Tomorrow",
      message: "Apex Media Works has an overdue balance of $520.00.",
      timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
      type: "info",
      read: true,
      link: "/customers",
    },
  ],
};

export const getNotificationsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.notifications) {
        const all = await db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.organizationId, orgId))
          .orderBy(desc(schema.notifications.timestamp))
          .limit(100);
        if (all && all.length > 0) return { success: true, data: all };
      }
    } catch (e) {
      console.warn("DB getNotifications fallback:", e);
    }
    return { success: true, data: inMemoryNotifications[orgId] || inMemoryNotifications["default"] || [] };
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    const targetId = data?.id || data;

    // Update in-memory fallback stores
    for (const key of [orgId, "default"]) {
      if (inMemoryNotifications[key]) {
        const item = inMemoryNotifications[key].find((n) => n.id === targetId);
        if (item) item.read = true;
      }
    }

    try {
      if (schema.notifications && targetId) {
        await db
          .update(schema.notifications)
          .set({ read: true })
          .where(
            and(eq(schema.notifications.id, targetId), eq(schema.notifications.organizationId, orgId)),
          );
      }
      return { success: true };
    } catch (e) {
      console.warn("DB markNotificationRead fallback:", e);
      return { success: true };
    }
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    // Update in-memory fallback stores
    for (const key of [orgId, "default"]) {
      if (inMemoryNotifications[key]) {
        inMemoryNotifications[key].forEach((n) => {
          n.read = true;
        });
      }
    }

    try {
      if (schema.notifications) {
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
      }
      return { success: true };
    } catch (e) {
      console.warn("DB markAllNotificationsRead fallback:", e);
      return { success: true };
    }
  });

export const createNotificationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

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

    if (!inMemoryNotifications[orgId]) inMemoryNotifications[orgId] = [];
    inMemoryNotifications[orgId].unshift(newNotif);

    try {
      if (schema.notifications) {
        await db
          .insert(schema.notifications)
          .values(newNotif);
      }
      return { success: true };
    } catch (e) {
      console.warn("DB createNotification fallback:", e);
      return { success: true };
    }
  });

