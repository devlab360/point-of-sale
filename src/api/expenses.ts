import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.expenses
  ? createInsertSchema(schema.expenses).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.expenses ? createInsertSchema(schema.expenses).partial() : z.any();
import { eq, and } from "drizzle-orm";

import { v4 as uuidv4 } from "uuid";

export const getExpensesFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.expenses)
        .where(eq(schema.expenses.organizationId, orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const ExpenseInputSchema = z
  .object({
    id: z.string().optional(),
    date: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
  })
  .passthrough();

const CreateExpenseSchema = z.object({
  expense: ExpenseInputSchema,
});

export const createExpenseFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateExpenseSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const expenseData = {
        id: data.expense?.id || uuidv4(),
        organizationId: orgId,
        date: data.expense?.date
          ? new Date(data.expense.date).toISOString()
          : new Date().toISOString(),
        category: data.expense?.category || "General",
        description: data.expense?.description || "",
        amount:
          data.expense?.amount !== undefined ? Number(data.expense.amount).toFixed(2) : "0.00",
        status: data.expense?.status || "pending",
      };
      const inserted = await db.insert(schema.expenses).values(expenseData).returning();

      const userName = session.userName || session.userId || "User";
      await db.insert(schema.activityLog).values({
        id: uuidv4(),
        organizationId: orgId,
        user: userName,
        action: "Expense Created",
        details: `Recorded expense of ₹${expenseData.amount} under ${expenseData.category} (${expenseData.description})`,
        timestamp: new Date().toISOString(),
        type: "expense",
      });

      await db.insert(schema.notifications).values({
        id: uuidv4(),
        organizationId: orgId,
        title: "New Expense Added",
        description: `Expense of ₹${expenseData.amount} (${expenseData.category}) logged by ${userName}`,
        type: "expense",
        timestamp: new Date().toISOString(),
        read: false,
      });

      return { success: true, data: inserted[0], message: "Expense created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required"),
  expense: ExpenseInputSchema.partial(),
});

export const updateExpenseFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateExpenseSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.expenses)
        .set(data.expense as any)
        .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.organizationId, orgId)));
      return { success: true, message: "Expense updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required"),
});

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteExpenseSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .delete(schema.expenses)
        .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.organizationId, orgId)));
      return { success: true, message: "Expense deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
