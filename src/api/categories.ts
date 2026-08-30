import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.categories
  ? createInsertSchema(schema.categories).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.categories ? createInsertSchema(schema.categories).partial() : z.any();
import { eq, and } from "drizzle-orm";

export const getCategoriesFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateCategorySchema = z.object({
  category: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1, "Category name is required"),
      color: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
    })
    .passthrough(),
});

export const createCategoryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateCategorySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const inserted = await db
        .insert(schema.categories)
        .values({
          id: data.category.id || uuidv4(),
          name: data.category.name,
          color: data.category.color || "oklch(0.7 0.1 200)",
          icon: data.category.icon || "📦",
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Category created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  updates: z
    .object({
      name: z.string().optional(),
      color: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
    })
    .passthrough(),
});

export const updateCategoryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateCategorySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { organizationId: _omitted, ...safeUpdates } = data.updates;
      await db
        .update(schema.categories)
        .set(safeUpdates as any)
        .where(
          and(
            eq(schema.categories.id, data.id),
            eq(schema.categories.organizationId, session.orgId),
          ),
        );
      return { success: true, message: "Category updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
});

export const deleteCategoryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteCategorySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.categories)
        .where(
          and(
            eq(schema.categories.id, data.id),
            eq(schema.categories.organizationId, session.orgId),
          ),
        );
      return { success: true, message: "Category deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
