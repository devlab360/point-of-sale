import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

const SA_COOKIE = "sa_auth_token";

export async function getJwtSecret(): Promise<Uint8Array> {
  const secret =
    process.env.SA_JWT_SECRET || process.env.JWT_SECRET || "pos-super-secret-key-development";
  return new TextEncoder().encode(secret);
}

export async function signSaToken(payload: { userId: string; sessionId: string }): Promise<string> {
  const secret = await getJwtSecret();
  return new SignJWT({ ...payload, role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifySaToken(token: string): Promise<{ userId: string; sessionId: string }> {
  const secret = await getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  if (!payload.userId || !payload.sessionId || payload.role !== "super_admin") {
    throw new Error("Invalid token structure");
  }
  return { userId: payload.userId as string, sessionId: payload.sessionId as string };
}

export async function requireSuperAdminSession(): Promise<{ userId: string; sessionId: string }> {
  const token = getCookie(SA_COOKIE);
  if (!token) throw new Error("Unauthorized: No super admin session cookie");
  const payload = await verifySaToken(token).catch(() => {
    try {
      deleteCookie(SA_COOKIE, { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Invalid or expired super admin token");
  });
  const sessions = await db
    .select()
    .from(schema.superAdminSessions)
    .where(
      and(
        eq(schema.superAdminSessions.id, payload.sessionId),
        eq(schema.superAdminSessions.userId, payload.userId),
      ),
    )
    .limit(1);
  const session = sessions[0];
  if (!session) {
    try {
      deleteCookie(SA_COOKIE, { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Session not found");
  }
  if (session.revokedAt) {
    try {
      deleteCookie(SA_COOKIE, { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Session revoked");
  }
  if (new Date(session.expiresAt) < new Date()) {
    try {
      deleteCookie(SA_COOKIE, { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Session expired");
  }
  return payload;
}
