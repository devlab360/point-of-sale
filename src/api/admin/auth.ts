import { createServerFn } from "@tanstack/react-start";
import { setCookie, getCookie, deleteCookie } from "@tanstack/react-start/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signSaToken, verifySaToken, requireSuperAdminSession } from "@/lib/admin/auth-utils";
import { handleApiError } from "@/lib/error-utils";
import { isProduction } from "@/lib/env";

const SA_COOKIE = "sa_auth_token";
const SESSION_EXPIRY_HOURS = 24;

export const loginSuperAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const email = data.email.toLowerCase().trim();
      const users = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, email), eq(schema.users.role, "super_admin")))
        .limit(1);

      if (!users.length) {
        await new Promise((r) => setTimeout(r, 1000));
        return { success: false as const, error: "Invalid credentials or not a Super Admin" };
      }

      const user = users[0];
      if (user.status === "inactive" || user.status === "suspended") {
        return { success: false as const, error: "Account is disabled" };
      }

      if (!user.pin || !user.pin.startsWith("$2")) {
        return { success: false as const, error: "Account password not configured properly." };
      }

      const isMatch = await bcrypt.compare(data.password, user.pin);
      if (!isMatch) {
        await new Promise((r) => setTimeout(r, 1000));
        return { success: false as const, error: "Invalid credentials" };
      }

      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      await db
        .insert(schema.superAdminSessions)
        .values({ id: sessionId, userId: user.id, expiresAt });

      const token = await signSaToken({ userId: user.id, sessionId });

      setCookie(SA_COOKIE, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
      });

      await db
        .update(schema.users)
        .set({ lastActive: new Date().toISOString() })
        .where(eq(schema.users.id, user.id));

      const { pin: _, ...safeUser } = user;
      return { success: true as const, user: safeUser };
    } catch (e) {
      return handleApiError(e, "Super admin login failed");
    }
  });

export const getSuperAdminSessionFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      const { userId } = await requireSuperAdminSession();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!users.length) return { success: false as const, user: null };

      const { pin: _, ...safeUser } = users[0];
      return { success: true as const, user: safeUser };
    } catch {
      return { success: false as const, user: null };
    }
  });

export const logoutSuperAdminFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      const token = getCookie(SA_COOKIE);
      if (token) {
        const payload = await verifySaToken(token).catch(() => null);
        if (payload) {
          await db
            .update(schema.superAdminSessions)
            .set({ revokedAt: new Date().toISOString() })
            .where(eq(schema.superAdminSessions.id, payload.sessionId));
        }
      }
    } catch {
      /* ignore */
    } finally {
      deleteCookie(SA_COOKIE, { path: "/" });
    }
    return { success: true as const };
  });
