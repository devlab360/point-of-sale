import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { notDeleted } from "@/lib/soft-delete";

const GiftCardInputSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    balance: z.union([z.string(), z.number()]).optional(),
    initialBalance: z.union([z.string(), z.number()]).optional(),
    customer: z.string().nullable().optional(),
    customerName: z.string().nullable().optional(),
    issued: z.string().optional(),
    issueDate: z.string().optional(),
    expires: z.string().optional(),
    expiryDate: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const getGiftCardsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.giftCards)
        .where(
          and(eq(schema.giftCards.organizationId, orgId), notDeleted(schema.giftCards.deletedAt)),
        );
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createGiftCardFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        card: GiftCardInputSchema.optional(),
        giftCard: GiftCardInputSchema.optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const g = (data as any)?.card || (data as any)?.giftCard || data || {};
      const balanceNum = Number(g.balance ?? g.initialBalance) || 0;
      const initialNum = Number(g.initialBalance ?? g.balance) || balanceNum;

      const cardData = {
        id: g.id || uuidv4(),
        organizationId: orgId,
        code:
          g.code ||
          `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        balance: balanceNum.toFixed(2),
        initialBalance: initialNum.toFixed(2),
        customer: g.customer || g.customerName || null,
        issued: g.issued
          ? new Date(g.issued).toISOString()
          : g.issueDate
            ? new Date(g.issueDate).toISOString()
            : new Date().toISOString(),
        expires: g.expires
          ? new Date(g.expires).toISOString()
          : g.expiryDate
            ? new Date(g.expiryDate).toISOString()
            : new Date(Date.now() + 365 * 86400000).toISOString(),
        status: g.status || "active",
      };

      const inserted = await db
        .insert(schema.giftCards)
        .values(cardData)
        .onConflictDoUpdate({
          target: schema.giftCards.id,
          set: cardData,
        })
        .returning();
      return { success: true, data: inserted[0] || cardData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateGiftCardFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        id: z.string().optional(),
        card: GiftCardInputSchema.optional(),
        giftCard: GiftCardInputSchema.optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const g = (data as any)?.card || (data as any)?.giftCard || data || {};
      const cardId = g.id || (data as any).id;
      const { organizationId: _omitted, id: _id, ...safeUpdates } = g;

      await db
        .update(schema.giftCards)
        .set(safeUpdates)
        .where(and(eq(schema.giftCards.id, cardId), eq(schema.giftCards.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateGiftCardStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["active", "expired", "redeemed", "suspended"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.giftCards)
        .set({ status: data.status })
        .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const addGiftCardBalanceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      amount: z.union([z.string(), z.number()]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const addAmount = Number(data.amount) || 0;

      await db.transaction(async (tx) => {
        const card = await tx
          .select()
          .from(schema.giftCards)
          .where(
            and(
              eq(schema.giftCards.id, data.id),
              eq(schema.giftCards.organizationId, orgId),
              notDeleted(schema.giftCards.deletedAt),
            ),
          )
          .limit(1);
        if (card.length > 0) {
          const currentBal = Number(card[0].balance) || 0;
          const newBalance = (currentBal + addAmount).toFixed(2);
          await tx
            .update(schema.giftCards)
            .set({ balance: newBalance })
            .where(
              and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)),
            );
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteGiftCardFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.giftCards)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const redeemGiftCardFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(1, "Gift card code is required"),
      amount: z.union([z.string(), z.number()]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const redeemAmount = Number(data.amount) || 0;

      if (redeemAmount <= 0) {
        return { success: false, error: "Redemption amount must be greater than zero" };
      }

      let resultCard: any = null;
      await db.transaction(async (tx) => {
        const card = await tx
          .select()
          .from(schema.giftCards)
          .where(
            and(
              eq(schema.giftCards.code, data.code.trim()),
              eq(schema.giftCards.organizationId, orgId),
              notDeleted(schema.giftCards.deletedAt),
            ),
          )
          .limit(1);

        if (card.length === 0) {
          throw new Error("Gift card not found");
        }

        const gc = card[0];
        if (gc.status !== "active") {
          throw new Error(`Gift card is ${gc.status}`);
        }

        if (gc.expires && new Date(gc.expires) < new Date()) {
          throw new Error("Gift card has expired");
        }

        const currentBalance = Number(gc.balance) || 0;
        if (currentBalance < redeemAmount) {
          throw new Error(
            `Insufficient gift card balance. Available: ₹${currentBalance.toFixed(2)}`,
          );
        }

        const newBalance = Math.max(0, currentBalance - redeemAmount);
        const newStatus = newBalance === 0 ? "used" : "active";

        const updated = await tx
          .update(schema.giftCards)
          .set({
            balance: newBalance.toFixed(2),
            status: newStatus,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.giftCards.id, gc.id))
          .returning();

        resultCard = updated[0];
      });

      return {
        success: true,
        data: resultCard,
        remainingBalance: Number(resultCard?.balance || 0),
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
