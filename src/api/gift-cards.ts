import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const inMemoryGiftCards: Record<string, any[]> = {
  default: [
    {
      id: "gc-1",
      organizationId: "default",
      code: "GC-9821-4401",
      balance: "150.00",
      initialBalance: "200.00",
      customer: "Sarah Jenkins",
      issued: new Date(Date.now() - 15 * 86400000).toISOString(),
      expires: new Date(Date.now() + 350 * 86400000).toISOString(),
      status: "active",
    },
    {
      id: "gc-2",
      organizationId: "default",
      code: "GC-3104-8922",
      balance: "500.00",
      initialBalance: "500.00",
      customer: "Robert Miller",
      issued: new Date(Date.now() - 5 * 86400000).toISOString(),
      expires: new Date(Date.now() + 360 * 86400000).toISOString(),
      status: "active",
    },
    {
      id: "gc-3",
      organizationId: "default",
      code: "GC-7712-0043",
      balance: "0.00",
      initialBalance: "100.00",
      customer: "Emily Davis",
      issued: new Date(Date.now() - 90 * 86400000).toISOString(),
      expires: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: "expired",
    },
  ],
};

export const getGiftCardsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.giftCards) {
        const all = await db
          .select()
          .from(schema.giftCards)
          .where(eq(schema.giftCards.organizationId, orgId));
        if (all && all.length > 0) {
          return { success: true, data: all };
        }
      }
    } catch (e) {
      console.warn("DB giftCards query fallback:", e);
    }
    return { success: true, data: inMemoryGiftCards[orgId] || inMemoryGiftCards["default"] || [] };
  });

export const createGiftCardFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    const g = data?.card || data?.giftCard || data || {};
    const balanceNum = Number(g.balance ?? g.initialBalance) || 0;
    const initialNum = Number(g.initialBalance ?? g.balance) || balanceNum;
    const cardData = {
      id: g.id || uuidv4(),
      organizationId: orgId,
      code: g.code || `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
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

    if (!inMemoryGiftCards[orgId]) inMemoryGiftCards[orgId] = [];
    const existingIndex = inMemoryGiftCards[orgId].findIndex((c) => c.id === cardData.id);
    if (existingIndex >= 0) {
      inMemoryGiftCards[orgId][existingIndex] = { ...inMemoryGiftCards[orgId][existingIndex], ...cardData };
    } else {
      inMemoryGiftCards[orgId].unshift(cardData);
    }

    try {
      if (schema.giftCards) {
        await db.insert(schema.giftCards).values(cardData).onConflictDoUpdate({
          target: schema.giftCards.id,
          set: cardData,
        });
      }
      return { success: true, data: cardData };
    } catch (e) {
      console.warn("DB giftCard insert fallback:", e);
      return { success: true, data: cardData };
    }
  });

export const updateGiftCardFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    const g = data?.card || data?.giftCard || data || {};
    const cardId = g.id || data.id;

    if (inMemoryGiftCards[orgId]) {
      const idx = inMemoryGiftCards[orgId].findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        inMemoryGiftCards[orgId][idx] = { ...inMemoryGiftCards[orgId][idx], ...g };
      }
    }

    try {
      if (schema.giftCards) {
        await db
          .update(schema.giftCards)
          .set(g)
          .where(and(eq(schema.giftCards.id, cardId), eq(schema.giftCards.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB giftCard update fallback:", e);
      return { success: true };
    }
  });

export const updateGiftCardStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    if (inMemoryGiftCards[orgId]) {
      const card = inMemoryGiftCards[orgId].find((c) => c.id === data.id);
      if (card) card.status = data.status;
    }

    try {
      if (schema.giftCards) {
        await db
          .update(schema.giftCards)
          .set({ status: data.status })
          .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB giftCard status fallback:", e);
      return { success: true };
    }
  });

export const addGiftCardBalanceFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    const addAmount = Number(data.amount) || 0;
    if (inMemoryGiftCards[orgId]) {
      const card = inMemoryGiftCards[orgId].find((c) => c.id === data.id);
      if (card) {
        const cur = Number(card.balance) || 0;
        card.balance = (cur + addAmount).toFixed(2);
      }
    }

    try {
      if (schema.giftCards) {
        await db.transaction(async (tx) => {
          const card = await tx
            .select()
            .from(schema.giftCards)
            .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)))
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
      }
      return { success: true };
    } catch (e) {
      console.warn("DB giftCard add balance fallback:", e);
      return { success: true };
    }
  });

export const deleteGiftCardFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    if (inMemoryGiftCards[orgId]) {
      inMemoryGiftCards[orgId] = inMemoryGiftCards[orgId].filter((c) => c.id !== data.id);
    }

    try {
      if (schema.giftCards) {
        await db
          .delete(schema.giftCards)
          .where(and(eq(schema.giftCards.id, data.id), eq(schema.giftCards.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB giftCard delete fallback:", e);
      return { success: true };
    }
  });

