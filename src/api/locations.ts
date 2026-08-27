import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const getLocationsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateLocationSchema = z.object({
  location: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1, "Location name is required"),
      type: z.string().optional().default("store"),
      status: z.string().optional().default("active"),
    })
    .passthrough(),
});

export const createLocationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateLocationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const inserted = await db
        .insert(schema.locations)
        .values({
          id: data.location.id || uuidv4(),
          name: data.location.name,
          type: data.location.type || "store",
          status: data.location.status || "active",
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Location created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateLocationSchema = z.object({
  id: z.string().min(1, "Location ID is required"),
  updates: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
    })
    .passthrough(),
});

export const updateLocationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateLocationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .update(schema.locations)
        .set(data.updates as any)
        .where(
          and(eq(schema.locations.id, data.id), eq(schema.locations.organizationId, session.orgId)),
        );
      return { success: true, message: "Location updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteLocationSchema = z.object({
  id: z.string().min(1, "Location ID is required"),
});

export const deleteLocationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteLocationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.locations)
        .where(
          and(eq(schema.locations.id, data.id), eq(schema.locations.organizationId, session.orgId)),
        );
      return { success: true, message: "Location deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
