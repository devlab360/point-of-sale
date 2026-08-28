import { createServerFn } from "@tanstack/react-start";
import { requireSuperAdminSession } from "@/lib/admin/auth-utils";
import { adminService } from "@/services/admin.service";
import { formatErrorResponse } from "@/lib/errors/errors";
import { z } from "zod";

// ─── Organizations & Tenants ──────────────────────────────────

export const getAllOrganizationsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.getAllOrganizations();
      return { success: true as const, data: JSON.parse(JSON.stringify(result)) };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const updateOrganizationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orgId: z.string(),
      name: z.string().optional(),
      ownerEmail: z.string().email().optional(),
      status: z.string().optional(),
      currentPlanId: z.string().optional(),
      planExpiryDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const { orgId, ...updateData } = data;
      await adminService.updateOrganization(orgId, updateData as any);
      return { success: true as const };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const addTrialDaysFn = createServerFn({ method: "POST" })
  .validator(z.object({ orgId: z.string(), days: z.number().min(1).max(365) }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.addTrialDays(data.orgId, data.days);
      return { success: true as const };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const toggleOrgStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ orgId: z.string(), status: z.enum(["active", "suspended", "trial"]) }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.toggleOrgStatus(data.orgId, data.status);
      return { success: true as const };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

// ─── Tenant Provisioning ───────────────────────────────────────

export const createTenantUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeName: z.string().min(2),
      ownerName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.string().optional().default("admin"),
      planId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.createTenantUser(data);
      return { success: true as const, ...result };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

// ─── SaaS Plan Architecture ───────────────────────────────────

export const getAllPlansFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const plans = await adminService.getAllPlans();
      return { success: true as const, data: JSON.parse(JSON.stringify(plans)) };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const createOrUpdatePlanFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      price: z.number().optional().default(0),
      features: z.array(z.string()).optional().default([]),
      limits: z
        .object({
          maxUsers: z.number(),
          maxProducts: z.number(),
          maxBranches: z.number(),
          maxInvoicesPerMonth: z.number(),
          maxCustomers: z.number().optional(),
        })
        .optional()
        .default({ maxUsers: 2, maxProducts: 100, maxBranches: 1, maxInvoicesPerMonth: 500 }),
      isTrialDefault: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.createOrUpdatePlan(data);
      return { success: true as const, ...result };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const deletePlanFn = createServerFn({ method: "POST" })
  .validator(z.object({ planId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.deletePlan(data.planId);
      return { success: true as const };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const archivePlanFn = deletePlanFn;

// ─── Menu Access Overrides ─────────────────────────────────────

export const getAdminMenuGrantsFn = createServerFn({ method: "GET" })
  .validator(z.object({ orgId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const menuKeys = await adminService.getAdminMenuGrants(data.orgId);
      return { success: true as const, data: menuKeys };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const setAdminMenuGrantsFn = createServerFn({ method: "POST" })
  .validator(z.object({ orgId: z.string(), menuKeys: z.array(z.string()) }))
  .handler(async ({ data }) => {
    try {
      const { userId } = await requireSuperAdminSession();
      await adminService.setAdminMenuGrants(data.orgId, data.menuKeys, userId);
      return { success: true as const };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });
