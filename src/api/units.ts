import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.units
  ? createInsertSchema(schema.units).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.units ? createInsertSchema(schema.units).partial() : z.any();
import { eq, and } from "drizzle-orm";

export const getUnitsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.units)
        .where(eq(schema.units.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateUnitSchema = z.object({
  unit: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1, "Unit name is required"),
      short: z.string().optional().nullable(),
      shortName: z.string().optional().nullable(),
    })
    .passthrough(),
});

export const createUnitFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateUnitSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const unitShort = data.unit.short || data.unit.shortName || data.unit.name.slice(0, 3);
      const inserted = await db
        .insert(schema.units)
        .values({
          id: data.unit.id || uuidv4(),
          organizationId: session.orgId,
          name: data.unit.name,
          short: unitShort,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Unit created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateUnitSchema = z.object({
  id: z.string().min(1, "Unit ID is required"),
  updates: z
    .object({
      name: z.string().optional(),
      short: z.string().optional().nullable(),
      shortName: z.string().optional().nullable(),
    })
    .passthrough(),
});

export const updateUnitFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateUnitSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const updatesObj: Record<string, any> = {};
      if (data.updates.name) updatesObj.name = data.updates.name;
      if (data.updates.short || data.updates.shortName) {
        updatesObj.short = data.updates.short || data.updates.shortName;
      }
      await db
        .update(schema.units)
        .set(updatesObj)
        .where(and(eq(schema.units.id, data.id), eq(schema.units.organizationId, session.orgId)));
      return { success: true, message: "Unit updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteUnitSchema = z.object({
  id: z.string().min(1, "Unit ID is required"),
});

export const deleteUnitFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteUnitSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.units)
        .where(and(eq(schema.units.id, data.id), eq(schema.units.organizationId, session.orgId)));
      return { success: true, message: "Unit deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
