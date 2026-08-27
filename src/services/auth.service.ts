import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { createSessionToken } from "@/lib/auth-utils";
import { setCookie } from "@tanstack/react-start/server";
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";

export interface LoginDTO {
  email?: string;
  password?: string;
}

export interface RegisterOrgDTO {
  orgId: string;
  ownerId: string;
  trialEndsAt: number;
  companyName: string;
  email: string;
  phone?: string;
  ownerName: string;
  password: string;
  assignedPlanId: string;
  seedData?: any;
}

export class AuthService {
  async login(data: LoginDTO) {
    if (!data.email || !data.password) {
      throw new BadRequestError("Email and password are required");
    }

    const email = data.email.toLowerCase().trim();

    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      throw new UnauthorizedError("Invalid credentials");
    }

    const user = users[0];

    if (!user.pin || !user.pin.startsWith("$2")) {
      throw new UnauthorizedError(
        "Invalid credentials or legacy PIN. Please reset your password.",
      );
    }

    const isMatch = await bcrypt.compare(data.password, user.pin);
    if (!isMatch) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.status === "inactive") {
      throw new ForbiddenError("Your account is inactive. Please contact administrator.");
    }
    if (user.status === "suspended") {
      throw new ForbiddenError("Your account has been suspended.");
    }
    if (user.status === "pending") {
      throw new ForbiddenError("Your account is pending approval.");
    }
    if (user.role !== "admin" && (!user.permissions || user.permissions.length === 0)) {
      throw new ForbiddenError("You don't have permission to log in.");
    }
    if (user.role === "super_admin") {
      throw new ForbiddenError(
        "Super Admins must use the dedicated Super Admin Portal (/admin).",
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      orgId: user.organizationId || "",
      role: user.role,
      userName: user.name,
    });

    try {
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
    } catch {
      // Safe fallback when executed outside HTTP request context (CLI/tests)
    }

    await db
      .update(schema.users)
      .set({ lastActive: new Date().toISOString() })
      .where(eq(schema.users.id, user.id));

    const { pin: _, ...safeUser } = user;
    return safeUser;
  }

  async checkEmailAvailability(emailStr: string) {
    const email = emailStr.toLowerCase().trim();
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return {
      available: existingUser.length === 0,
      message: existingUser.length === 0 ? "Email is available" : "Email is already taken",
    };
  }

  async registerOrg(data: RegisterOrgDTO) {
    const email = data.email.toLowerCase().trim();

    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      throw new ConflictError("An account with this email already exists.");
    }

    const hashedPin = await bcrypt.hash(data.password, 10);

    await db.transaction(async (tx) => {
      await tx.insert(schema.organizations).values({
        id: data.orgId,
        name: data.companyName,
        ownerEmail: email,
        status: "trial",
        currentPlanId: data.assignedPlanId,
        planExpiryDate: new Date(data.trialEndsAt).toISOString(),
      });

      await tx.insert(schema.users).values({
        id: data.ownerId,
        organizationId: data.orgId,
        name: data.ownerName,
        email,
        role: "admin",
        status: "pending_verification",
        lastActive: new Date().toISOString(),
        pin: hashedPin,
        emailVerified: false,
      });

      await tx.insert(schema.settings).values({
        id: uuidv4(),
        organizationId: data.orgId,
        trialEndsAt: new Date(data.trialEndsAt).toISOString(),
        subscriptionStatus: "trial",
        currencySymbol: "$",
        currencyCode: "USD",
        storeName: data.companyName,
        phone: data.phone,
        email,
        headerNote: data.seedData?.settings?.headerNote || `Welcome to ${data.companyName}`,
        footerNote: "Thank you for your business!",
        emailReceiptDefault: true,
        printStoreLogo: true,
      });

      if (data.seedData) {
        if (data.seedData.categories?.length) {
          await tx
            .insert(schema.categories)
            .values(
              data.seedData.categories.map((c: any) => ({
                ...c,
                organizationId: data.orgId,
              })),
            );
        }
        if (data.seedData.units?.length) {
          await tx
            .insert(schema.units)
            .values(
              data.seedData.units.map((u: any) => ({ ...u, organizationId: data.orgId })),
            );
        }
      }
    });

    const token = await createSessionToken({
      userId: data.ownerId,
      orgId: data.orgId,
      role: "admin",
      userName: data.ownerName,
    });

    try {
      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    } catch {
      // Safe fallback when executed outside HTTP request context
    }
  }
}

export const authService = new AuthService();
