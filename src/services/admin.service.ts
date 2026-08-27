import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/errors/errors";

export interface CreateTenantDTO {
  storeName: string;
  ownerName: string;
  email: string;
  password: string;
  role?: string;
  planId: string;
}

export interface PlanDTO {
  id?: string;
  name: string;
  price?: number;
  features?: string[];
  limits?: {
    maxUsers: number;
    maxProducts: number;
    maxBranches: number;
    maxInvoicesPerMonth: number;
    maxCustomers?: number;
  };
  isTrialDefault?: boolean;
}

export class AdminService {
  async getAllOrganizations() {
    const orgs = await db.select().from(schema.organizations);
    const rawPlans = await db.select().from(schema.saasPlans);
    const plans = rawPlans.filter((p) => p.id !== "super_admin_payment_config");
    return { orgs, plans };
  }

  async updateOrganization(
    orgId: string,
    updateData: Partial<typeof schema.organizations.$inferInsert>,
  ) {
    const existing = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Organization with ID ${orgId} not found`);
    }

    await db.update(schema.organizations).set(updateData).where(eq(schema.organizations.id, orgId));
  }

  async addTrialDays(orgId: string, days: number) {
    const orgs = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);

    if (!orgs.length) {
      throw new NotFoundError(`Organization with ID ${orgId} not found`);
    }

    const org = orgs[0];
    const currentExpiry = org.planExpiryDate ? new Date(org.planExpiryDate) : new Date();
    const newExpiry = new Date(
      Math.max(currentExpiry.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000,
    );

    await db
      .update(schema.organizations)
      .set({ planExpiryDate: newExpiry.toISOString() as any })
      .where(eq(schema.organizations.id, orgId));
  }

  async toggleOrgStatus(orgId: string, status: "active" | "suspended" | "trial") {
    await db.update(schema.organizations).set({ status }).where(eq(schema.organizations.id, orgId));
  }

  async createTenantUser(dto: CreateTenantDTO) {
    const email = dto.email.toLowerCase().trim();

    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length) {
      throw new ConflictError("Email already in use by another account");
    }

    const plan = await db
      .select()
      .from(schema.saasPlans)
      .where(eq(schema.saasPlans.id, dto.planId))
      .limit(1);

    if (!plan.length) {
      throw new BadRequestError(`Plan ${dto.planId} does not exist`);
    }

    const orgId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const hashedPin = await bcrypt.hash(dto.password, 10);
    const now = new Date();
    const trialDays = 7;
    const expiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.insert(schema.organizations).values({
        id: orgId,
        name: dto.storeName,
        ownerEmail: email,
        status: "trial",
        currentPlanId: dto.planId,
        planExpiryDate: expiryDate.toISOString(),
      });

      await tx.insert(schema.users).values({
        id: ownerId,
        organizationId: orgId,
        name: dto.ownerName,
        email,
        role: dto.role || "admin",
        pin: hashedPin,
        status: "active",
        emailVerified: true,
        lastActive: now.toISOString(),
      });

      await tx.insert(schema.settings).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        storeName: dto.storeName,
        email,
        trialEndsAt: expiryDate.toISOString(),
        subscriptionStatus: "trial",
        currencySymbol: "Rs",
        currencyCode: "INR",
        headerNote: `Welcome to ${dto.storeName}`,
        footerNote: "Thank you for your business!",
        emailReceiptDefault: true,
        printStoreLogo: true,
      });
    });

    return { orgId, ownerId };
  }

  async getAllPlans() {
    const plans = await db.select().from(schema.saasPlans);
    return plans.filter((p) => p.id !== "super_admin_payment_config");
  }

  async createOrUpdatePlan(dto: PlanDTO) {
    const planId =
      dto.id && dto.id.trim().length > 0
        ? dto.id.trim()
        : "plan_" + dto.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

    if (dto.isTrialDefault) {
      await db.update(schema.saasPlans).set({ isTrialDefault: false });
    }

    await db
      .insert(schema.saasPlans)
      .values({
        id: planId,
        name: dto.name,
        price: String(dto.price ?? 0),
        features: dto.features ?? [],
        limits: dto.limits,
        isTrialDefault: dto.isTrialDefault ?? false,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          name: dto.name,
          price: String(dto.price ?? 0),
          features: dto.features ?? [],
          limits: dto.limits,
          isTrialDefault: dto.isTrialDefault ?? false,
        },
      });

    return { planId };
  }

  async deletePlan(planId: string) {
    await db.delete(schema.saasPlans).where(eq(schema.saasPlans.id, planId));
  }

  async getAdminMenuGrants(orgId: string) {
    const grants = await db
      .select()
      .from(schema.adminMenuGrants)
      .where(eq(schema.adminMenuGrants.organizationId, orgId));

    return grants.map((g) => g.menuKey);
  }

  async setAdminMenuGrants(orgId: string, menuKeys: string[], grantedBy: string) {
    await db.delete(schema.adminMenuGrants).where(eq(schema.adminMenuGrants.organizationId, orgId));

    if (menuKeys.length > 0) {
      await db.insert(schema.adminMenuGrants).values(
        menuKeys.map((menuKey) => ({
          id: crypto.randomUUID(),
          organizationId: orgId,
          menuKey,
          grantedBy,
        })),
      );
    }
  }
}

export const adminService = new AdminService();
