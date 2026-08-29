import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, isNull, or, sql } from "drizzle-orm";
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
  monthlyPrice?: number;
  yearlyPrice?: number;
  perExtraUserPrice?: number;
  currency?: string;
  features?: string[];
  menus?: string[];
  limits?: {
    maxUsers: number;
    maxProducts: number;
    maxBranches: number;
    maxInvoicesPerMonth: number;
    maxCustomers?: number;
  };
  isTrialDefault?: boolean;
}

export interface SuperAdminPaymentConfigDTO {
  accountName?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  upiId?: string;
  qrCodeUrl?: string;
  instructions?: string;
}

export class AdminService {
  // ─── Organizations & Tenants ──────────────────────────────────
  async getAllOrganizations() {
    const orgs = await db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt));
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

  async deleteOrganization(orgId: string) {
    const existing = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Organization with ID ${orgId} not found`);
    }

    await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
  }

  async resetTenantSyncKey(orgId: string) {
    const newKey = "sync_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    await db
      .update(schema.organizations)
      .set({ syncKey: newKey })
      .where(eq(schema.organizations.id, orgId));
    return newKey;
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
      .set({ planExpiryDate: newExpiry.toISOString() as any, status: "trial" })
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

  // ─── SaaS Plans ───────────────────────────────────────────────
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

    const priceStr = String(dto.price ?? dto.monthlyPrice ?? 0);
    const monthlyPriceStr = dto.monthlyPrice !== undefined ? String(dto.monthlyPrice) : priceStr;
    const yearlyPriceStr = dto.yearlyPrice !== undefined ? String(dto.yearlyPrice) : null;
    const perExtraUserPriceStr = dto.perExtraUserPrice !== undefined ? String(dto.perExtraUserPrice) : "0";

    await db
      .insert(schema.saasPlans)
      .values({
        id: planId,
        name: dto.name,
        currency: dto.currency || "INR",
        price: priceStr,
        monthlyPrice: monthlyPriceStr,
        yearlyPrice: yearlyPriceStr,
        perExtraUserPrice: perExtraUserPriceStr,
        features: dto.features ?? [],
        menus: dto.menus ?? [],
        limits: dto.limits,
        isTrialDefault: dto.isTrialDefault ?? false,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          name: dto.name,
          currency: dto.currency || "INR",
          price: priceStr,
          monthlyPrice: monthlyPriceStr,
          yearlyPrice: yearlyPriceStr,
          perExtraUserPrice: perExtraUserPriceStr,
          features: dto.features ?? [],
          menus: dto.menus ?? [],
          limits: dto.limits,
          isTrialDefault: dto.isTrialDefault ?? false,
          updatedAt: new Date().toISOString(),
        },
      });

    return { planId };
  }

  async deletePlan(planId: string) {
    await db.delete(schema.saasPlans).where(eq(schema.saasPlans.id, planId));
  }

  // ─── Menu Access Overrides ─────────────────────────────────────
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

  // ─── Super Admin Platform Users ────────────────────────────────
  async getSuperAdminUsers() {
    const adminUsers = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
        lastActive: schema.users.lastActive,
        joined: schema.users.joined,
      })
      .from(schema.users)
      .where(
        or(
          eq(schema.users.role, "super_admin"),
          isNull(schema.users.organizationId),
        ),
      );

    return adminUsers;
  }

  async createSuperAdminUser(data: { name: string; email: string; password: string; adminPermissions?: string[] }) {
    const email = data.email.toLowerCase().trim();
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length) {
      throw new ConflictError("A user with this email already exists");
    }

    const hashedPin = await bcrypt.hash(data.password, 10);
    const userId = crypto.randomUUID();

    await db.insert(schema.users).values({
      id: userId,
      name: data.name,
      email,
      role: "super_admin",
      status: "active",
      pin: hashedPin,
      permissions: ["all"],
      // null = full access (root); non-empty array = restricted
      adminPermissions: data.adminPermissions && data.adminPermissions.length > 0
        ? data.adminPermissions
        : null,
      joined: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    return { userId };
  }

  async deleteSuperAdminUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestError("You cannot delete your own Super Admin account");
    }

    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.role, "super_admin")))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError("Super Admin user not found");
    }

    await db.delete(schema.users).where(eq(schema.users.id, userId));
  }

  async updateSuperAdminUserPermissions(
    userId: string,
    adminPermissions: string[] | null,
  ) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.role, "super_admin")))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError("Super Admin user not found");
    }

    // Store null = full access; non-empty array = restricted
    const permsToStore =
      adminPermissions && adminPermissions.length > 0 ? adminPermissions : null;

    await db
      .update(schema.users)
      .set({ adminPermissions: permsToStore })
      .where(eq(schema.users.id, userId));
  }

  async updateSuperAdminProfile(
    userId: string,
    data: { name?: string; email?: string; currentPassword?: string; newPassword?: string },
  ) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.role, "super_admin")))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError("Super Admin user not found");
    }

    const user = existing[0];
    const updatePayload: Partial<typeof schema.users.$inferInsert> = {};

    if (data.name && data.name.trim()) {
      updatePayload.name = data.name.trim();
    }

    if (data.email && data.email.trim()) {
      const targetEmail = data.email.toLowerCase().trim();
      if (targetEmail !== user.email) {
        const emailConflict = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, targetEmail))
          .limit(1);
        if (emailConflict.length) {
          throw new ConflictError("Email already in use by another account");
        }
        updatePayload.email = targetEmail;
      }
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestError("Current password is required to set a new password");
      }
      const isMatch = await bcrypt.compare(data.currentPassword, user.pin || "");
      if (!isMatch) {
        throw new BadRequestError("Incorrect current password");
      }
      if (data.newPassword.length < 6) {
        throw new BadRequestError("New password must be at least 6 characters");
      }
      updatePayload.pin = await bcrypt.hash(data.newPassword, 10);
    }

    if (Object.keys(updatePayload).length > 0) {
      await db.update(schema.users).set(updatePayload).where(eq(schema.users.id, userId));
    }

    return {
      success: true,
      name: updatePayload.name || user.name,
      email: updatePayload.email || user.email,
    };
  }

  async getSuperAdminSessions() {
    const sessions = await db
      .select({
        id: schema.superAdminSessions.id,
        userId: schema.superAdminSessions.userId,
        userName: schema.users.name,
        userEmail: schema.users.email,
        ipAddress: schema.superAdminSessions.ipAddress,
        userAgent: schema.superAdminSessions.userAgent,
        expiresAt: schema.superAdminSessions.expiresAt,
        revokedAt: schema.superAdminSessions.revokedAt,
        createdAt: schema.superAdminSessions.createdAt,
      })
      .from(schema.superAdminSessions)
      .leftJoin(schema.users, eq(schema.superAdminSessions.userId, schema.users.id))
      .orderBy(desc(schema.superAdminSessions.createdAt))
      .limit(30);

    return sessions;
  }

  async revokeSuperAdminSession(sessionId: string) {
    await db
      .update(schema.superAdminSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.superAdminSessions.id, sessionId));
  }

  // ─── Super Admin Payment Gateway Configuration ─────────────────
  async getPaymentConfig() {
    const plan = await db
      .select()
      .from(schema.saasPlans)
      .where(eq(schema.saasPlans.id, "super_admin_payment_config"))
      .limit(1);

    if (!plan.length || !plan[0].features) {
      return {
        accountName: "",
        bankName: "",
        accountNo: "",
        ifscCode: "",
        upiId: "",
        qrCodeUrl: "",
        instructions: "Please scan the QR code or transfer to the bank account and submit your UTR reference.",
      };
    }

    return plan[0].features as unknown as SuperAdminPaymentConfigDTO;
  }

  async savePaymentConfig(config: SuperAdminPaymentConfigDTO) {
    await db
      .insert(schema.saasPlans)
      .values({
        id: "super_admin_payment_config",
        name: "Super Admin Payment Config",
        price: "0",
        features: config as any,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          features: config as any,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  // ─── Global Support Tickets ────────────────────────────────────
  async getAllSupportTickets() {
    const tickets = await db
      .select({
        id: schema.supportTickets.id,
        organizationId: schema.supportTickets.organizationId,
        orgName: schema.organizations.name,
        orgEmail: schema.organizations.ownerEmail,
        userId: schema.supportTickets.userId,
        userName: schema.users.name,
        subject: schema.supportTickets.subject,
        message: schema.supportTickets.message,
        status: schema.supportTickets.status,
        createdAt: schema.supportTickets.createdAt,
      })
      .from(schema.supportTickets)
      .leftJoin(schema.organizations, eq(schema.supportTickets.organizationId, schema.organizations.id))
      .leftJoin(schema.users, eq(schema.supportTickets.userId, schema.users.id))
      .orderBy(desc(schema.supportTickets.createdAt));

    return tickets;
  }

  async updateSupportTicketStatus(ticketId: string, status: string) {
    await db
      .update(schema.supportTickets)
      .set({ status })
      .where(eq(schema.supportTickets.id, ticketId));
  }

  // ─── Merchant Reviews & Ratings ────────────────────────────────
  async getAllReviews() {
    const reviews = await db
      .select({
        id: schema.reviews.id,
        organizationId: schema.reviews.organizationId,
        orgName: schema.organizations.name,
        userId: schema.reviews.userId,
        userName: schema.users.name,
        userEmail: schema.users.email,
        rating: schema.reviews.rating,
        comment: schema.reviews.comment,
        createdAt: schema.reviews.createdAt,
      })
      .from(schema.reviews)
      .leftJoin(schema.organizations, eq(schema.reviews.organizationId, schema.organizations.id))
      .leftJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
      .orderBy(desc(schema.reviews.createdAt));

    const total = reviews.length;
    const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total).toFixed(1) : "5.0";

    return { reviews, total, avgRating: parseFloat(avgRating) };
  }

  // ─── Help Center & Tutorials ───────────────────────────────────
  async getHelpArticles() {
    const articles = await db.select().from(schema.helpArticles).orderBy(desc(schema.helpArticles.createdAt));
    const faqs = await db.select().from(schema.faqs).orderBy(desc(schema.faqs.createdAt));
    return { articles, faqs };
  }

  async createHelpArticle(data: { title: string; type: "doc" | "video"; content: string }) {
    const id = crypto.randomUUID();
    await db.insert(schema.helpArticles).values({
      id,
      title: data.title,
      type: data.type,
      content: data.content,
    });
    return { id };
  }

  async deleteHelpArticle(id: string) {
    await db.delete(schema.helpArticles).where(eq(schema.helpArticles.id, id));
  }

  async createFaq(data: { question: string; answer: string }) {
    const id = crypto.randomUUID();
    await db.insert(schema.faqs).values({
      id,
      question: data.question,
      answer: data.answer,
    });
    return { id };
  }

  async deleteFaq(id: string) {
    await db.delete(schema.faqs).where(eq(schema.faqs.id, id));
  }

  // ─── Global Broadcast Announcements ────────────────────────────
  async getBroadcastAnnouncements() {
    const record = await db
      .select()
      .from(schema.saasPlans)
      .where(eq(schema.saasPlans.id, "system_broadcast_announcements"))
      .limit(1);

    if (!record.length || !record[0].features) {
      return [];
    }

    return (record[0].features as any[]) || [];
  }

  async saveBroadcastAnnouncement(data: {
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "update";
    audience: "all" | "trial" | "active";
    active: boolean;
  }) {
    const list = await this.getBroadcastAnnouncements();
    const id = crypto.randomUUID();
    const newEntry = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...list];

    await db
      .insert(schema.saasPlans)
      .values({
        id: "system_broadcast_announcements",
        name: "System Broadcast Announcements",
        price: "0",
        features: updated as any,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          features: updated as any,
          updatedAt: new Date().toISOString(),
        },
      });

    return newEntry;
  }

  async toggleBroadcastAnnouncement(id: string, active: boolean) {
    const list = await this.getBroadcastAnnouncements();
    const updated = list.map((item: any) =>
      item.id === id ? { ...item, active } : item
    );

    await db
      .insert(schema.saasPlans)
      .values({
        id: "system_broadcast_announcements",
        name: "System Broadcast Announcements",
        price: "0",
        features: updated as any,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          features: updated as any,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  async deleteBroadcastAnnouncement(id: string) {
    const list = await this.getBroadcastAnnouncements();
    const updated = list.filter((item: any) => item.id !== id);

    await db
      .insert(schema.saasPlans)
      .values({
        id: "system_broadcast_announcements",
        name: "System Broadcast Announcements",
        price: "0",
        features: updated as any,
      })
      .onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          features: updated as any,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  async getActiveBroadcastForStore(orgStatus?: string) {
    const list = await this.getBroadcastAnnouncements();
    const activeList = list.filter((a: any) => {
      if (!a.active) return false;
      if (a.audience === "all") return true;
      if (orgStatus && a.audience === orgStatus) return true;
      return false;
    });
    return activeList[0] || null;
  }
}

export const adminService = new AdminService();

