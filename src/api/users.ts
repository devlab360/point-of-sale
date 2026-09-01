import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth, requireAdmin, invalidateUserSessionCache } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { assertUserLimit } from "@/lib/plan-limits";
import { getEffectiveMenusFn } from "@/api/subscriptions";

const UserInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    role: z.string().min(1, "Role is required"),
    status: z.string().optional().default("active"),
    pin: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
        "Password must contain uppercase, lowercase, number and special character",
      )
      .optional()
      .or(z.literal("")),
    avatar: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    permissions: z.array(z.string()).optional(),
    commissionRate: z
      .union([z.string(), z.number()])
      .transform((v) => String(v))
      .nullable()
      .optional(),
    monthlyTarget: z
      .union([z.string(), z.number()])
      .transform((v) => String(v))
      .nullable()
      .optional(),
    locationIds: z.array(z.string()).optional(),
  })
  .passthrough();

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and, inArray } = await import("drizzle-orm");
  return { db, schema, eq, and, inArray };
}

// Fetch the branch (location) ids a user is assigned to within an org.
async function fetchUserLocationIds(orgId: string, userId: string): Promise<string[]> {
  const { db, schema, eq, and } = await getDb();
  const rows = await db
    .select({ locationId: schema.userBranches.locationId })
    .from(schema.userBranches)
    .where(
      and(eq(schema.userBranches.organizationId, orgId), eq(schema.userBranches.userId, userId)),
    );
  return rows.map((r) => r.locationId);
}

// Filter a requested branch id list to only those belonging to the given org.
// Returns null if the requested list contains a branch outside the org.
async function validateOrgLocations(
  orgId: string,
  locationIds: string[],
): Promise<string[] | null> {
  if (!locationIds || locationIds.length === 0) return [];
  const { db, schema, eq, and, inArray } = await getDb();
  const orgLocations = await db
    .select({ id: schema.locations.id })
    .from(schema.locations)
    .where(
      and(eq(schema.locations.organizationId, orgId), inArray(schema.locations.id, locationIds)),
    );
  const valid = orgLocations.map((l) => l.id);
  if (valid.length !== new Set(locationIds).size) return null;
  return valid;
}

// Replace a user's branch assignments (junction rows) and keep the single
// `locationId` column in sync with the default branch (first item).
async function replaceUserLocations(
  orgId: string,
  userId: string,
  locationIds: string[],
): Promise<void> {
  const { db, schema, eq, and } = await getDb();
  await db
    .delete(schema.userBranches)
    .where(
      and(eq(schema.userBranches.organizationId, orgId), eq(schema.userBranches.userId, userId)),
    );

  let idx = 0;
  for (const locationId of locationIds) {
    await db.insert(schema.userBranches).values({
      id: `${userId}-${locationId}-${uuidv4().slice(0, 8)}`,
      organizationId: orgId,
      userId,
      locationId,
      isDefault: idx === 0,
      createdAt: new Date().toISOString(),
    });
    idx++;
  }

  await db
    .update(schema.users)
    .set({ locationId: locationIds[0] || null })
    .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, orgId)));
}

export const getUsersFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const { db, schema, eq } = await getDb();
      const res = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.organizationId, session.orgId));

      const assignments = await db
        .select({ userId: schema.userBranches.userId, locationId: schema.userBranches.locationId })
        .from(schema.userBranches)
        .where(eq(schema.userBranches.organizationId, session.orgId));
      const locationIdsByUser = new Map<string, string[]>();
      for (const a of assignments) {
        const list = locationIdsByUser.get(a.userId) || [];
        list.push(a.locationId);
        locationIdsByUser.set(a.userId, list);
      }

      const safeUsers = res.map(({ pin, ...u }) => ({
        ...u,
        locationIds: locationIdsByUser.get(u.id) || [],
      }));
      return { success: true, data: safeUsers };
    } catch (e) {
      return handleApiError(e);
    }
  });

const GetUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const getUserFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetUserSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { db, schema, eq, and } = await getDb();
      const res = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)))
        .limit(1);
      if (!res.length) return { success: false, error: "Not found" };

      const locationIds = await fetchUserLocationIds(session.orgId, data.id);
      const { pin, ...safeUser } = res[0];
      return { success: true, data: { ...safeUser, locationIds } };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateUserSchema = z.object({
  user: UserInputSchema,
});

export const createUserFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateUserSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();

      if (!session.orgId) return { success: false, error: "Unauthorized" };
      await assertUserLimit(session.orgId);

      const { db, schema, eq } = await getDb();

      const email = data.user.email.toLowerCase();

      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: "A user with this email already exists." };
      }

      let pin = data.user.pin;
      if (pin) pin = await bcrypt.hash(pin, 10);

      let filteredPermissions = data.user.permissions as string[] | undefined;
      if (filteredPermissions && filteredPermissions.length > 0) {
        const menusRes = await getEffectiveMenusFn({ data: {} });
        if (menusRes.success && !menusRes.menus.includes("all")) {
          filteredPermissions = filteredPermissions.filter((p) => {
            const cleanP = p.replace(/^\//, "").split("/")[0].split(".")[0];
            return menusRes.menus.some((m: string) => {
              const cleanM = m.replace(/^\//, "");
              return cleanM === cleanP || cleanM === "all" || p === m || p.startsWith(m + "/");
            });
          });
        }
      }

      const { locationIds, ...userRest } = data.user;
      const validLocationIds = await validateOrgLocations(session.orgId, locationIds || []);
      if (validLocationIds === null) {
        return { success: false, error: "One or more selected branches are invalid." };
      }

      const userId = data.user.id || uuidv4();
      const inserted = await db
        .insert(schema.users)
        .values({
          id: userId,
          ...userRest,
          email,
          pin,
          permissions: filteredPermissions,
          organizationId: session.orgId,
          locationId: validLocationIds[0] || null,
        })
        .returning();

      if (validLocationIds.length > 0) {
        await replaceUserLocations(session.orgId, userId, validLocationIds);
      }

      const { pin: _, ...safeUser } = inserted[0];
      return {
        success: true,
        data: { ...safeUser, locationIds: validLocationIds },
        message: "User created successfully",
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  updates: UserInputSchema.partial(),
});

export const updateUserFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateUserSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      if (session.role !== "admin" && session.userId !== data.id)
        return { success: false, error: "Forbidden" };

      const { db, schema, eq, and } = await getDb();

      const { locationIds, ...updatesRest } = data.updates;
      let updateData = { ...updatesRest };

      let newLocationIds: string[] | null | undefined = undefined;
      if (locationIds !== undefined) {
        newLocationIds = await validateOrgLocations(session.orgId, locationIds);
        if (newLocationIds === null) {
          return { success: false, error: "One or more selected branches are invalid." };
        }
      }

      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
        const existingUser = await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.email, updateData.email)))
          .limit(1);

        if (existingUser.length > 0 && existingUser[0].id !== data.id) {
          return { success: false, error: "A user with this email already exists." };
        }
      }

      if (updateData.permissions && Array.isArray(updateData.permissions)) {
        const menusRes = await getEffectiveMenusFn({ data: {} });
        if (menusRes.success && !menusRes.menus.includes("all")) {
          updateData.permissions = updateData.permissions.filter((p: string) => {
            const cleanP = p.replace(/^\//, "").split("/")[0].split(".")[0];
            return menusRes.menus.some((m: string) => {
              const cleanM = m.replace(/^\//, "");
              return cleanM === cleanP || cleanM === "all" || p === m || p.startsWith(m + "/");
            });
          });
        }
      }

      if (updateData.pin) {
        updateData.pin = await bcrypt.hash(updateData.pin, 10);
      }

      if (newLocationIds !== undefined) {
        updateData.locationId = newLocationIds[0] || null;
      }

      await db
        .update(schema.users)
        .set(updateData)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)));

      if (newLocationIds !== undefined) {
        await replaceUserLocations(session.orgId, data.id, newLocationIds);
      }

      invalidateUserSessionCache(data.id);
      return { success: true, message: "User updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const deleteUserFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteUserSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      const { db, schema, eq, and } = await getDb();

      await db
        .delete(schema.users)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)));
      invalidateUserSessionCache(data.id);
      return { success: true, message: "User deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createInvitationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      invitation: z
        .object({
          id: z.string().optional(),
          token: z.string().optional(),
          email: z.string().optional(),
          role: z.string(),
          permissions: z.array(z.string()).optional(),
          expiresAt: z.string().optional(),
        })
        .passthrough(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      const { db, schema } = await getDb();
      const token = data.invitation.token || uuidv4();
      const expiresAt =
        data.invitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const inserted = await db
        .insert(schema.invitations)
        .values({
          id: data.invitation.id || uuidv4(),
          token,
          role: data.invitation.role,
          email: data.invitation.email,
          permissions: data.invitation.permissions || [],
          expiresAt,
          organizationId: session.orgId,
        } as any)
        .returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });
