import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth, createSessionToken } from "@/lib/auth-utils";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcryptjs";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// List all businesses (organizations) the authenticated user belongs to.
export const getMyOrganizationsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!users.length) return { success: true as const, data: [] };
      const email = users[0].email;

      // Match by email across orgs (each org has its own user row for this owner).
      const myUserRows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email));
      const orgIds = myUserRows
        .map((u) => u.organizationId)
        .filter((id): id is string => Boolean(id));

      const orgs = orgIds.length
        ? await db
            .select()
            .from(schema.organizations)
            .where(
              or(...orgIds.map((id) => eq(schema.organizations.id, id))),
            )
        : [];

      const branches = orgIds.length
        ? await db
            .select()
            .from(schema.locations)
            .where(
              or(...orgIds.map((id) => eq(schema.locations.organizationId, id))),
            )
        : [];

      // Map each org with its user row role and branch list.
      const data = orgs.map((org) => {
        const userRow = myUserRows.find((u) => u.organizationId === org.id);
        return {
          id: org.id,
          name: org.name,
          ownerEmail: org.ownerEmail,
          status: org.status,
          industryType: org.industryType,
          branchPricingEnabled: org.branchPricingEnabled,
          role: userRow?.role || "admin",
          branches: branches
            .filter((b) => b.organizationId === org.id)
            .map((b) => ({
              id: b.id,
              name: b.name,
              type: b.type,
              status: b.status,
              code: b.code,
              isHeadOffice: b.isHeadOffice,
            })),
        };
      });

      return { success: true as const, data };
    } catch (e) {
      return handleApiError(e);
    }
  });

const SwitchOrganizationSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  branchId: z.string().optional(),
});

// Switch the active business (and optionally active branch) for the session.
export const switchOrganizationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => SwitchOrganizationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const users = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!users.length) throw new Error("User not found");
      const email = users[0].email;

      // Find the user row for this email within the target org.
      const target = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, email), eq(schema.users.organizationId, data.orgId)))
        .limit(1);
      if (!target.length) throw new Error("You do not have access to this business");

      if (data.branchId) {
        const branch = await db
          .select()
          .from(schema.locations)
          .where(
            and(eq(schema.locations.id, data.branchId), eq(schema.locations.organizationId, data.orgId)),
          )
          .limit(1);
        if (!branch.length) throw new Error("Branch not found in this business");
      }

      const token = await createSessionToken({
        userId: target[0].id,
        orgId: data.orgId,
        role: target[0].role,
        userName: target[0].name,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      setCookie("pos_session_org", data.orgId, { path: "/", maxAge: 7 * 24 * 60 * 60 });
      if (data.branchId) {
        setCookie("pos_session_branch", data.branchId, { path: "/", maxAge: 7 * 24 * 60 * 60 });
      }

      return { success: true as const, message: "Switched business successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  industryType: z.string().min(1, "Industry type is required"),
  planId: z.string().optional().default("basic"),
  ownEmail: z.boolean().optional().default(true), // Reuse current owner email
});

// Create a new business (organization) for the authenticated owner. Reuses the owner identity.
export const createBusinessFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateBusinessSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const currentUserRows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!currentUserRows.length) throw new Error("User not found");
      const owner = currentUserRows[0];
      const email = owner.email.toLowerCase();

      const orgId = uuidv4();
      const ownerId = uuidv4();

      await db.transaction(async (tx) => {
        await tx.insert(schema.organizations).values({
          id: orgId,
          name: data.name,
          ownerEmail: email,
          status: "trial",
          currentPlanId: data.planId,
          industryType: data.industryType,
        });

        await tx.insert(schema.users).values({
          id: ownerId,
          organizationId: orgId,
          name: owner.name,
          email,
          role: "admin",
          status: "active",
          permissions: ["all"],
          joined: new Date().toISOString(),
        });

        await tx.insert(schema.organizationMemberships).values({
          id: uuidv4(),
          organizationId: orgId,
          userId: ownerId,
          role: "owner",
          status: "active",
        });

        await tx.insert(schema.settings).values({
          id: uuidv4(),
          organizationId: orgId,
          storeName: data.name,
          email,
          subscriptionStatus: "trial",
          currencySymbol: "$",
          currencyCode: "USD",
          businessType: data.industryType,
          headerNote: `Welcome to ${data.name}`,
          footerNote: "Thank you for your business!",
          emailReceiptDefault: true,
          printStoreLogo: true,
        });

        // Create a default head-office branch/outlet.
        // Disabled: branches should be created manually via Settings > Multi-Location for consistency with register flow
        // await tx.insert(schema.locations).values({
        //   id: uuidv4(),
        //   organizationId: orgId,
        //   name: `${data.name} - Main`,
        //   type: "branch",
        //   status: "active",
        //   industryType: data.industryType,
        //   isHeadOffice: true,
        // });
      });

      return { success: true as const, orgId, message: "Business created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// Expose the active branch id from session cookie for client-side reads.
export const getActiveSessionFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const branchId =
        getCookie("pos_session_branch") && getCookie("pos_session_branch") !== "undefined"
          ? getCookie("pos_session_branch")
          : null;
      return {
        success: true as const,
        data: { orgId: session.orgId, branchId: branchId || null },
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteOrganizationSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  confirmDelete: z.boolean().default(false),
});

// Delete an organization (only owner can delete, must keep at least 1 org)
export const deleteOrganizationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteOrganizationSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const currentUserRows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);
      if (!currentUserRows.length) throw new Error("User not found");
      const currentUser = currentUserRows[0];
      const email = currentUser.email.toLowerCase();

      // Check if user is owner of the target organization
      const membership = await db
        .select()
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, data.orgId),
            eq(schema.organizationMemberships.userId, currentUser.id),
          ),
        )
        .limit(1);
      if (!membership.length || membership[0].role !== "owner") {
        throw new Error("Only the owner can delete this organization");
      }

      // Count total organizations this user owns
      const userMemberships = await db
        .select()
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.userId, currentUser.id),
            eq(schema.organizationMemberships.role, "owner"),
          ),
        );
      if (userMemberships.length <= 1) {
        throw new Error("Cannot delete the last organization. At least one organization must remain.");
      }

      if (!data.confirmDelete) {
        throw new Error("Please confirm deletion by setting confirmDelete to true");
      }

      // Verify the org exists and get its owner email
      const org = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, data.orgId))
        .limit(1);
      if (!org.length) throw new Error("Organization not found");

      // Delete in transaction (cascades handle most, but we clean up explicitly)
      await db.transaction(async (tx) => {
        // Delete related data
        await tx.delete(schema.locations).where(eq(schema.locations.organizationId, data.orgId));
        await tx.delete(schema.settings).where(eq(schema.settings.organizationId, data.orgId));
        await tx.delete(schema.users).where(eq(schema.users.organizationId, data.orgId));
        await tx.delete(schema.organizationMemberships).where(eq(schema.organizationMemberships.organizationId, data.orgId));
        await tx.delete(schema.branchPriceOverrides).where(eq(schema.branchPriceOverrides.organizationId, data.orgId));
        await tx.delete(schema.products).where(eq(schema.products.organizationId, data.orgId));
        await tx.delete(schema.services).where(eq(schema.services.organizationId, data.orgId));
        await tx.delete(schema.categories).where(eq(schema.categories.organizationId, data.orgId));
        await tx.delete(schema.brands).where(eq(schema.brands.organizationId, data.orgId));
        await tx.delete(schema.units).where(eq(schema.units.organizationId, data.orgId));
        await tx.delete(schema.customers).where(eq(schema.customers.organizationId, data.orgId));
        await tx.delete(schema.suppliers).where(eq(schema.suppliers.organizationId, data.orgId));
        await tx.delete(schema.taxMasters).where(eq(schema.taxMasters.organizationId, data.orgId));
        await tx.delete(schema.expenses).where(eq(schema.expenses.organizationId, data.orgId));
        await tx.delete(schema.appointments).where(eq(schema.appointments.organizationId, data.orgId));
        await tx.delete(schema.rentals).where(eq(schema.rentals.organizationId, data.orgId));
        await tx.delete(schema.restaurantTables).where(eq(schema.restaurantTables.organizationId, data.orgId));
        await tx.delete(schema.kitchenOrderTickets).where(eq(schema.kitchenOrderTickets.organizationId, data.orgId));
        await tx.delete(schema.sales).where(eq(schema.sales.organizationId, data.orgId));
        await tx.delete(schema.purchases).where(eq(schema.purchases.organizationId, data.orgId));
        await tx.delete(schema.inventoryMovements).where(eq(schema.inventoryMovements.organizationId, data.orgId));
        await tx.delete(schema.inventoryAdjustments).where(eq(schema.inventoryAdjustments.organizationId, data.orgId));
        await tx.delete(schema.inventoryTransfers).where(eq(schema.inventoryTransfers.organizationId, data.orgId));
        await tx.delete(schema.productInventory).where(eq(schema.productInventory.organizationId, data.orgId));
        await tx.delete(schema.coupons).where(eq(schema.coupons.organizationId, data.orgId));
        await tx.delete(schema.giftCards).where(eq(schema.giftCards.organizationId, data.orgId));
        await tx.delete(schema.promotions).where(eq(schema.promotions.organizationId, data.orgId));
        await tx.delete(schema.heldInvoices).where(eq(schema.heldInvoices.organizationId, data.orgId));
        await tx.delete(schema.salesReturns).where(eq(schema.salesReturns.organizationId, data.orgId));
        await tx.delete(schema.purchaseReturns).where(eq(schema.purchaseReturns.organizationId, data.orgId));
        await tx.delete(schema.purchaseReturnItems).where(eq(schema.purchaseReturnItems.organizationId, data.orgId));
        await tx.delete(schema.salesReturnItems).where(eq(schema.salesReturnItems.organizationId, data.orgId));
        await tx.delete(schema.saleItems).where(eq(schema.saleItems.organizationId, data.orgId));
        await tx.delete(schema.salePayments).where(eq(schema.salePayments.organizationId, data.orgId));
        await tx.delete(schema.purchaseItems).where(eq(schema.purchaseItems.organizationId, data.orgId));
        await tx.delete(schema.shifts).where(eq(schema.shifts.organizationId, data.orgId));
        await tx.delete(schema.cashMovements).where(eq(schema.cashMovements.organizationId, data.orgId));
        await tx.delete(schema.activityLog).where(eq(schema.activityLog.organizationId, data.orgId));
        await tx.delete(schema.notifications).where(eq(schema.notifications.organizationId, data.orgId));
        await tx.delete(schema.customerLedgers).where(eq(schema.customerLedgers.organizationId, data.orgId));
        await tx.delete(schema.supplierLedgers).where(eq(schema.supplierLedgers.organizationId, data.orgId));
        await tx.delete(schema.accounts).where(eq(schema.accounts.organizationId, data.orgId));
        await tx.delete(schema.vouchers).where(eq(schema.vouchers.organizationId, data.orgId));
        await tx.delete(schema.subscriptions).where(eq(schema.subscriptions.organizationId, data.orgId));
        await tx.delete(schema.subscriptionPayments).where(eq(schema.subscriptionPayments.organizationId, data.orgId));
        await tx.delete(schema.invitations).where(eq(schema.invitations.organizationId, data.orgId));
        await tx.delete(schema.adminMenuGrants).where(eq(schema.adminMenuGrants.organizationId, data.orgId));

        // Finally delete the organization
        await tx.delete(schema.organizations).where(eq(schema.organizations.id, data.orgId));
      });

      // If the deleted org was the active one, switch to the first remaining org
      const remainingMemberships = await db
        .select()
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.userId, currentUser.id),
            eq(schema.organizationMemberships.role, "owner"),
          ),
        );
      let message = "Organization deleted successfully";
      if (remainingMemberships.length > 0 && session.orgId === data.orgId) {
        const firstOrg = remainingMemberships[0].organizationId;
        const firstUser = await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.email, email), eq(schema.users.organizationId, firstOrg)))
          .limit(1);
        if (firstUser.length) {
          const token = await createSessionToken({
            userId: firstUser[0].id,
            orgId: firstOrg,
            role: firstUser[0].role,
            userName: firstUser[0].name,
          });
          setCookie("pos_auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
          });
          setCookie("pos_session_org", firstOrg, { path: "/", maxAge: 7 * 24 * 60 * 60 });
          message = "Organization deleted. Switched to your next business.";
        }
      }

      return { success: true as const, message };
    } catch (e) {
      return handleApiError(e);
    }
  });
