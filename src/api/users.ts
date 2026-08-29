import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
  })
  .passthrough();

export const getUsersFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.organizationId, session.orgId));

      const safeUsers = res.map(({ pin, ...u }) => u);
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
      const res = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)))
        .limit(1);
      if (!res.length) return { success: false, error: "Not found" };

      const { pin, ...safeUser } = res[0];
      return { success: true, data: safeUser };
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

      const email = data.user.email.toLowerCase();

      // Enforce globally unique emails
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
          // Keep permissions that match allowed plan menus
          filteredPermissions = filteredPermissions.filter((p) => {
            const cleanP = p.replace(/^\//, "").split("/")[0].split(".")[0];
            return menusRes.menus.some((m: string) => {
              const cleanM = m.replace(/^\//, "");
              return cleanM === cleanP || cleanM === "all" || p === m || p.startsWith(m + "/");
            });
          });
        }
      }

      const inserted = await db
        .insert(schema.users)
        .values({
          id: data.user.id || uuidv4(),
          ...data.user,
          email,
          pin,
          permissions: filteredPermissions,
          organizationId: session.orgId,
        })
        .returning();

      const { pin: _, ...safeUser } = inserted[0];
      return { success: true, data: safeUser, message: "User created successfully" };
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

      let updateData = { ...data.updates };

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

      await db
        .update(schema.users)
        .set(updateData)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)));
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
      const token = data.invitation.token || uuidv4();
      const expiresAt = data.invitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
