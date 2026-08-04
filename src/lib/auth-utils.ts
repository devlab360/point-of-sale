import { getCookie } from "@tanstack/react-start/server";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "pos-super-secret-key-development",
);

export interface SessionPayload {
  userId: string;
  orgId: string;
  role: string;
  userName?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const token = getCookie("pos_auth_token");
  // For backward compatibility during migration, we can also check pos_session_org
  // but strictly we should only rely on pos_auth_token.
  if (!token) {
    throw new Error("Unauthorized");
  }
  const payload = await verifySessionToken(token);
  if (!payload) {
    throw new Error("Unauthorized");
  }
  return payload;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const payload = await requireAuth();
  if (payload.role !== "admin") {
    // Fallback check in case the token was issued before roles were added to it
    if (!payload.role) {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.userId))
        .limit(1);
      if (users.length && users[0].role === "admin") {
        return { ...payload, role: "admin" };
      }
    }
    throw new Error("Unauthorized: Admin access required");
  }
  return payload;
}
