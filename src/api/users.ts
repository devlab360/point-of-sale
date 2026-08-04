import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const UserInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    role: z.string().min(1, "Role is required"),
    status: z.string().optional().default("active"),
    pin: z.string().optional(),
    avatar: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    commissionRate: z.string().nullable().optional(),
    monthlyTarget: z.string().nullable().optional(),
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

      let pin = data.user.pin;
      if (pin) pin = await bcrypt.hash(pin, 10);

      const inserted = await db
        .insert(schema.users)
        .values({
          id: data.user.id || uuidv4(),
          ...data.user,
          pin,
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
      if (updateData.pin) {
        updateData.pin = await bcrypt.hash(updateData.pin, 10);
      }

      await db
        .update(schema.users)
        .set(updateData)
        .where(and(eq(schema.users.id, data.id), eq(schema.users.organizationId, session.orgId)));
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
          token: z.string(),
          role: z.string(),
          permissions: z.array(z.string()).optional(),
          expiresAt: z.string(),
        })
        .passthrough(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();

      const inserted = await db
        .insert(schema.invitations)
        .values({
          id: data.invitation.id || uuidv4(),
          ...data.invitation,
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });
