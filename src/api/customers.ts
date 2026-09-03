import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { customerService } from "@/services/customer.service";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { notDeleted } from "@/lib/soft-delete";

export const getCustomersFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        type: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const customers = await customerService.getCustomers(session.orgId, data.query);
      return { success: true, data: customers, total: customers.length };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CustomerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().or(z.number()).nullable().optional(),
  loyaltyPoints: z.number().optional(),
  visits: z.number().optional(),
  totalSpent: z.string().or(z.number()).optional(),
  credit: z.string().or(z.number()).optional(),
  creditLimit: z.string().or(z.number()).nullable().optional(),
  walletBalance: z.string().or(z.number()).optional(),
  status: z.string().or(z.number()).optional(),
  type: z.string().or(z.number()).optional(),
  gstin: z.string().or(z.number()).nullable().optional(),
  stateCode: z.string().or(z.number()).nullable().optional(),
});

const CustomerInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Customer name is required"),
    email: z.string().email().nullable().optional(),
    phone: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => (v !== null && v !== undefined ? String(v) : v)),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
    loyaltyPoints: z.number().optional(),
    visits: z.number().optional(),
    totalSpent: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : v)),
    credit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : v)),
    creditLimit: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => (v !== null && v !== undefined ? String(v) : v)),
    walletBalance: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : v)),
    status: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : v)),
    type: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : v)),
    gstin: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => (v !== null && v !== undefined ? String(v) : v)),
    stateCode: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => (v !== null && v !== undefined ? String(v) : v)),
  })
  .passthrough();

const CreateCustomerSchema = z.object({
  customer: CustomerInputSchema,
});

export const createCustomerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateCustomerSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const customer = data.customer;
      const inserted = await db
        .insert(schema.customers)
        .values({
          id: customer.id || uuidv4(),
          ...(customer as any),
          organizationId: session.orgId,
        })
        .returning();

      const userName = session.userName || session.userId || "User";
      await db.insert(schema.activityLog).values({
        id: uuidv4(),
        organizationId: session.orgId,
        user: userName,
        action: "Customer Created",
        details: `Registered customer "${customer.name}" (${customer.phone || "No phone"})`,
        timestamp: new Date().toISOString(),
        type: "customer",
      });

      await db.insert(schema.notifications).values({
        id: uuidv4(),
        organizationId: session.orgId,
        title: "New Customer Registered",
        description: `Customer "${customer.name}" added to system by ${userName}`,
        type: "customer",
        timestamp: new Date().toISOString(),
        read: false,
      });

      return { success: true, data: inserted[0], message: "Customer created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  updates: CustomerInputSchema.partial(),
});

export const updateCustomerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateCustomerSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { organizationId: _omitted, ...safeUpdates } = data.updates;
      await db
        .update(schema.customers)
        .set(safeUpdates as any)
        .where(
          and(eq(schema.customers.id, data.id), eq(schema.customers.organizationId, session.orgId)),
        );
      return { success: true, message: "Customer updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
});

export const deleteCustomerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteCustomerSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .update(schema.customers)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(eq(schema.customers.id, data.id), eq(schema.customers.organizationId, session.orgId)),
        );
      return { success: true, message: "Customer deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const GetCustomerLedgersSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
});

export const getCustomerLedgersFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetCustomerLedgersSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.customerLedgers)
        .where(
          and(
            eq(schema.customerLedgers.customerId, data.customerId),
            eq(schema.customerLedgers.organizationId, session.orgId),
            notDeleted(schema.customerLedgers.deletedAt),
          ),
        );
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createCustomerLedgerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ledger: z
        .object({
          id: z.string().optional(),
          customerId: z.string(),
          date: z.string(),
          type: z.string(),
          amount: z.string(),
          balanceAfter: z.string(),
          referenceNo: z
            .union([z.string(), z.number()])
            .optional()
            .transform((v) => (v !== undefined ? String(v) : v)),
          note: z
            .union([z.string(), z.number()])
            .optional()
            .transform((v) => (v !== undefined ? String(v) : v)),
        })
        .passthrough(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      let insertedRow;
      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(schema.customerLedgers)
          .values({
            id: data.ledger.id || uuidv4(),
            ...(data.ledger as any),
            organizationId: session.orgId,
          })
          .returning();
        insertedRow = inserted[0];

        if (data.ledger.customerId) {
          const balanceAfterNum = parseFloat(data.ledger.balanceAfter);
          if (!isNaN(balanceAfterNum)) {
            await tx
              .update(schema.customers)
              .set({ credit: balanceAfterNum.toString() })
              .where(
                and(
                  eq(schema.customers.id, data.ledger.customerId),
                  eq(schema.customers.organizationId, session.orgId),
                ),
              );
          }
        }
      });
      return { success: true, data: insertedRow, message: "Ledger entry recorded successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
