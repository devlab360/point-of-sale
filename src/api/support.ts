import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// Help Articles (Docs & Videos)
// ==========================================

export const getHelpArticlesFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const articles = await db
        .select()
        .from(schema.helpArticles)
        .orderBy(desc(schema.helpArticles.createdAt));
      return { success: true, data: articles };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ==========================================
// FAQs
// ==========================================

export const getFaqsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const faqsList = await db.select().from(schema.faqs).orderBy(desc(schema.faqs.createdAt));
      return { success: true, data: faqsList };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ==========================================
// Support Tickets / Chat
// ==========================================

export const getSupportTicketsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    try {
      const tickets = await db
        .select()
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.organizationId, session.orgId))
        .orderBy(desc(schema.supportTickets.createdAt));
      return { success: true, data: tickets };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createSupportTicketFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    try {
      await db.insert(schema.supportTickets).values({
        id: uuidv4(),
        organizationId: session.orgId,
        userId: session.userId,
        subject: data.subject || "General Inquiry",
        message: data.message,
        status: "open",
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ==========================================
// Reviews
// ==========================================

export const getReviewsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    try {
      // Super admin sees all
      const reviewsList = await db
        .select()
        .from(schema.reviews)
        .orderBy(desc(schema.reviews.createdAt));
      return { success: true, data: reviewsList };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createReviewFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    try {
      await db.insert(schema.reviews).values({
        id: uuidv4(),
        organizationId: session.orgId,
        userId: session.userId,
        rating: data.rating,
        comment: data.comment,
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
