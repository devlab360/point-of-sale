import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/auth-utils";

const SupplierInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Supplier name is required"),
    contact: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal("")),
    balance: z.union([z.string(), z.number()]).optional(),
    items: z.number().optional(),
    gstin: z.string().nullable().optional(),
    stateCode: z.string().nullable().optional(),
    pan: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    paymentTerms: z.string().nullable().optional(),
    creditLimit: z.union([z.string(), z.number()]).nullable().optional(),
    bankName: z.string().nullable().optional(),
    accountNumber: z.string().nullable().optional(),
    ifscSwift: z.string().nullable().optional(),
    upiId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.string().optional().default("active"),
  })
  .passthrough();

export const getSuppliersFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const all = await db
        .select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.organizationId, session.orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateSupplierSchema = z.object({
  supplier: SupplierInputSchema,
});

export const createSupplierFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateSupplierSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const newSupplier = {
        id: data.supplier.id || uuidv4(),
        organizationId: session.orgId,
        name: data.supplier.name,
        contact: data.supplier.contact || "",
        phone: data.supplier.phone || "",
        email: data.supplier.email || null,
        balance: data.supplier.balance?.toString() || "0",
        items: data.supplier.items || 0,
        gstin: data.supplier.gstin || null,
        stateCode: data.supplier.stateCode || null,
        pan: data.supplier.pan || null,
        website: data.supplier.website || null,
        address: data.supplier.address || null,
        city: data.supplier.city || null,
        state: data.supplier.state || null,
        postalCode: data.supplier.postalCode || null,
        country: data.supplier.country || null,
        paymentTerms: data.supplier.paymentTerms || null,
        creditLimit: data.supplier.creditLimit ? data.supplier.creditLimit.toString() : null,
        bankName: data.supplier.bankName || null,
        accountNumber: data.supplier.accountNumber || null,
        ifscSwift: data.supplier.ifscSwift || null,
        upiId: data.supplier.upiId || null,
        notes: data.supplier.notes || null,
        status: data.supplier.status || "active",
      };

      const inserted = await db.insert(schema.suppliers).values(newSupplier).returning();
      return { success: true, data: inserted[0], message: "Supplier created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateSupplierSchema = z.object({
  id: z.string().min(1, "Supplier ID is required"),
  updates: SupplierInputSchema.partial(),
});

export const updateSupplierFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateSupplierSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { id, organizationId: _omitted, ...safeUpdates } = data.updates;

      await db
        .update(schema.suppliers)
        .set(safeUpdates as any)
        .where(
          and(eq(schema.suppliers.id, data.id), eq(schema.suppliers.organizationId, session.orgId)),
        );
      return { success: true, message: "Supplier updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteSupplierSchema = z.object({
  id: z.string().min(1, "Supplier ID is required"),
});

export const deleteSupplierFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteSupplierSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.suppliers)
        .where(
          and(eq(schema.suppliers.id, data.id), eq(schema.suppliers.organizationId, session.orgId)),
        );
      return { success: true, message: "Supplier deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const GetSupplierLedgersSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
});

export const getSupplierLedgersFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => GetSupplierLedgersSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const suppliers = await db
        .select()
        .from(schema.suppliers)
        .where(
          and(
            eq(schema.suppliers.id, data.supplierId),
            eq(schema.suppliers.organizationId, session.orgId),
          ),
        )
        .limit(1);
      if (!suppliers.length) return { success: false, error: "Supplier not found" };

      const all = await db
        .select()
        .from(schema.supplierLedgers)
        .where(
          and(
            eq(schema.supplierLedgers.supplierId, data.supplierId),
            eq(schema.supplierLedgers.organizationId, session.orgId),
          ),
        );
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createSupplierLedgerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ledger: z
        .object({
          id: z.string().optional(),
          supplierId: z.string(),
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
      const inserted = await db
        .insert(schema.supplierLedgers)
        .values({
          id: data.ledger.id || uuidv4(),
          ...(data.ledger as any),
          organizationId: session.orgId,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Ledger entry recorded successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
