import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_TAX_SLABS: { name: string; rate: string; cgstRate?: string; sgstRate?: string; igstRate?: string }[] = [
  { name: "Nil Rated", rate: "0" },
  { name: "GST 5%", rate: "5", cgstRate: "2.50", sgstRate: "2.50" },
  { name: "GST 12%", rate: "12", cgstRate: "6", sgstRate: "6" },
  { name: "GST 18%", rate: "18", cgstRate: "9", sgstRate: "9" },
  { name: "GST 28%", rate: "28", cgstRate: "14", sgstRate: "14" },
];

export async function ensureDefaultTaxMasters(orgId: string) {
  const existing = await db
    .select({ id: schema.taxMasters.id })
    .from(schema.taxMasters)
    .where(eq(schema.taxMasters.organizationId, orgId))
    .limit(1);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  await db.insert(schema.taxMasters).values(
    DEFAULT_TAX_SLABS.map((slab, index) => ({
      id: uuidv4(),
      organizationId: orgId,
      name: slab.name,
      rate: slab.rate,
      cgstRate: slab.cgstRate || null,
      sgstRate: slab.sgstRate || null,
      igstRate: slab.igstRate || null,
      isDefault: index === 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export const getTaxMastersFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await ensureDefaultTaxMasters(orgId);
      const res = await db
        .select()
        .from(schema.taxMasters)
        .where(eq(schema.taxMasters.organizationId, orgId))
        .orderBy(schema.taxMasters.rate);
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

const CreateTaxMasterSchema = z.object({
  taxMaster: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1, "Tax name is required"),
      rate: z.union([z.string(), z.number()]).default("0"),
      taxType: z.enum(["gst", "vat", "flat"]).default("gst"),
      cgstRate: z.union([z.string(), z.number()]).nullable().optional(),
      sgstRate: z.union([z.string(), z.number()]).nullable().optional(),
      igstRate: z.union([z.string(), z.number()]).nullable().optional(),
      isDefault: z.boolean().optional().default(false),
      status: z.string().optional().default("active"),
      description: z.string().nullable().optional(),
    })
    .passthrough(),
});

export const createTaxMasterFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateTaxMasterSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const tm = data.taxMaster;
      const now = new Date().toISOString();
      const num = (v: any) => (v == null || v === "" ? null : Number(v));
      const inserted = await db
        .insert(schema.taxMasters)
        .values({
          id: tm.id || uuidv4(),
          organizationId: session.orgId,
          name: tm.name,
          rate: String(tm.rate || 0),
          taxType: tm.taxType,
          cgstRate: num(tm.cgstRate) == null ? null : String(num(tm.cgstRate)),
          sgstRate: num(tm.sgstRate) == null ? null : String(num(tm.sgstRate)),
          igstRate: num(tm.igstRate) == null ? null : String(num(tm.igstRate)),
          isDefault: Boolean(tm.isDefault),
          status: tm.status,
          description: tm.description || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return { success: true, data: inserted[0], message: "Tax rate created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const UpdateTaxMasterSchema = z.object({
  id: z.string().min(1, "Tax rate ID is required"),
  updates: z
    .object({
      name: z.string().optional(),
      rate: z.union([z.string(), z.number()]).optional(),
      taxType: z.enum(["gst", "vat", "flat"]).optional(),
      cgstRate: z.union([z.string(), z.number()]).nullable().optional(),
      sgstRate: z.union([z.string(), z.number()]).nullable().optional(),
      igstRate: z.union([z.string(), z.number()]).nullable().optional(),
      isDefault: z.boolean().optional(),
      status: z.string().optional(),
      description: z.string().nullable().optional(),
    })
    .passthrough(),
});

export const updateTaxMasterFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UpdateTaxMasterSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const updatesObj: Record<string, any> = { updatedAt: new Date().toISOString() };
      for (const key of [
        "name",
        "rate",
        "taxType",
        "cgstRate",
        "sgstRate",
        "igstRate",
        "isDefault",
        "status",
        "description",
      ]) {
        if (data.updates[key] !== undefined) updatesObj[key] = data.updates[key];
      }
      if (updatesObj.rate !== undefined) updatesObj.rate = String(updatesObj.rate);
      for (const k of ["cgstRate", "sgstRate", "igstRate"]) {
        if (updatesObj[k] !== undefined) {
          updatesObj[k] = updatesObj[k] == null || updatesObj[k] === "" ? null : String(updatesObj[k]);
        }
      }
      await db
        .update(schema.taxMasters)
        .set(updatesObj)
        .where(and(eq(schema.taxMasters.id, data.id), eq(schema.taxMasters.organizationId, session.orgId)));
      return { success: true, message: "Tax rate updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const DeleteTaxMasterSchema = z.object({
  id: z.string().min(1, "Tax rate ID is required"),
});

export const deleteTaxMasterFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => DeleteTaxMasterSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.taxMasters)
        .where(and(eq(schema.taxMasters.id, data.id), eq(schema.taxMasters.organizationId, session.orgId)));
      return { success: true, message: "Tax rate deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });