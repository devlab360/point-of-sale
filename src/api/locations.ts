import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { assertBranchLimit } from "@/lib/plan-limits";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { notDeleted } from "@/lib/soft-delete";

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  return { db, schema, eq, and };
}

export const getLocationsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const { db, schema, eq, and } = await getDb();
      const res = await db
        .select()
        .from(schema.locations)
        .where(
          and(eq(schema.locations.organizationId, orgId), notDeleted(schema.locations.deletedAt)),
        );
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
      code: z.string().optional(),
      industryType: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      managerName: z.string().optional(),
      isHeadOffice: z.boolean().optional(),
    })
    .passthrough(),
});

export const createLocationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateLocationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await assertBranchLimit(orgId);

      const { db, schema, eq, and } = await getDb();

      const existing = await db
        .select()
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.organizationId, orgId),
            data.location.code ? eq(schema.locations.code, data.location.code) : undefined,
            notDeleted(schema.locations.deletedAt),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        return { success: false, error: "Location with this code already exists" };
      }

      const newId = data.location.id || uuidv4();
      const inserted = await db
        .insert(schema.locations)
        .values({
          id: newId,
          organizationId: orgId,
          name: data.location.name,
          type: data.location.type,
          status: data.location.status,
          code: data.location.code,
          industryType: data.location.industryType,
          address: data.location.address,
          city: data.location.city,
          phone: data.location.phone,
          email: data.location.email,
          managerName: data.location.managerName,
          isHeadOffice: data.location.isHeadOffice,
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
      code: z.string().optional(),
      industryType: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      managerName: z.string().optional(),
      isHeadOffice: z.boolean().optional(),
    })
    .passthrough(),
});

export const updateLocationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateLocationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq, and } = await getDb();

      if (data.updates.code) {
        const existing = await db
          .select()
          .from(schema.locations)
          .where(
            and(
              eq(schema.locations.organizationId, session.orgId),
              eq(schema.locations.code, data.updates.code),
              notDeleted(schema.locations.deletedAt),
            ),
          )
          .limit(1);
        if (existing.length > 0 && existing[0].id !== data.id) {
          return { success: false, error: "Location with this code already exists" };
        }
      }

      const now = new Date().toISOString();
      const updatesObj: Record<string, any> = { updatedAt: now };

      for (const key of [
        "name",
        "type",
        "status",
        "code",
        "industryType",
        "address",
        "city",
        "phone",
        "email",
        "managerName",
        "isHeadOffice",
      ]) {
        if (data.updates[key] !== undefined) updatesObj[key] = data.updates[key];
      }

      await db
        .update(schema.locations)
        .set(updatesObj)
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
      const { db, schema, eq, and } = await getDb();
      await db
        .update(schema.locations)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(eq(schema.locations.id, data.id), eq(schema.locations.organizationId, session.orgId)),
        );
      return { success: true, message: "Location deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
