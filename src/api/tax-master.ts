import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { notDeleted } from "@/lib/soft-delete";
import { COUNTRY_TAX_TEMPLATES } from "@/lib/tax-templates";

async function getDb() {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq, and, ne } = await import("drizzle-orm");
  return { db, schema, eq, and, ne };
}

export async function ensureDefaultTaxMasters(orgId: string) {
  const { db, schema, eq, and } = await getDb();

  const existing = await db
    .select({ id: schema.taxMasters.id })
    .from(schema.taxMasters)
    .where(
      and(eq(schema.taxMasters.organizationId, orgId), notDeleted(schema.taxMasters.deletedAt)),
    )
    .limit(1);
  if (existing.length > 0) return;

  // Retrieve org settings to pick matching country template
  const settingsRows = await db
    .select({ countryCode: schema.settings.countryCode, config: schema.settings.config })
    .from(schema.settings)
    .where(and(eq(schema.settings.organizationId, orgId), notDeleted(schema.settings.deletedAt)))
    .limit(1);

  const country = (settingsRows[0]?.config as any)?.country || "IN";
  const slabs =
    COUNTRY_TAX_TEMPLATES[country] || COUNTRY_TAX_TEMPLATES.IN || COUNTRY_TAX_TEMPLATES.DEFAULT;

  const now = new Date().toISOString();
  const inserted = await db
    .insert(schema.taxMasters)
    .values(
      slabs.map((slab) => ({
        id: uuidv4(),
        organizationId: orgId,
        name: slab.name,
        rate: slab.rate,
        taxType: slab.taxType || "gst",
        cgstRate: slab.cgstRate || null,
        sgstRate: slab.sgstRate || null,
        igstRate: slab.igstRate || null,
        isDefault: Boolean(slab.isDefault),
        status: "active",
        description: slab.description || null,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .returning();

  const defaultItem = inserted.find((i) => i.isDefault) || inserted[0];
  if (defaultItem) {
    await db
      .update(schema.settings)
      .set({ defaultTaxMasterId: defaultItem.id, updatedAt: now })
      .where(eq(schema.settings.organizationId, orgId));
  }
}

export const getTaxMastersFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await ensureDefaultTaxMasters(orgId);
      const { db, schema, eq, and } = await getDb();
      const res = await db
        .select()
        .from(schema.taxMasters)
        .where(
          and(eq(schema.taxMasters.organizationId, orgId), notDeleted(schema.taxMasters.deletedAt)),
        )
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
      taxType: z.string().default("gst"),
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
      const newId = tm.id || uuidv4();
      const num = (v: any) => (v == null || v === "" ? null : Number(v));

      const { db, schema, eq } = await getDb();

      if (tm.isDefault) {
        // Clear existing defaults for this tenant
        await db
          .update(schema.taxMasters)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(schema.taxMasters.organizationId, session.orgId));
      }

      const inserted = await db
        .insert(schema.taxMasters)
        .values({
          id: newId,
          organizationId: session.orgId,
          name: tm.name,
          rate: String(tm.rate || 0),
          taxType: tm.taxType || "gst",
          cgstRate: num(tm.cgstRate) == null ? null : String(num(tm.cgstRate)),
          sgstRate: num(tm.sgstRate) == null ? null : String(num(tm.sgstRate)),
          igstRate: num(tm.igstRate) == null ? null : String(num(tm.igstRate)),
          isDefault: Boolean(tm.isDefault),
          status: tm.status || "active",
          description: tm.description || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (tm.isDefault) {
        await db
          .update(schema.settings)
          .set({ defaultTaxMasterId: newId, updatedAt: now })
          .where(eq(schema.settings.organizationId, session.orgId));
      }

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
      taxType: z.string().optional(),
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
      const now = new Date().toISOString();
      const updatesObj: Record<string, any> = { updatedAt: now };

      const { db, schema, eq, and, ne } = await getDb();

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
          updatesObj[k] =
            updatesObj[k] == null || updatesObj[k] === "" ? null : String(updatesObj[k]);
        }
      }

      if (updatesObj.isDefault === true) {
        // Unset default on other items
        await db
          .update(schema.taxMasters)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(schema.taxMasters.organizationId, session.orgId),
              ne(schema.taxMasters.id, data.id),
            ),
          );

        await db
          .update(schema.settings)
          .set({ defaultTaxMasterId: data.id, updatedAt: now })
          .where(eq(schema.settings.organizationId, session.orgId));
      }

      await db
        .update(schema.taxMasters)
        .set(updatesObj)
        .where(
          and(
            eq(schema.taxMasters.id, data.id),
            eq(schema.taxMasters.organizationId, session.orgId),
          ),
        );

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
      const { db, schema, eq, and } = await getDb();
      await db
        .update(schema.taxMasters)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.taxMasters.id, data.id),
            eq(schema.taxMasters.organizationId, session.orgId),
          ),
        );
      return { success: true, message: "Tax rate deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

const LoadCountryTaxTemplateSchema = z.object({
  countryCode: z.string().min(2),
});

export const loadCountryTaxTemplateFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => LoadCountryTaxTemplateSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const code = data.countryCode.toUpperCase();
      const slabs = COUNTRY_TAX_TEMPLATES[code] || COUNTRY_TAX_TEMPLATES.DEFAULT;
      const now = new Date().toISOString();

      const { db, schema } = await getDb();

      // Insert the slabs
      const inserted = await db
        .insert(schema.taxMasters)
        .values(
          slabs.map((slab) => ({
            id: uuidv4(),
            organizationId: orgId,
            name: slab.name,
            rate: slab.rate,
            taxType: slab.taxType || "vat",
            cgstRate: slab.cgstRate || null,
            sgstRate: slab.sgstRate || null,
            igstRate: slab.igstRate || null,
            isDefault: Boolean(slab.isDefault),
            status: "active",
            description: slab.description || null,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .returning();

      return {
        success: true,
        message: `Imported ${inserted.length} standard tax rate slabs for ${code}`,
        data: inserted,
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
