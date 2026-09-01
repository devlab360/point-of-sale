import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "FATAL ERROR: JWT_SECRET environment variable is missing in production. Authentication is disabled to prevent security vulnerabilities.",
  );
}

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

const userStatusCache = new Map<string, { orgId?: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache

export function invalidateUserSessionCache(userId: string) {
  userStatusCache.delete(userId);
}

export async function requireAuth(): Promise<SessionPayload> {
  const token = getCookie("pos_auth_token");
  if (!token) {
    throw new Error("Unauthorized");
  }
  const payload = await verifySessionToken(token);
  if (!payload) {
    try {
      deleteCookie("pos_auth_token", { path: "/" });
      deleteCookie("pos_session_org", { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Invalid session token");
  }

  // Check 15-second TTL cache for active user verification
  const cached = userStatusCache.get(payload.userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (!payload.orgId && cached.orgId) {
      payload.orgId = cached.orgId;
    }
    return payload;
  }

  // Active User Verification (Token Revocation Check from Database)
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, payload.userId))
    .limit(1);

  if (
    users.length === 0 ||
    users[0].status === "suspended" ||
    users[0].status === "inactive" ||
    users[0].status === "pending"
  ) {
    userStatusCache.delete(payload.userId);
    try {
      deleteCookie("pos_auth_token", { path: "/" });
      deleteCookie("pos_session_org", { path: "/" });
    } catch {}
    throw new Error("Unauthorized: Account suspended or deleted");
  }

  userStatusCache.set(payload.userId, {
    orgId: users[0].organizationId || undefined,
    timestamp: Date.now(),
  });

  // Auto-heal missing organization ID (for backward compatibility / bug fixes)
  if (!payload.orgId && users[0].organizationId) {
    payload.orgId = users[0].organizationId;
  }

  return payload;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const payload = await requireAuth();
  if (payload.role !== "admin" && payload.role !== "super_admin") {
    // Fallback check in case the token was issued before roles were added to it
    if (!payload.role) {
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.userId))
        .limit(1);
      if (users.length && (users[0].role === "admin" || users[0].role === "super_admin")) {
        return { ...payload, role: users[0].role };
      }
    }
    throw new Error("Unauthorized: Admin access required");
  }
  return payload;
}

export async function requirePermission(
  permissionKey: string,
  roleDefaults: string[] = [],
): Promise<SessionPayload> {
  const payload = await requireAuth();
  if (payload.role === "admin" || payload.role === "super_admin") {
    return payload;
  }
  if (roleDefaults.includes(payload.role?.toLowerCase())) {
    return payload;
  }
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, payload.userId))
    .limit(1);

  if (users.length === 0) throw new Error("Unauthorized");
  const user = users[0];
  const userPerms: string[] = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];

  if (
    userPerms.includes("all") ||
    userPerms.includes(permissionKey) ||
    userPerms.includes(`/${permissionKey}`) ||
    userPerms.includes(permissionKey.replace(/^\//, ""))
  ) {
    return payload;
  }
  throw new Error(`Unauthorized: Missing permission for '${permissionKey}'`);
}
