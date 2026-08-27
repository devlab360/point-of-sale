import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

  const currentCount = Number(countRes[0].count);
  if (currentCount >= limits.maxProducts) {
    throw new Error(`Plan limit reached: You can only have up to ${limits.maxProducts} products.`);
  }
}

export async function assertUserLimit(orgId: string): Promise<void> {
  const limits = await getOrgLimits(orgId);
  if (!limits || !limits.maxUsers) return;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(eq(schema.users.organizationId, orgId));

  const currentCount = Number(countRes[0].count);
  if (currentCount >= limits.maxUsers) {
    throw new Error(`Plan limit reached: You can only have up to ${limits.maxUsers} users.`);
  }
}

async function getOrgLimits(orgId: string): Promise<PlanLimits | null> {
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

  return plans[0].limits as PlanLimits | null;
}
