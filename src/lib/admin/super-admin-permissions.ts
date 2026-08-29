// Super Admin Module-Wise Permission System
// Defines all 9 super admin panel modules and helper functions for access control.
// null adminPermissions = root / full access; array = restricted to those keys.

export interface SuperAdminModule {
  key: string;
  label: string;
  routePrefix: string;
  description: string;
}

export const SUPER_ADMIN_MODULES: SuperAdminModule[] = [
  {
    key: "dashboard",
    label: "Executive Dashboard",
    routePrefix: "/admin/dashboard",
    description: "Platform-wide KPIs, revenue metrics, and activity overview",
  },
  {
    key: "tenants",
    label: "Tenant Stores & Orgs",
    routePrefix: "/admin/tenants",
    description: "View, edit, suspend, and provision store accounts",
  },
  {
    key: "plans",
    label: "SaaS Plans & Quotas",
    routePrefix: "/admin/plans",
    description: "Create and manage subscription plans, pricing, and limits",
  },
  {
    key: "payments",
    label: "Payment Approvals",
    routePrefix: "/admin/payments",
    description: "Approve or reject manual payment proof submissions",
  },
  {
    key: "support",
    label: "Support Inbox",
    routePrefix: "/admin/support",
    description: "Respond to and manage merchant support tickets",
  },
  {
    key: "reviews",
    label: "Merchant Reviews",
    routePrefix: "/admin/reviews",
    description: "View and moderate store ratings and reviews",
  },
  {
    key: "help",
    label: "Help Center & FAQs",
    routePrefix: "/admin/help",
    description: "Manage help articles, tutorials, and FAQ content",
  },
  {
    key: "announcements",
    label: "Broadcast Notices",
    routePrefix: "/admin/announcements",
    description: "Publish platform-wide announcements to store owners",
  },
  {
    key: "users",
    label: "Super Admin Users",
    routePrefix: "/admin/users",
    description: "Manage super admin team members and their permissions (owner only)",
  },
];

export const ALL_MODULE_KEYS = SUPER_ADMIN_MODULES.map((m) => m.key);

/**
 * Returns true if the user has access to the given super admin module.
 * - null/undefined adminPermissions = root authority = full access
 * - Empty array = also treated as full access (graceful fallback)
 * - Non-empty array = only those module keys are accessible
 */
export function hasSuperAdminModuleAccess(
  adminPermissions: string[] | null | undefined,
  moduleKey: string,
): boolean {
  if (!adminPermissions || adminPermissions.length === 0) return true;
  return adminPermissions.includes(moduleKey);
}

/**
 * Returns all module keys the user can access.
 * If adminPermissions is null/empty => all modules.
 */
export function getAccessibleModules(
  adminPermissions: string[] | null | undefined,
): string[] {
  if (!adminPermissions || adminPermissions.length === 0) return ALL_MODULE_KEYS;
  return ALL_MODULE_KEYS.filter((key) => adminPermissions.includes(key));
}

/**
 * Given a route pathname, returns the module key it belongs to.
 * Returns null if the route is not a protected super admin module route.
 */
export function getModuleKeyForRoute(pathname: string): string | null {
  const sorted = [...SUPER_ADMIN_MODULES].sort(
    (a, b) => b.routePrefix.length - a.routePrefix.length,
  );
  for (const mod of sorted) {
    if (pathname === mod.routePrefix || pathname.startsWith(mod.routePrefix + "/")) {
      return mod.key;
    }
  }
  return null;
}
