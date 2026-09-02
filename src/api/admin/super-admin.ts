import { createServerFn } from "@tanstack/react-start";
import { requireSuperAdminSession } from "@/lib/admin/auth-utils";
import { adminService } from "@/services/admin.service";
import { handleApiError } from "@/lib/error-utils";
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
      return handleApiError(e);
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
      extraUsersQuota: z.number().optional(),
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
      return handleApiError(e);
    }
  });

export const deleteOrganizationFn = createServerFn({ method: "POST" })
  .validator(z.object({ orgId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.deleteOrganization(data.orgId);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const resetTenantSyncKeyFn = createServerFn({ method: "POST" })
  .validator(z.object({ orgId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const newSyncKey = await adminService.resetTenantSyncKey(data.orgId);
      return { success: true as const, syncKey: newSyncKey };
    } catch (e) {
      return handleApiError(e);
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
      return handleApiError(e);
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
      return handleApiError(e);
    }
  });

// ─── Tenant Provisioning ───────────────────────────────────────

export const createTenantUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeName: z.string().min(2),
      ownerName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
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
      return handleApiError(e);
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
      return handleApiError(e);
    }
  });

export const createOrUpdatePlanFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      currency: z.string().optional().default("INR"),
      price: z.number().optional().default(0),
      monthlyPrice: z.number().optional(),
      yearlyPrice: z.number().optional(),
      perExtraUserPrice: z.number().optional().default(0),
      features: z.array(z.string()).optional().default([]),
      menus: z.array(z.string()).optional().default([]),
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
      return handleApiError(e);
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
      return handleApiError(e);
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
      return handleApiError(e);
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
      return handleApiError(e);
    }
  });

// ─── Super Admin Staff & Users ─────────────────────────────────

export const getSuperAdminUsersFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const users = await adminService.getSuperAdminUsers();
      return { success: true as const, data: JSON.parse(JSON.stringify(users)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createSuperAdminUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      adminPermissions: z.array(z.string()).optional(), // null/omit = full access
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.createSuperAdminUser(data);
      return { success: true as const, ...result };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSuperAdminUserPermissionsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string(),
      adminPermissions: z.array(z.string()).nullable(), // null = full access
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { userId: currentUserId } = await requireSuperAdminSession();
      if (currentUserId === data.userId) {
        return { success: false as const, error: "You cannot modify your own permissions" };
      }
      await adminService.updateSuperAdminUserPermissions(data.userId, data.adminPermissions);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteSuperAdminUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { userId: currentUserId } = await requireSuperAdminSession();
      await adminService.deleteSuperAdminUser(data.userId, currentUserId);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSuperAdminProfileAdminFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { userId } = await requireSuperAdminSession();
      const result = await adminService.updateSuperAdminProfile(userId, data);
      return result;
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getSuperAdminSessionsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const sessions = await adminService.getSuperAdminSessions();
      return { success: true as const, data: JSON.parse(JSON.stringify(sessions)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const revokeSuperAdminSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.revokeSuperAdminSession(data.sessionId);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Super Admin Payment Gateway Configuration ─────────────────

export const getSuperAdminPaymentConfigFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const config = await adminService.getPaymentConfig();
      return { success: true as const, data: config };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const saveSuperAdminPaymentConfigFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accountName: z.string().optional(),
      bankName: z.string().optional(),
      accountNo: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
      qrCodeUrl: z.string().optional(),
      instructions: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.savePaymentConfig(data);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Support Tickets ───────────────────────────────────────────

export const getAllSupportTicketsAdminFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const tickets = await adminService.getAllSupportTickets();
      return { success: true as const, data: JSON.parse(JSON.stringify(tickets)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateSupportTicketStatusAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ ticketId: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.updateSupportTicketStatus(data.ticketId, data.status);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Merchant Reviews ──────────────────────────────────────────

export const getAllReviewsAdminFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.getAllReviews();
      return { success: true as const, data: JSON.parse(JSON.stringify(result)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Help Center & FAQs ────────────────────────────────────────

export const getHelpArticlesAdminFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.getHelpArticles();
      return { success: true as const, data: JSON.parse(JSON.stringify(result)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createHelpArticleAdminFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(2),
      type: z.enum(["doc", "video"]),
      content: z.string().min(2),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.createHelpArticle(data);
      return { success: true as const, ...result };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteHelpArticleAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.deleteHelpArticle(data.id);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createFaqAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ question: z.string().min(2), answer: z.string().min(2) }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.createFaq(data);
      return { success: true as const, ...result };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteFaqAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.deleteFaq(data.id);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ─── Global Broadcast Announcements ────────────────────────────

export const getBroadcastAnnouncementsAdminFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const list = await adminService.getBroadcastAnnouncements();
      return { success: true as const, data: list };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const saveBroadcastAnnouncementAdminFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(2),
      message: z.string().min(5),
      type: z.enum(["info", "warning", "success", "update"]),
      audience: z.enum(["all", "trial", "active"]),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      const result = await adminService.saveBroadcastAnnouncement(data);
      return { success: true as const, data: result };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const toggleBroadcastAnnouncementAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), active: z.boolean() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.toggleBroadcastAnnouncement(data.id, data.active);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteBroadcastAnnouncementAdminFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireSuperAdminSession();
      await adminService.deleteBroadcastAnnouncement(data.id);
      return { success: true as const };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getActiveBroadcastForStoreFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({ orgStatus: z.string().optional() })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const announcement = await adminService.getActiveBroadcastForStore(data?.orgStatus);
      return { success: true as const, data: announcement };
    } catch (e) {
      return handleApiError(e);
    }
  });
