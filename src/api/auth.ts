import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { createSessionToken, requireAuth } from "@/lib/auth-utils";

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      let user: any = null;

      if (data.email && data.password) {
        const users = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, data.email))
          .limit(1);
        if (users.length > 0) {
          const u = users[0];
          // Backward compatibility check for plain-text or hashed
          const isMatch = u.pin?.startsWith("$2")
            ? await bcrypt.compare(data.password, u.pin)
            : u.pin === data.password;

          if (isMatch) user = u;
        }
      } else if (data.pin) {
        // Require orgId to prevent cross-tenant PIN auth bypass
        if (!data.orgId) {
          return { success: false, error: "Organization context required for PIN login" };
        }
        const users = await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.pin, data.pin), eq(schema.users.organizationId, data.orgId)))
          .limit(1);
        if (users.length > 0) user = users[0];
      }

      if (user) {
        // Create JWT — include userName so activity logs show real names
        const token = await createSessionToken({
          userId: user.id,
          orgId: user.organizationId || "",
          role: user.role,
          userName: user.name,
        });

        // Set HTTP-only cookie
        setCookie("pos_auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        // Also set the old cookie for backward compatibility until frontend is fully migrated
        if (user.organizationId) {
          setCookie("pos_session_org", user.organizationId, {
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          });
        }

        await db
          .update(schema.users)
          .set({ lastActive: new Date().toISOString() })
          .where(eq(schema.users.id, user.id));

        const { pin: _, ...safeUser } = user;
        return { success: true, user: safeUser, message: "Login successful!" };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getOrgDataFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      // C-3 fix: Require authentication. Verify requested orgId matches session orgId.
      const session = await requireAuth();
      const requestedOrgId = data.orgId;
      if (requestedOrgId && requestedOrgId !== session.orgId) {
        // SuperAdmin can view any org
        const sessionUser = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .limit(1);
        const isSuperAdmin = sessionUser[0]?.email?.toLowerCase().includes("superadmin");
        if (!isSuperAdmin) {
          return { success: false, error: "Unauthorized" };
        }
      }
      const orgId = requestedOrgId || session.orgId;
      const orgs = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1);
      if (!orgs.length) return { success: false, error: "Org not found" };
      const org = orgs[0];

      const settings = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.organizationId, orgId))
        .limit(1);
      const plans = await db
        .select()
        .from(schema.saasPlans)
        .where(eq(schema.saasPlans.id, org.currentPlanId))
        .limit(1);
      return { success: true, org, settings: settings[0], plan: plans[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const verifyUserEmailFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email))
        .limit(1);
      if (!users.length) return { success: false, error: "User not found" };

      const user = users[0];
      const orgId = user.organizationId;

      let org: typeof schema.organizations.$inferSelect | null = null;
      let orgSettings: typeof schema.settings.$inferSelect | null = null;
      let plan: typeof schema.saasPlans.$inferSelect | null = null;
      if (orgId) {
        const orgs = await db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, orgId))
          .limit(1);
        if (orgs.length > 0) {
          org = orgs[0];
          const plans = await db
            .select()
            .from(schema.saasPlans)
            .where(eq(schema.saasPlans.id, org.currentPlanId))
            .limit(1);
          plan = plans[0];
        }
        const settings = await db
          .select()
          .from(schema.settings)
          .where(eq(schema.settings.organizationId, orgId))
          .limit(1);
        orgSettings = settings[0];
      }

      // DO NOT RETURN PIN OR PASSWORDS to frontend
      const { pin: _, ...safeUser } = user;

      return {
        success: true,
        data: {
          user: safeUser,
          organization: org,
          settings: orgSettings,
          plans: plan ? [plan] : [],
        },
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const registerOrgFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orgId: z.string().uuid(),
      ownerId: z.string().uuid(),
      trialEndsAt: z.number(),
      companyName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      ownerName: z.string().min(2),
      password: z.string().min(4),
      assignedPlanId: z.string(),
      seedData: z.any().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const {
        orgId,
        ownerId,
        trialEndsAt,
        companyName,
        email,
        phone,
        ownerName,
        password,
        assignedPlanId,
        seedData,
      } = data;
      const hashedPin = await bcrypt.hash(password, 10);

      await db.transaction(async (tx) => {
        await tx.insert(schema.organizations).values({
          id: orgId,
          name: companyName,
          ownerEmail: email,
          status: "trial",
          currentPlanId: assignedPlanId,
          planExpiryDate: new Date(trialEndsAt).toISOString(),
        });

        await tx.insert(schema.users).values({
          id: ownerId,
          organizationId: orgId,
          name: ownerName,
          email: email,
          role: "admin",
          status: "pending_verification",
          lastActive: new Date().toISOString(),
          pin: hashedPin,
          emailVerified: false,
        });

        await tx.insert(schema.settings).values({
          id: uuidv4(),
          organizationId: orgId,
          trialEndsAt: new Date(trialEndsAt).toISOString(),
          subscriptionStatus: "trial",
          currencySymbol: "$",
          currencyCode: "USD",
          storeName: companyName,
          phone: phone,
          email: email,
          headerNote: seedData?.settings?.headerNote || `Welcome to ${companyName}`,
          footerNote: "Thank you for your business!",
          emailReceiptDefault: true,
          printStoreLogo: true,
        });

        if (seedData) {
          if (seedData.categories?.length) {
            await tx
              .insert(schema.categories)
              .values(seedData.categories.map((c: any) => ({ ...c, organizationId: orgId })));
          }
          if (seedData.units?.length) {
            await tx
              .insert(schema.units)
              .values(seedData.units.map((u: any) => ({ ...u, organizationId: orgId })));
          }
        }
      });

      const token = await createSessionToken({
        userId: ownerId,
        orgId: orgId,
        role: "admin",
        userName: ownerName,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return { success: true, message: "Registration successful!" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const sendVerificationOtpFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      await db
        .update(schema.users)
        .set({ emailVerificationToken: data.code })
        .where(eq(schema.users.id, data.userId));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const verifyOtpFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, data.userId))
        .limit(1);
      if (!users.length) return { success: false, error: "User not found" };
      const user = users[0];

      if (user.emailVerificationToken?.trim() === data.otp.trim()) {
        const trialEndsAt = new Date(
          Date.now() + data.trialDays * 24 * 60 * 60 * 1000,
        ).toISOString();

        await db
          .update(schema.users)
          .set({ emailVerified: true, status: "active" })
          .where(eq(schema.users.id, data.userId));

        if (user.organizationId) {
          await db
            .update(schema.settings)
            .set({ trialEndsAt, subscriptionStatus: "trial" })
            .where(eq(schema.settings.organizationId, user.organizationId));

          await db
            .update(schema.organizations)
            .set({ planExpiryDate: trialEndsAt })
            .where(eq(schema.organizations.id, user.organizationId));
        }

        return { success: true };
      }
      return { success: false, error: "Invalid OTP" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getInvitationFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const invs = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.token, data.token))
        .limit(1);
      if (!invs.length) return { success: false, error: "Invitation not found" };
      return { success: true, data: invs[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const acceptInvitationFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const hashedPin = await bcrypt.hash(data.pin, 10);
      await db.transaction(async (tx) => {
        await tx.insert(schema.users).values({
          id: uuidv4(),
          organizationId: data.orgId,
          name: data.name,
          email: data.email,
          role: data.role,
          status: "pending",
          lastActive: new Date().toISOString(),
          pin: hashedPin,
          emailVerified: true,
        });

        await tx
          .update(schema.invitations)
          .set({ status: "accepted" })
          .where(eq(schema.invitations.id, data.invitationId));
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email))
        .limit(1);
      if (!users.length) return { success: false, error: "User not found" };

      const hashedPin = await bcrypt.hash(data.newPassword, 10);
      await db.update(schema.users).set({ pin: hashedPin }).where(eq(schema.users.id, users[0].id));

      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getCurrentUserFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!users.length) return { success: false, error: "User not found" };

      const { pin: _, ...safeUser } = users[0];
      return { success: true, user: safeUser };
    } catch (e) {
      return handleApiError(e);
    }
  });
