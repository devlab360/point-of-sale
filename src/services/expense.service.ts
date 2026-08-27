import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/lib/errors/errors";

export interface ExpenseDTO {
  id?: string;
  category: string;
  amount: number | string;
  description?: string | null;
  date?: string | null;
  status?: string | null;
}

export interface ExpenseQueryFilters {
  page?: number;
  pageSize?: number;
  query?: string;
  category?: string;
}

export class ExpenseService {
  async getExpenses(orgId: string, filters: ExpenseQueryFilters) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;

    let conditions = [eq(schema.expenses.organizationId, orgId)];

    if (filters.query) {
      const searchCond = or(
        ilike(schema.expenses.category, `%${filters.query}%`),
        ilike(schema.expenses.description, `%${filters.query}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }
    if (filters.category) {
      conditions.push(eq(schema.expenses.category, filters.category));
    }

    const whereClause = and(...conditions);

    const expensesList = await db
      .select()
      .from(schema.expenses)
      .where(whereClause)
      .orderBy(desc(schema.expenses.date))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalCountRes = await db
      .select({ count: sql`count(*)`, totalAmount: sql`sum(COALESCE(${schema.expenses.amount}, 0))` })
      .from(schema.expenses)
      .where(whereClause);

    const totalCount = Number(totalCountRes[0]?.count || 0);
    const totalAmount = Number(totalCountRes[0]?.totalAmount || 0);

    return { expenses: expensesList, totalCount, totalAmount };
  }

  async createExpense(orgId: string, userId: string, dto: ExpenseDTO) {
    const expenseId = dto.id || uuidv4();
    const inserted = await db
      .insert(schema.expenses)
      .values({
        id: expenseId,
        organizationId: orgId,
        category: dto.category,
        amount: dto.amount.toString(),
        description: dto.description || `${dto.category} Expense`,
        date: dto.date ? new Date(dto.date).toISOString() : new Date().toISOString(),
        status: dto.status || "paid",
      })
      .returning();

    return inserted[0];
  }

  async deleteExpense(orgId: string, expenseId: string) {
    const existing = await db
      .select()
      .from(schema.expenses)
      .where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Expense record with ID ${expenseId} not found`);
    }

    await db
      .delete(schema.expenses)
      .where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.organizationId, orgId)));
  }
}

export const expenseService = new ExpenseService();
