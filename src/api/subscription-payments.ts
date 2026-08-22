import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const submitPaymentProofFn = createServerFn({ method: "POST" })
  .validator(z.object({
    planId: z.string().min(1),
    utrNumber: z.string().min(3),
    paymentMethod: z.string(),
    note: z.string().optional(),
    amount: z.number().optional(),
    billingCycle: z.enum(["monthly", "yearly", "trial", "custom"]).optional().default("monthly"),
  }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      if (!session.orgId) return { success: false as const, error: "Unauthorized: No Org ID" };

      // Validate plan exists
      const plan = await db.select().from(schema.saasPlans).where(eq(schema.saasPlans.id, data.planId)).limit(1);
      if (!plan.length) return { success: false as const, error: "Selected plan does not exist" };

      const paymentId = uuidv4();
      await db.insert(schema.subscriptionPayments).values({
        id: paymentId,
        organizationId: session.orgId,
        planId: data.planId,
        utrNumber: data.utrNumber,
        paymentMethod: data.paymentMethod,
        note: data.note,
        amount: data.amount != null ? String(data.amount) : undefined,
        billingCycle: data.billingCycle,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true as const, message: "Payment proof submitted successfully" };
    } catch (error: any) {
      console.error("Submit payment error:", error);
      return { success: false as const, error: error.message || "Failed to submit payment proof" };
    }
  });
