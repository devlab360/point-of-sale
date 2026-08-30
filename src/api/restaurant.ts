import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

// ---------------- Tables API ----------------

const inMemoryTables: Record<string, any[]> = {
  default: [
    { id: "tbl-1", organizationId: "default", name: "Table 1 (Window)", capacity: 4, status: "available" },
    { id: "tbl-2", organizationId: "default", name: "Table 2 (Main Hall)", capacity: 6, status: "occupied" },
    { id: "tbl-3", organizationId: "default", name: "Table 3 (Corner Booth)", capacity: 2, status: "reserved" },
    { id: "tbl-4", organizationId: "default", name: "Table 4 (Outdoor Patio)", capacity: 4, status: "available" },
    { id: "tbl-5", organizationId: "default", name: "Table 5 (VIP Family)", capacity: 8, status: "available" },
  ],
};

export const getTablesFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;

    try {
      if (schema.restaurantTables) {
        const res = await db
          .select()
          .from(schema.restaurantTables)
          .where(eq(schema.restaurantTables.organizationId, orgId));
        if (res) return { success: true, data: res };
      }
    } catch (e) {
      console.warn("DB getTables fallback:", e);
    }
    return { success: true, data: inMemoryTables[orgId] || [] };
  });

export const createTableFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      capacity: z.number().int().positive().default(4),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    const id = data.id || uuidv4();
    const newTbl = {
      id,
      organizationId: orgId,
      name: data.name,
      capacity: data.capacity,
      status: "available",
    };

    if (!inMemoryTables[orgId]) inMemoryTables[orgId] = [];
    inMemoryTables[orgId].unshift(newTbl);

    try {
      if (schema.restaurantTables) {
        const res = await db
          .insert(schema.restaurantTables)
          .values(newTbl)
          .returning();
        return { success: true, data: res[0] || newTbl };
      }
    } catch (e) {
      console.warn("DB createTable fallback:", e);
    }
    return { success: true, data: newTbl };
  });

export const updateTableStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["available", "occupied", "reserved"]),
      currentOrderId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryTables[orgId]) {
      const tbl = inMemoryTables[orgId].find((t) => t.id === data.id);
      if (tbl) {
        tbl.status = data.status;
        tbl.currentOrderId = data.currentOrderId || null;
      }
    }

    try {
      if (schema.restaurantTables) {
        const res = await db
          .update(schema.restaurantTables)
          .set({
            status: data.status,
            currentOrderId: data.currentOrderId,
          })
          .where(
            and(
              eq(schema.restaurantTables.id, data.id),
              eq(schema.restaurantTables.organizationId, orgId),
            ),
          )
          .returning();
        return { success: true, data: res[0] };
      }
    } catch (e) {
      console.warn("DB updateTableStatus fallback:", e);
    }
    return { success: true };
  });

export const deleteTableFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryTables[orgId]) {
      inMemoryTables[orgId] = inMemoryTables[orgId].filter((t) => t.id !== data.id);
    }

    try {
      if (schema.restaurantTables) {
        await db
          .delete(schema.restaurantTables)
          .where(and(eq(schema.restaurantTables.id, data.id), eq(schema.restaurantTables.organizationId, orgId)));
      }
    } catch (e) {
      console.warn("DB deleteTable fallback:", e);
    }
    return { success: true };
  });


// ---------------- KOT API ----------------

export const getKOTsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.kitchenOrderTickets)
        .where(eq(schema.kitchenOrderTickets.organizationId, session.orgId))
        .orderBy(desc(schema.kitchenOrderTickets.timestamp));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createKOTFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tableId: z.string().optional(),
      items: z.array(z.any()),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const id = uuidv4();
      const res = await db
        .insert(schema.kitchenOrderTickets)
        .values({
          id,
          organizationId: session.orgId,
          tableId: data.tableId || null,
          waiterId: session.userId,
          items: data.items,
          status: "pending",
          note: data.note,
        })
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateKOTStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["pending", "preparing", "ready", "served"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const res = await db
        .update(schema.kitchenOrderTickets)
        .set({ status: data.status })
        .where(
          and(
            eq(schema.kitchenOrderTickets.id, data.id),
            eq(schema.kitchenOrderTickets.organizationId, session.orgId),
          ),
        )
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });
