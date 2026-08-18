import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

// ---------------- Tables API ----------------

export const getTablesFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.restaurantTables)
        .where(eq(schema.restaurantTables.organizationId, session.orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createTableFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1),
      capacity: z.number().int().positive().default(4),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const id = uuidv4();
      const res = await db
        .insert(schema.restaurantTables)
        .values({
          id,
          organizationId: session.orgId,
          name: data.name,
          capacity: data.capacity,
          status: "available",
        })
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
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
    try {
      const session = await requireAuth();
      const res = await db
        .update(schema.restaurantTables)
        .set({
          status: data.status,
          currentOrderId: data.currentOrderId,
        })
        .where(
          and(
            eq(schema.restaurantTables.id, data.id),
            eq(schema.restaurantTables.organizationId, session.orgId),
          ),
        )
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
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
