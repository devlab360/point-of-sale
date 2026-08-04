import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getGiftCardsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.giftCards)
        .where(eq(schema.giftCards.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createGiftCardFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const g = data?.card || data?.giftCard || data || {};
    try {
      const balanceNum = Number(g.balance) || 0;
      const cardData = {
        id: g.id || uuidv4(),
        organizationId: orgId,
        code: g.code || `GC-${Date.now().toString().slice(-6)}`,
        balance: balanceNum.toFixed(2),
        initialBalance: (Number(g.initialBalance) || balanceNum).toFixed(2),
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

      await db.insert(schema.giftCards).values(cardData);
      return { success: true, data: cardData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateGiftCardStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
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
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.transaction(async (tx) => {
        const card = await tx
          .select()
          .from(schema.giftCards)
          .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)))
          .limit(1);
        if (card.length > 0) {
          const currentBal = Number(card[0].balance) || 0;
          const addAmount = Number(data.amount) || 0;
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
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.giftCards)
        .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
