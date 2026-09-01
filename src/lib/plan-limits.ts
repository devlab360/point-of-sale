import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

type PlanLimits = {
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  maxInvoicesPerMonth: number;
  maxCustomers?: number;
};

export async function assertProductLimit(orgId: string): Promise<void> {
  const limits = await getOrgLimits(orgId);
  if (!limits || !limits.maxProducts) return;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.organizationId, orgId));

  const currentCount = Number(countRes[0]?.count || 0);
  if (currentCount >= limits.maxProducts) {
    throw new Error(
      `Plan limit reached: You have reached the maximum allowed limit of ${limits.maxProducts} products for your subscription tier. Please upgrade your plan to add more products.`,
    );
  }
}

export async function assertUserLimit(orgId: string): Promise<void> {
  const orgInfo = await getOrgLimitsWithQuota(orgId);
  if (!orgInfo || !orgInfo.limits || !orgInfo.limits.maxUsers) return;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(eq(schema.users.organizationId, orgId));

  const currentCount = Number(countRes[0]?.count || 0);
  const effectiveMaxUsers = (orgInfo.limits.maxUsers || 0) + (orgInfo.extraUsersQuota || 0);

  if (currentCount >= effectiveMaxUsers) {
    throw new Error(
      `Plan limit reached: You have reached the maximum allowed limit of ${effectiveMaxUsers} staff users (${orgInfo.limits.maxUsers} bundled + ${orgInfo.extraUsersQuota || 0} extra seats) for your subscription. Please upgrade your plan or purchase additional user seats in Settings.`,
    );
  }
}

export async function assertBranchLimit(orgId: string): Promise<void> {
  const limits = await getOrgLimits(orgId);
  if (!limits || !limits.maxBranches) return;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.locations)
    .where(eq(schema.locations.organizationId, orgId));

  const currentCount = Number(countRes[0]?.count || 0);
  if (currentCount >= limits.maxBranches) {
    throw new Error(
      `Plan limit reached: You have reached the maximum allowed limit of ${limits.maxBranches} store branches for your subscription tier. Please upgrade your plan to add more branch locations.`,
    );
  }
}

export async function assertInvoiceLimit(orgId: string): Promise<void> {
  const limits = await getOrgLimits(orgId);
  if (!limits || !limits.maxInvoicesPerMonth) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.sales)
    .where(and(eq(schema.sales.organizationId, orgId), gte(schema.sales.date, startOfMonth)));

  const currentCount = Number(countRes[0]?.count || 0);
  if (currentCount >= limits.maxInvoicesPerMonth) {
    throw new Error(
      `Monthly quota reached: You have reached the maximum limit of ${limits.maxInvoicesPerMonth} sales invoices for this billing cycle. Please upgrade your subscription tier to continue billing.`,
    );
  }
}

export async function assertPlanActive(orgId: string): Promise<void> {
  const orgs = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  if (!orgs.length) return;
  const org = orgs[0];

  if (org.status === "suspended") {
    throw new Error(
      "Store Suspended: Your store account is currently suspended. Please contact platform support.",
    );
  }
}

async function getOrgLimits(orgId: string): Promise<PlanLimits | null> {
  const info = await getOrgLimitsWithQuota(orgId);
  return info ? info.limits : null;
}

export async function getOrgLimitsWithQuota(
  orgId: string,
): Promise<{ limits: PlanLimits | null; extraUsersQuota: number } | null> {
  const orgs = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  if (!orgs.length) return null;
  const org = orgs[0];

  const plans = await db
    .select()
    .from(schema.saasPlans)
    .where(eq(schema.saasPlans.id, org.currentPlanId))
    .limit(1);
  if (!plans.length) return null;

  return {
    limits: plans[0].limits as PlanLimits | null,
    extraUsersQuota: Number(org.extraUsersQuota || 0),
  };
}
