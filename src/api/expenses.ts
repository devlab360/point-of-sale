import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { expenseService } from "@/services/expense.service";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

export const getExpensesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        category: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { expenses, totalCount, totalAmount } = await expenseService.getExpenses(
        session.orgId,
        data,
      );
      return { success: true, data: expenses, total: totalCount, totalAmount };
    } catch (e) {
      return handleApiError(e);
    }
  });

const ExpenseInputSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  amount: z.union([z.string(), z.number()]),
  description: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const createExpenseFn = createServerFn({ method: "POST" })
  .validator(z.object({ expense: ExpenseInputSchema }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const created = await expenseService.createExpense(session.orgId, session.userId, {
        category: data.expense.category,
        amount: data.expense.amount,
        description: data.expense.description || undefined,
        date: data.expense.date || undefined,
        status: data.expense.status || undefined,
      });
      return { success: true, data: created, message: "Expense record created" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateExpenseFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      updates: ExpenseInputSchema.partial(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const updated = await expenseService.createExpense(session.orgId, session.userId, {
        id: data.id,
        category: data.updates.category || "General",
        amount: data.updates.amount || 0,
        description: data.updates.description || undefined,
        date: data.updates.date || undefined,
        status: data.updates.status || undefined,
      });
      return { success: true, data: updated, message: "Expense updated" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin();
      await expenseService.deleteExpense(session.orgId, data.id);
      return { success: true, message: "Expense record deleted" };
    } catch (e) {
      return handleApiError(e);
    }
  });
