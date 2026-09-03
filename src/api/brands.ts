import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.brands
  ? createInsertSchema(schema.brands).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.brands ? createInsertSchema(schema.brands).partial() : z.any();
import { eq, and } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";

export const getBrandsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.brands)
        .where(and(eq(schema.brands.organizationId, orgId), notDeleted(schema.brands.deletedAt)));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateBrandSchema = z.object({
  brand: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1, "Brand name is required"),
      products: z.number().optional().nullable(),
    })
    .passthrough(),
});

export const createBrandFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateBrandSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const inserted = await db
        .insert(schema.brands)
        .values({
          id: data.brand.id || uuidv4(),
          name: data.brand.name,
          products: data.brand.products || 0,
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Brand created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateBrandSchema = z.object({
  id: z.string().min(1, "Brand ID is required"),
  updates: z
    .object({
      name: z.string().optional(),
      products: z.number().optional().nullable(),
    })
    .passthrough(),
});

export const updateBrandFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateBrandSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { organizationId: _omitted, ...safeUpdates } = data.updates;
      const updated = await db
        .update(schema.brands)
        .set(safeUpdates as any)
        .where(and(eq(schema.brands.id, data.id), eq(schema.brands.organizationId, session.orgId)))
        .returning();
      return { success: true, data: updated[0], message: "Brand updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteBrandSchema = z.object({
  id: z.string().min(1, "Brand ID is required"),
});

export const deleteBrandFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteBrandSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .update(schema.brands)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.brands.id, data.id), eq(schema.brands.organizationId, session.orgId)));
      return { success: true, message: "Brand deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
