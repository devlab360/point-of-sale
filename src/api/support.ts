import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { notDeleted } from "@/lib/soft-delete";

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
        .where(notDeleted(schema.helpArticles.deletedAt))
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
      const faqsList = await db
        .select()
        .from(schema.faqs)
        .where(notDeleted(schema.faqs.deletedAt))
        .orderBy(desc(schema.faqs.createdAt));
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
        .where(
          and(
            eq(schema.supportTickets.organizationId, session.orgId),
            notDeleted(schema.supportTickets.deletedAt),
          ),
        )
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
      // Super admin sees all; everyone else only sees their own org's reviews
      const reviewsList =
        session.role === "super_admin"
          ? await db
              .select()
              .from(schema.reviews)
              .where(notDeleted(schema.reviews.deletedAt))
              .orderBy(desc(schema.reviews.createdAt))
          : await db
              .select()
              .from(schema.reviews)
              .where(
                and(
                  eq(schema.reviews.organizationId, session.orgId),
                  notDeleted(schema.reviews.deletedAt),
                ),
              )
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
