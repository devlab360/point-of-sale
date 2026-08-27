import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSuperAdminSession } from "@/lib/admin/auth-utils";
import { handleApiError } from "@/lib/error-utils";
import { z } from "zod";

export const getPendingPaymentsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({}).optional().parse(data || {}))
  .handler(async () => {
    try {
      await requireSuperAdminSession();
      const payments = await db
        .select()
        .from(schema.subscriptionPayments)
        .orderBy(desc(schema.subscriptionPayments.createdAt));
      return { success: true as const, data: JSON.parse(JSON.stringify(payments)) };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const approvePaymentFn = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { userId } = await requireSuperAdminSession();

      const payments = await db
        .select()
        .from(schema.subscriptionPayments)
        .where(eq(schema.subscriptionPayments.id, data.paymentId))
        .limit(1);
      if (!payments.length) return { success: false as const, error: "Payment not found" };
      const payment = payments[0];

      if (payment.status !== "pending")
        return { success: false as const, error: "Payment is already processed" };

      const plans = await db
        .select()
        .from(schema.saasPlans)
        .where(eq(schema.saasPlans.id, payment.planId))
        .limit(1);
      if (!plans.length) return { success: false as const, error: "Plan not found" };

      const extendDays = payment.billingCycle === "yearly" ? 365 : 30;

      const orgs = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, payment.organizationId))
        .limit(1);
      if (!orgs.length) return { success: false as const, error: "Organization not found" };
      const org = orgs[0];

      const currentExpiry = org.planExpiryDate ? new Date(org.planExpiryDate) : new Date();
      const newExpiry = new Date(
        Math.max(currentExpiry.getTime(), Date.now()) + extendDays * 24 * 60 * 60 * 1000,
      );
      const nowStr = new Date().toISOString();

      await db.transaction(async (tx) => {
        await tx
          .update(schema.subscriptionPayments)
          .set({
            status: "approved",
            reviewedBy: userId,
            reviewedAt: nowStr as any,
            updatedAt: nowStr as any,
          })
          .where(eq(schema.subscriptionPayments.id, payment.id));

        await tx
          .update(schema.organizations)
          .set({
            status: "active",
            currentPlanId: payment.planId,
            planExpiryDate: newExpiry.toISOString() as any,
          })
          .where(eq(schema.organizations.id, org.id));

        const subs = await tx
          .select()
          .from(schema.orgSubscriptions)
          .where(eq(schema.orgSubscriptions.organizationId, org.id))
          .limit(1);
        if (subs.length > 0) {
          await tx
            .update(schema.orgSubscriptions)
            .set({
              planId: payment.planId,
              billingCycle: payment.billingCycle,
              status: "active",
              expiryDate: newExpiry.toISOString(),
              updatedAt: nowStr,
            })
            .where(eq(schema.orgSubscriptions.organizationId, org.id));
        } else {
          await tx.insert(schema.orgSubscriptions).values({
            id: crypto.randomUUID(),
            organizationId: org.id,
            planId: payment.planId,
            billingCycle: payment.billingCycle,
            status: "active",
            startDate: nowStr,
            expiryDate: newExpiry.toISOString(),
            activatedBy: userId,
          } as any);
        }
      });

      return { success: true as const, message: "Payment approved successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const rejectPaymentFn = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { userId } = await requireSuperAdminSession();
      const nowStr = new Date().toISOString();
      await db
        .update(schema.subscriptionPayments)
        .set({
          status: "rejected",
          reviewedBy: userId,
          reviewedAt: nowStr as any,
          updatedAt: nowStr as any,
        })
        .where(eq(schema.subscriptionPayments.id, data.paymentId));
      return { success: true as const, message: "Payment rejected" };
    } catch (e) {
      return handleApiError(e);
    }
  });
