import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getLoyaltyMembersFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.loyaltyMembers)
        .where(eq(schema.loyaltyMembers.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createLoyaltyMemberFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.insert(schema.loyaltyMembers).values({
        id: data.member.id || uuidv4(),
        organizationId: orgId,
        customerName: data.member.customerName,
        phone: data.member.phone,
        points: data.member.points || 0,
        tier: data.member.tier || "Bronze",
        joinedAt: data.member.joinedAt
          ? new Date(data.member.joinedAt).toISOString()
          : new Date().toISOString(),
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateLoyaltyMemberFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .update(schema.loyaltyMembers)
        .set({
          customerName: data.member.customerName,
          phone: data.member.phone,
          points: data.member.points,
          tier: data.member.tier,
        })
        .where(
          and(
            eq(schema.loyaltyMembers.id, data.id),
            eq(schema.loyaltyMembers.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteLoyaltyMemberFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.loyaltyMembers)
        .where(
          and(
            eq(schema.loyaltyMembers.id, data.id),
            eq(schema.loyaltyMembers.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
