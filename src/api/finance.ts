import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// --- Expenses ---
export const getExpensesFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.expenses)
        .where(eq(schema.expenses.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createExpenseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db.insert(schema.expenses).values({
        id: uuidv4(),
        organizationId: orgId,
        date: new Date(data.date).toISOString(),
        category: data.category,
        description: data.description,
        amount: data.amount.toString(),
        status: data.status,
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateExpenseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.expenses)
        .set({
          date: new Date(data.date).toISOString(),
          category: data.category,
          description: data.description,
          amount: data.amount.toString(),
          status: data.status,
        })
        .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .delete(schema.expenses)
        .where(and(eq(schema.expenses.id, data.id), eq(schema.expenses.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- Accounts ---
export const getAccountsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createAccountFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db.insert(schema.accounts).values({
        id: uuidv4(),
        organizationId: orgId,
        code: data.code,
        name: data.name,
        type: data.type,
        balance: data.balance.toString(),
        isSystem: data.isSystem || false,
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateAccountFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.accounts)
        .set({
          code: data.code,
          name: data.name,
          type: data.type,
          balance: data.balance.toString(),
        })
        .where(and(eq(schema.accounts.id, data.id), eq(schema.accounts.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteAccountFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .delete(schema.accounts)
        .where(and(eq(schema.accounts.id, data.id), eq(schema.accounts.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const seedDefaultAccountsFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const existing = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.organizationId, orgId));

      const existingCodes = new Set(existing.map((a) => a.code));

      const standardAccounts = [
        { code: "1001", name: "Cash on Hand", type: "asset", balance: "0", isSystem: true },
        {
          code: "1002",
          name: "Bank Account (Primary)",
          type: "asset",
          balance: "0",
          isSystem: true,
        },
        {
          code: "1003",
          name: "Accounts Receivable (Customer Due)",
          type: "asset",
          balance: "0",
          isSystem: true,
        },
        {
          code: "1004",
          name: "Merchandise Inventory",
          type: "asset",
          balance: "0",
          isSystem: true,
        },
        {
          code: "1005",
          name: "Undeposited Funds / POS Drawer",
          type: "asset",
          balance: "0",
          isSystem: true,
        },
        {
          code: "2001",
          name: "Accounts Payable (Supplier Due)",
          type: "liability",
          balance: "0",
          isSystem: true,
        },
        {
          code: "2002",
          name: "VAT / Sales Tax Payable",
          type: "liability",
          balance: "0",
          isSystem: true,
        },
        {
          code: "2003",
          name: "GST Output Tax Payable",
          type: "liability",
          balance: "0",
          isSystem: true,
        },
        {
          code: "3001",
          name: "Owner's Equity & Capital",
          type: "equity",
          balance: "0",
          isSystem: true,
        },
        { code: "3002", name: "Retained Earnings", type: "equity", balance: "0", isSystem: true },
        { code: "4001", name: "Sales Revenue", type: "income", balance: "0", isSystem: true },
        {
          code: "4002",
          name: "Service & Maintenance Revenue",
          type: "income",
          balance: "0",
          isSystem: true,
        },
        {
          code: "4003",
          name: "Discounts & Allowances Given",
          type: "income",
          balance: "0",
          isSystem: true,
        },
        {
          code: "5001",
          name: "Cost of Goods Sold (COGS)",
          type: "expense",
          balance: "0",
          isSystem: true,
        },
        {
          code: "5002",
          name: "Rent & Store Facility Expense",
          type: "expense",
          balance: "0",
          isSystem: true,
        },
        {
          code: "5003",
          name: "Staff Salaries & Employee Wages",
          type: "expense",
          balance: "0",
          isSystem: true,
        },
        {
          code: "5004",
          name: "Utilities & Electricity Expense",
          type: "expense",
          balance: "0",
          isSystem: true,
        },
        {
          code: "5005",
          name: "Marketing, Advertising & Promotions",
          type: "expense",
          balance: "0",
          isSystem: true,
        },
      ];

      const toInsert = standardAccounts
        .filter((acc) => !existingCodes.has(acc.code))
        .map((acc) => ({
          id: uuidv4(),
          organizationId: orgId,
          ...acc,
        }));

      if (toInsert.length > 0) {
        await db.insert(schema.accounts).values(toInsert);
      }

      return { success: true, count: toInsert.length };
    } catch (e) {
      return handleApiError(e);
    }
  });

// --- Vouchers ---
export const getVouchersFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.vouchers)
        .where(eq(schema.vouchers.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createVoucherFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db.transaction(async (tx) => {
        await tx.insert(schema.vouchers).values({
          id: uuidv4(),
          organizationId: orgId,
          voucherNo: data.voucherNo,
          date: new Date(data.date).toISOString(),
          type: data.type,
          amount: data.amount.toString(),
          debitAccountId: data.debitAccountId,
          debitAccountName: data.debitAccountName,
          creditAccountId: data.creditAccountId,
          creditAccountName: data.creditAccountName,
          narration: data.narration,
          reference: data.reference,
        });

        const debitAcc = await tx
          .select()
          .from(schema.accounts)
          .where(
            and(
              eq(schema.accounts.id, data.debitAccountId),
              eq(schema.accounts.organizationId, orgId),
            ),
          )
          .limit(1);
        if (debitAcc.length > 0) {
          const newDebitBalance = parseFloat(debitAcc[0].balance.toString()) + data.amount;
          await tx
            .update(schema.accounts)
            .set({ balance: newDebitBalance.toString() })
            .where(eq(schema.accounts.id, data.debitAccountId));
        }

        const creditAcc = await tx
          .select()
          .from(schema.accounts)
          .where(
            and(
              eq(schema.accounts.id, data.creditAccountId),
              eq(schema.accounts.organizationId, orgId),
            ),
          )
          .limit(1);
        if (creditAcc.length > 0) {
          const newCreditBalance = Math.max(
            0,
            parseFloat(creditAcc[0].balance.toString()) - data.amount,
          );
          await tx
            .update(schema.accounts)
            .set({ balance: newCreditBalance.toString() })
            .where(eq(schema.accounts.id, data.creditAccountId));
        }
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
