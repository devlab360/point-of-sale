import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { authService } from "@/services/auth.service";
import { z } from "zod";
import { requireAuth, createSessionToken } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const LoginSchema = z
  .object({
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .passthrough();

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => LoginSchema.parse(data || {}))
  .handler(async ({ data }) => {
    try {
      const user = await authService.login(data);
      return { success: true, user, message: "Login successful!" };
    } catch (e) {
      return handleApiError(e);
    }
  });

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and, desc } = await import("drizzle-orm");
  return { db, schema, eq, and, desc };
}

export const getOrgDataFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({ orgId: z.string().optional() })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const requestedOrgId = data?.orgId;
      if (requestedOrgId && requestedOrgId !== session.orgId) {
        return { success: false, error: "Unauthorized access to another organization's data" };
      }
      const orgId = requestedOrgId || session.orgId;
      const { db, schema, eq } = await getDb();
      const orgs = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1);
      if (!orgs.length) return { success: false, error: "Org not found" };
      const org = orgs[0];

      const [settings, plans] = await Promise.all([
        db.select().from(schema.settings).where(eq(schema.settings.organizationId, orgId)).limit(1),
        db
          .select()
          .from(schema.saasPlans)
          .where(eq(schema.saasPlans.id, org.currentPlanId))
          .limit(1),
      ]);
      return { success: true, org, settings: settings[0], plan: plans[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const verifyUserEmailFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ email: z.string().email("Valid email required") }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const { db, schema, eq } = await getDb();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email.toLowerCase()))
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
      password: z.string().min(4, "Password must be at least 4 characters long"),
      assignedPlanId: z.string(),
      seedData: z.any().optional(),
      country: z.string().optional(),
      countryCode: z.string().optional(),
      currencyCode: z.string().optional(),
      currencySymbol: z.string().optional(),
      timeZone: z.string().optional(),
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
        country,
        countryCode,
        currencyCode,
        currencySymbol,
        timeZone,
      } = data;

      const { db, schema, eq } = await getDb();

      const existingUsers = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .limit(1);

      if (existingUsers.length > 0) {
        return { success: false, error: "An account with this email already exists." };
      }

      const hashedPin = await bcrypt.hash(password, 10);

      await db.transaction(async (tx) => {
        await tx.insert(schema.organizations).values({
          id: orgId,
          name: companyName,
          ownerEmail: email.toLowerCase(),
          status: "trial",
          currentPlanId: assignedPlanId,
          planExpiryDate: new Date(trialEndsAt).toISOString(),
        });

        await tx.insert(schema.users).values({
          id: ownerId,
          organizationId: orgId,
          name: ownerName,
          email: email.toLowerCase(),
          role: "admin",
          status: "pending_verification",
          lastActive: new Date().toISOString(),
          pin: hashedPin,
          emailVerified: false,
          countryCode: countryCode || "+1",
          timeZone: timeZone || "UTC",
        });

        await tx.insert(schema.settings).values({
          id: uuidv4(),
          organizationId: orgId,
          trialEndsAt: new Date(trialEndsAt).toISOString(),
          subscriptionStatus: "trial",
          currencySymbol: currencySymbol || "$",
          currencyCode: currencyCode || "USD",
          countryCode: countryCode || "+1",
          timeZone: timeZone || "UTC",
          storeName: companyName,
          phone: phone,
          email: email.toLowerCase(),
          headerNote: seedData?.settings?.headerNote || `Welcome to ${companyName}`,
          footerNote: "Thank you for your business!",
          emailReceiptDefault: true,
          printStoreLogo: true,
          config: {
            country: country || "US",
          },
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
        maxAge: 7 * 24 * 60 * 60,
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
      const { db, schema, eq } = await getDb();
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
      const { db, schema, eq } = await getDb();
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
      const { db, schema, eq } = await getDb();
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
  .validator(
    z.object({
      invitationId: z.string(),
      orgId: z.string(),
      name: z.string().min(2),
      email: z.string().email(),
      role: z.string(),
      permissions: z.array(z.string()).optional(),
      pin: z.string().min(4, "Password must be at least 4 characters long"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const email = data.email.toLowerCase();

      const { db, schema, eq } = await getDb();

      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: "A user with this email already exists." };
      }

      const hashedPin = await bcrypt.hash(data.pin, 10);
      await db.transaction(async (tx) => {
        await tx.insert(schema.users).values({
          id: uuidv4(),
          organizationId: data.orgId,
          name: data.name,
          email: data.email.toLowerCase(),
          role: data.role,
          permissions: data.permissions || [],
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

export const sendPasswordResetOtpFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const { db, schema, eq } = await getDb();
      await db
        .update(schema.users)
        .set({ emailVerificationToken: data.code })
        .where(eq(schema.users.email, data.email.toLowerCase()));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      otp: z.string().min(6),
      newPassword: z.string().min(4, "Password must be at least 4 characters long"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { db, schema, eq } = await getDb();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email.toLowerCase()))
        .limit(1);
      if (!users.length) return { success: false, error: "User not found" };

      const user = users[0];

      if (!user.emailVerificationToken || user.emailVerificationToken.trim() !== data.otp?.trim()) {
        return { success: false, error: "Invalid OTP code" };
      }

      const hashedPin = await bcrypt.hash(data.newPassword, 10);
      await db
        .update(schema.users)
        .set({ pin: hashedPin, emailVerificationToken: null })
        .where(eq(schema.users.id, user.id));

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
      const { db, schema, eq } = await getDb();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!users.length) {
        deleteCookie("pos_auth_token", { path: "/" });
        return { success: false, error: "User not found" };
      }

      const { pin: _, ...safeUser } = users[0];
      return { success: true, user: safeUser };
    } catch (e) {
      deleteCookie("pos_auth_token", { path: "/" });
      return handleApiError(e);
    }
  });

export const logoutFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      deleteCookie("pos_auth_token", { path: "/" });
    } catch {}
    return { success: true };
  });

export const checkEmailAvailabilityFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string() }))
  .handler(async ({ data }) => {
    try {
      const email = data.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return { success: true, available: true, message: "Email is available" };
      }
      const result = await authService.checkEmailAvailability(email);
      return { success: true, ...result };
    } catch (e) {
      return { success: true, available: true, message: "Email is available" };
    }
  });

export const sendLoginOtpFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), otp: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { db, schema, eq } = await getDb();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email.toLowerCase()))
        .limit(1);

      if (!users.length) {
        return { success: false, error: "User not found with this email" };
      }

      await db
        .update(schema.users)
        .set({ emailVerificationToken: data.otp })
        .where(eq(schema.users.email, data.email.toLowerCase()));

      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const loginWithOtpFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), otp: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { db, schema, eq } = await getDb();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, data.email.toLowerCase()))
        .limit(1);

      if (!users.length) return { success: false, error: "User not found" };

      const user = users[0];

      if (user.status === "inactive") {
        return {
          success: false,
          error: "Your account is inactive. Please contact the administrator.",
        };
      }
      if (user.status === "suspended") {
        return { success: false, error: "Your account has been suspended." };
      }
      if (user.status === "pending") {
        return { success: false, error: "Your account is pending approval by the administrator." };
      }
      if (user.role !== "admin" && (!user.permissions || user.permissions.length === 0)) {
        return {
          success: false,
          error: "You don't have permission to log in. Please contact the administrator.",
        };
      }

      if (!user.emailVerificationToken || user.emailVerificationToken.trim() !== data.otp?.trim()) {
        return { success: false, error: "Invalid OTP code" };
      }

      await db
        .update(schema.users)
        .set({ emailVerificationToken: null, lastActive: new Date().toISOString() })
        .where(eq(schema.users.id, user.id));

      const token = await createSessionToken({
        userId: user.id,
        orgId: user.organizationId || "",
        role: user.role,
        userName: user.name,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      if (user.organizationId) {
        setCookie("pos_session_org", user.organizationId, {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      const { pin: _, ...safeUser } = user;
      return { success: true, user: safeUser, message: "Login successful!" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const loginWithGoogleFn = createServerFn({ method: "POST" })
  .validator(z.object({ accessToken: z.string() }))
  .handler(async ({ data }) => {
    try {
      const userInfoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${data.accessToken}`,
      );

      if (!userInfoRes.ok) {
        return { success: false, error: "Invalid Google token" };
      }

      const googleUser = await userInfoRes.json();

      if (!googleUser.email || !googleUser.email_verified) {
        return { success: false, error: "Google account does not have a verified email" };
      }

      const email = googleUser.email.toLowerCase();

      const { db, schema, eq } = await getDb();

      let users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      let user = users[0];

      if (!user) {
        const orgId = uuidv4();
        const userId = uuidv4();
        const envDays = process.env.VITE_TRIAL_DAYS;
        const parsedDays = parseInt(envDays || "0", 10);
        const trialDays = isNaN(parsedDays) || parsedDays === 0 ? 7 : parsedDays;
        const trialEndsAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;
        const storeName = (googleUser.name || "Google User") + "'s Store";

        const insertRes = await db.transaction(async (tx) => {
          const plans = await tx
            .select()
            .from(schema.saasPlans)
            .where(eq(schema.saasPlans.isTrialDefault, true))
            .limit(1);
          let assignedPlanId = plans.length > 0 ? plans[0].id : "starter";

          await tx.insert(schema.organizations).values({
            id: orgId,
            name: storeName,
            ownerEmail: email,
            status: "trial",
            currentPlanId: assignedPlanId,
            planExpiryDate: new Date(trialEndsAt).toISOString(),
          });

          const [u] = await tx
            .insert(schema.users)
            .values({
              id: userId,
              organizationId: orgId,
              email: email,
              name: googleUser.name || "Google User",
              role: "admin",
              pin: "1234",
              status: "active",
              emailVerified: true,
              lastActive: new Date().toISOString(),
            })
            .returning();

          await tx.insert(schema.settings).values({
            id: uuidv4(),
            organizationId: orgId,
            trialEndsAt: new Date(trialEndsAt).toISOString(),
            subscriptionStatus: "trial",
            currencySymbol: "₹",
            currencyCode: "INR",
            storeName: storeName,
            email: email,
            headerNote: `Welcome to ${storeName}`,
            footerNote: "Thank you for your business!",
            emailReceiptDefault: true,
            printStoreLogo: true,
          });

          return u;
        });

        user = insertRes;
      }

      if (user.status === "inactive") {
        return {
          success: false,
          error: "Your account is inactive. Please contact the administrator.",
        };
      }
      if (user.status === "suspended") {
        return { success: false, error: "Your account has been suspended by the administrator." };
      }
      if (user.status === "pending") {
        return { success: false, error: "Your account is pending approval by the administrator." };
      }
      if (user.role !== "admin" && (!user.permissions || user.permissions.length === 0)) {
        return {
          success: false,
          error: "You don't have permission to log in. Please contact the administrator.",
        };
      }

      await db
        .update(schema.users)
        .set({ lastActive: new Date().toISOString() })
        .where(eq(schema.users.id, user.id));

      const token = await createSessionToken({
        userId: user.id,
        orgId: user.organizationId || "",
        role: user.role,
        userName: user.name,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      if (user.organizationId) {
        setCookie("pos_session_org", user.organizationId, {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      const { pin: _, ...safeUser } = user;
      return { success: true, user: safeUser, message: "Login successful!" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const loginWithFirebasePhoneFn = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string() }))
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) {
        return { success: false, error: "Firebase API Key is missing on the server" };
      }

      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: data.idToken }),
        },
      );

      if (!res.ok) {
        return { success: false, error: "Invalid Firebase ID Token" };
      }

      const resData = await res.json();
      const firebaseUser = resData.users?.[0];
      const phone = firebaseUser?.phoneNumber;

      if (!phone) {
        return { success: false, error: "No phone number found in token" };
      }

      const { db, schema, eq } = await getDb();

      let users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.phone, phone))
        .limit(1);

      let user = users[0];

      if (!user) {
        const orgId = uuidv4();
        const userId = uuidv4();
        const envDays = process.env.VITE_TRIAL_DAYS;
        const parsedDays = parseInt(envDays || "0", 10);
        const trialDays = isNaN(parsedDays) || parsedDays === 0 ? 7 : parsedDays;
        const trialEndsAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;
        const storeName = "Phone User's Store";

        const insertRes = await db.transaction(async (tx) => {
          const plans = await tx
            .select()
            .from(schema.saasPlans)
            .where(eq(schema.saasPlans.isTrialDefault, true))
            .limit(1);
          let assignedPlanId = plans.length > 0 ? plans[0].id : "starter";

          await tx.insert(schema.organizations).values({
            id: orgId,
            name: storeName,
            ownerEmail: `phoneuser_${Date.now()}@temp.com`,
            status: "trial",
            currentPlanId: assignedPlanId,
            planExpiryDate: new Date(trialEndsAt).toISOString(),
          });

          const [u] = await tx
            .insert(schema.users)
            .values({
              id: userId,
              organizationId: orgId,
              email: `phoneuser_${Date.now()}@temp.com`,
              phone: phone,
              name: "Phone User",
              role: "admin",
              pin: "1234",
              status: "active",
              lastActive: new Date().toISOString(),
            })
            .returning();

          await tx.insert(schema.settings).values({
            id: uuidv4(),
            organizationId: orgId,
            trialEndsAt: new Date(trialEndsAt).toISOString(),
            subscriptionStatus: "trial",
            currencySymbol: "₹",
            currencyCode: "INR",
            storeName: storeName,
            email: `phoneuser_${Date.now()}@temp.com`,
            headerNote: `Welcome to ${storeName}`,
            footerNote: "Thank you for your business!",
            emailReceiptDefault: true,
            printStoreLogo: true,
          });

          return u;
        });

        user = insertRes;
      }

      if (user.status === "inactive") {
        return {
          success: false,
          error: "Your account is inactive. Please contact the administrator.",
        };
      }
      if (user.status === "suspended") {
        return { success: false, error: "Your account has been suspended by the administrator." };
      }
      if (user.status === "pending") {
        return { success: false, error: "Your account is pending approval by the administrator." };
      }
      if (user.role !== "admin" && (!user.permissions || user.permissions.length === 0)) {
        return {
          success: false,
          error: "You don't have permission to log in. Please contact the administrator.",
        };
      }

      await db
        .update(schema.users)
        .set({ lastActive: new Date().toISOString() })
        .where(eq(schema.users.id, user.id));

      const token = await createSessionToken({
        userId: user.id,
        orgId: user.organizationId || "",
        role: user.role,
        userName: user.name,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      if (user.organizationId) {
        setCookie("pos_session_org", user.organizationId, {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      const { pin: _, ...safeUser } = user;
      return { success: true, user: safeUser, message: "Login successful!" };
    } catch (e) {
      return handleApiError(e);
    }
  });
