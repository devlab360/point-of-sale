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
    email: z.string().email().nullable().optional(),
    balance: z.union([z.string(), z.number()]).optional(),
    items: z.number().optional(),
    gstin: z.string().nullable().optional(),
    stateCode: z.string().nullable().optional(),
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
      const { id, ...safeUpdates } = data.updates;

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
        .where(eq(schema.supplierLedgers.supplierId, data.supplierId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });
