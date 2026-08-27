import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";

export const getEffectiveMenusFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      if (session.role === "super_admin" || session.role === "admin") {
        // Super Admin & Store Organization Admins get full menu access
        return { success: true as const, menus: ["all"] };
      }
      if (!session.orgId) {
         return { success: true as const, menus: [] };
      }
      const orgs = await db.select().from(schema.organizations).where(eq(schema.organizations.id, session.orgId)).limit(1);
      if (!orgs.length) return { success: false as const, error: "Org not found" };
      const org = orgs[0];

      // Trial Organizations get full menu access during 7-day trial
      if (org.status === "trial") {
        return { success: true as const, menus: ["all"] };
      }

      const plans = await db.select().from(schema.saasPlans).where(eq(schema.saasPlans.id, org.currentPlanId)).limit(1);
      const plan = plans[0];
      let allowedMenus: string[] = [];
      if (plan && Array.isArray(plan.menus) && plan.menus.includes("all")) {
        allowedMenus = ["all"];
      } else if (plan && Array.isArray(plan.menus)) {
        allowedMenus = [...plan.menus];
      } else if (plan && Array.isArray(plan.features)) {
        allowedMenus = plan.features.map((f: string) => f.replace("/", ""));
      } else {
        allowedMenus = ["all"];
      }

      // Grants from Super Admin (overrides / extends plan)
      const grants = await db.select().from(schema.adminMenuGrants).where(eq(schema.adminMenuGrants.organizationId, session.orgId));
      if (grants.length > 0) {
        const grantedKeys = grants.map(g => g.menuKey);
        allowedMenus = Array.from(new Set([...allowedMenus, ...grantedKeys]));
      }

      return { success: true as const, menus: allowedMenus };
    } catch (e: any) {
      return { success: false as const, error: e.message || "Failed to fetch menus" };
    }
  });

export const getOrgSubscriptionFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      if (!session.orgId) {
         return { success: false as const, error: "No organization associated" };
      }
      const subs = await db.select().from(schema.orgSubscriptions).where(eq(schema.orgSubscriptions.organizationId, session.orgId)).limit(1);
      const sub = subs[0];
      if (!sub) {
        return { success: true as const, subscription: null };
      }
      return { success: true as const, subscription: JSON.parse(JSON.stringify(sub)) };
    } catch (e: any) {
      return { success: false as const, error: e.message || "Failed to fetch subscription" };
    }
  });