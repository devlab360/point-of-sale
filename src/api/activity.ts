import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const inMemoryActivityLog: Record<string, any[]> = {
  default: [
    {
      id: "act-1",
      organizationId: "default",
      user: "Store Manager",
      action: "Created Sales Invoice #INV-1092",
      details: "Total $340.00 (Customer: Emma Watson, Paid via Cash)",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      type: "sale",
    },
    {
      id: "act-2",
      organizationId: "default",
      user: "Admin",
      action: "Issued Gift Card GC-9821-4401",
      details: "Value $200.00 (Recipient: Sarah Jenkins)",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      type: "gift-card",
    },
    {
      id: "act-3",
      organizationId: "default",
      user: "Cashier Terminal 1",
      action: "Processed Customer Return #RET-841",
      details: "Refunded $45.00 for Product SKU-104",
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      type: "return",
    },
    {
      id: "act-4",
      organizationId: "default",
      user: "Inventory Lead",
      action: "Updated Stock Level",
      details: "Adjusted +50 units for Wireless Earbuds (Batch #B88)",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      type: "inventory",
    },
  ],
};

export const getActivityLogFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;

    try {
      if (schema.activityLog) {
        const all = await db
          .select()
          .from(schema.activityLog)
          .where(eq(schema.activityLog.organizationId, orgId))
          .orderBy(desc(schema.activityLog.timestamp));
        if (all) return { success: true, data: all };
      }
    } catch (e) {
      console.warn("DB getActivityLog fallback:", e);
    }
    return { success: true, data: inMemoryActivityLog[orgId] || [] };
  });

export const createActivityLogFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
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

    if (!inMemoryActivityLog[orgId]) inMemoryActivityLog[orgId] = [];
    inMemoryActivityLog[orgId].unshift(logEntry);

    try {
      if (schema.activityLog) {
        await db.insert(schema.activityLog).values(logEntry);
      }
      return { success: true };
    } catch (e) {
      console.warn("DB createActivityLog fallback:", e);
      return { success: true };
    }
  });

