import { handleApiError } from "@/lib/error-utils";
import { notDeleted } from "@/lib/soft-delete";
import { isProduction } from "@/lib/env";
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
        .where(and(eq(schema.users.id, session.userId), notDeleted(schema.users.deletedAt)))
        .limit(1);
      if (!users.length) return { success: true as const, data: [] };
      const email = users[0].email;

      // Match by email across orgs (each org has its own user row for this owner).
      const myUserRows = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.email, email), notDeleted(schema.users.deletedAt)));
      const orgIds = myUserRows
        .map((u) => u.organizationId)
        .filter((id): id is string => Boolean(id));

      const orgs = orgIds.length
        ? await db
            .select()
            .from(schema.organizations)
            .where(
              and(
                or(...orgIds.map((id) => eq(schema.organizations.id, id))),
                notDeleted(schema.organizations.deletedAt),
              ),
            )
        : [];

      // Get memberships for these orgs, matching by email (join with users)
      const memberships = orgIds.length
        ? await db
            .select({
              organizationId: schema.organizationMemberships.organizationId,
              role: schema.organizationMemberships.role,
              userId: schema.organizationMemberships.userId,
            })
            .from(schema.organizationMemberships)
            .innerJoin(schema.users, eq(schema.organizationMemberships.userId, schema.users.id))
            .where(
              and(
                or(...orgIds.map((id) => eq(schema.organizationMemberships.organizationId, id))),
                eq(schema.users.email, email),
                notDeleted(schema.organizationMemberships.deletedAt),
              ),
            )
        : [];

      const branches = orgIds.length
        ? await db
            .select()
            .from(schema.locations)
            .where(
              and(
                or(...orgIds.map((id) => eq(schema.locations.organizationId, id))),
                notDeleted(schema.locations.deletedAt),
              ),
            )
        : [];

      // Map each org with its user row role and branch list.
      const data = orgs.map((org) => {
        const userRow = myUserRows.find((u) => u.organizationId === org.id);
        const membership = memberships.find((m) => m.organizationId === org.id);
        return {
          id: org.id,
          code: org.code || `ORG-${org.id.slice(0, 6).toUpperCase()}`,
          name: org.name,
          ownerEmail: org.ownerEmail,
          status: org.status,
          industryType: org.industryType,
          branchPricingEnabled: org.branchPricingEnabled,
          role: membership?.role || userRow?.role || "admin",
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
  locationId: z.string().optional(),
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
        .where(and(eq(schema.users.id, session.userId), notDeleted(schema.users.deletedAt)))
        .limit(1);
      if (!users.length) throw new Error("User not found");
      const email = users[0].email;

      // Find the user row for this email within the target org.
      const target = await db
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.email, email),
            eq(schema.users.organizationId, data.orgId),
            notDeleted(schema.users.deletedAt),
          ),
        )
        .limit(1);
      if (!target.length) throw new Error("You do not have access to this business");

      if (data.locationId) {
        const branch = await db
          .select()
          .from(schema.locations)
          .where(
            and(
              eq(schema.locations.id, data.locationId),
              eq(schema.locations.organizationId, data.orgId),
              notDeleted(schema.locations.deletedAt),
            ),
          )
          .limit(1);
        if (!branch.length) throw new Error("Branch not found in this business");
      }

      let activeLocationId = data.locationId;
      if (!activeLocationId) {
        // Try user's default branch
        const defaultUserBranch = await db
          .select({ locationId: schema.userBranches.locationId })
          .from(schema.userBranches)
          .where(
            and(
              eq(schema.userBranches.organizationId, data.orgId),
              eq(schema.userBranches.userId, target[0].id),
              eq(schema.userBranches.isDefault, true),
              notDeleted(schema.userBranches.deletedAt),
            ),
          )
          .limit(1);
        if (defaultUserBranch.length > 0) {
          activeLocationId = defaultUserBranch[0].locationId;
        } else {
          // Fall back to first active location of the org
          const firstLoc = await db
            .select({ id: schema.locations.id })
            .from(schema.locations)
            .where(
              and(
                eq(schema.locations.organizationId, data.orgId),
                notDeleted(schema.locations.deletedAt),
              ),
            )
            .limit(1);
          if (firstLoc.length > 0) {
            activeLocationId = firstLoc[0].id;
          }
        }
      }

      const token = await createSessionToken({
        userId: target[0].id,
        orgId: data.orgId,
        role: target[0].role,
        userName: target[0].name,
        locationId: activeLocationId || null,
      });

      setCookie("pos_auth_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      setCookie("pos_session_org", data.orgId, { path: "/", maxAge: 7 * 24 * 60 * 60 });
      if (activeLocationId) {
        setCookie("pos_session_branch", activeLocationId, { path: "/", maxAge: 7 * 24 * 60 * 60 });
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
      const orgCode = `ORG-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.transaction(async (tx) => {
        await tx.insert(schema.organizations).values({
          id: orgId,
          code: orgCode,
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
      let locationId =
        getCookie("pos_session_branch") && getCookie("pos_session_branch") !== "undefined"
          ? getCookie("pos_session_branch")
          : session.locationId || null;

      if (!locationId) {
        const firstLoc = await db
          .select({ id: schema.locations.id })
          .from(schema.locations)
          .where(
            and(
              eq(schema.locations.organizationId, session.orgId),
              notDeleted(schema.locations.deletedAt),
            ),
          )
          .limit(1);
        if (firstLoc.length > 0) {
          locationId = firstLoc[0].id;
          setCookie("pos_session_branch", locationId, { path: "/", maxAge: 7 * 24 * 60 * 60 });
        }
      }

      return {
        success: true as const,
        data: { orgId: session.orgId, locationId: locationId || null },
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
        .where(and(eq(schema.users.id, session.userId), notDeleted(schema.users.deletedAt)))
        .limit(1);
      if (!currentUserRows.length) throw new Error("User not found");
      const currentUser = currentUserRows[0];
      const email = currentUser.email.toLowerCase();

      // Check if user is owner of the target organization
      // Match membership by email (join with users table) since membership userId may differ from session userId
      const membership = await db
        .select({
          role: schema.organizationMemberships.role,
        })
        .from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.organizationMemberships.userId, schema.users.id))
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, data.orgId),
            eq(schema.users.email, email),
            notDeleted(schema.organizationMemberships.deletedAt),
          ),
        )
        .limit(1);
      if (!membership.length || membership[0].role !== "owner") {
        throw new Error("Only the owner can delete this organization");
      }

      // Count total organizations this user owns (by email)
      const userMemberships = await db
        .select()
        .from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.organizationMemberships.userId, schema.users.id))
        .where(
          and(
            eq(schema.users.email, email),
            eq(schema.organizationMemberships.role, "owner"),
            notDeleted(schema.organizationMemberships.deletedAt),
          ),
        );
      if (userMemberships.length <= 1) {
        throw new Error(
          "Cannot delete the last organization. At least one organization must remain.",
        );
      }

      if (!data.confirmDelete) {
        throw new Error("Please confirm deletion by setting confirmDelete to true");
      }

      // Verify the org exists and get its owner email
      const org = await db
        .select()
        .from(schema.organizations)
        .where(
          and(eq(schema.organizations.id, data.orgId), notDeleted(schema.organizations.deletedAt)),
        )
        .limit(1);
      if (!org.length) throw new Error("Organization not found");

      // Soft-delete organization and its memberships (preserves data lifecycle)
      await db.transaction(async (tx) => {
        const now = new Date().toISOString();
        await tx
          .update(schema.organizationMemberships)
          .set({ deletedAt: now })
          .where(eq(schema.organizationMemberships.organizationId, data.orgId));

        await tx
          .update(schema.organizations)
          .set({ deletedAt: now, status: "deleted" })
          .where(eq(schema.organizations.id, data.orgId));
      });

      // If the deleted org was the active one, switch to the first remaining org
      const remainingMemberships = await db
        .select()
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.userId, currentUser.id),
            eq(schema.organizationMemberships.role, "owner"),
            notDeleted(schema.organizationMemberships.deletedAt),
          ),
        );
      let message = "Organization deleted successfully";
      if (remainingMemberships.length > 0 && session.orgId === data.orgId) {
        const firstOrg = remainingMemberships[0].organizationId;
        const firstUser = await db
          .select()
          .from(schema.users)
          .where(
            and(
              eq(schema.users.email, email),
              eq(schema.users.organizationId, firstOrg),
              notDeleted(schema.users.deletedAt),
            ),
          )
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
            secure: isProduction,
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
