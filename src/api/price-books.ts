import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, desc, inArray, ilike, or } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";
import { v4 as uuidv4 } from "uuid";

// ── GET PRICE BOOKS ───────────────────────────────────────────────────

export const getPriceBooksFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const books = await db
        .select()
        .from(schema.priceBooks)
        .where(
          and(
            eq(schema.priceBooks.organizationId, orgId),
            notDeleted(schema.priceBooks.deletedAt),
          ),
        )
        .orderBy(desc(schema.priceBooks.isDefault), desc(schema.priceBooks.createdAt));

      if (books.length === 0) {
        return { success: true as const, data: [] };
      }

      const bookIds = books.map((b) => b.id);

      // Fetch branch assignments
      const branchLinks = await db
        .select({
          priceBookId: schema.branchPriceBooks.priceBookId,
          locationId: schema.branchPriceBooks.locationId,
          locationName: schema.locations.name,
        })
        .from(schema.branchPriceBooks)
        .innerJoin(
          schema.locations,
          and(
            eq(schema.branchPriceBooks.locationId, schema.locations.id),
            notDeleted(schema.locations.deletedAt),
          ),
        )
        .where(
          and(
            inArray(schema.branchPriceBooks.priceBookId, bookIds),
            eq(schema.branchPriceBooks.organizationId, orgId),
            notDeleted(schema.branchPriceBooks.deletedAt),
          ),
        );

      // Fetch item counts
      const itemCounts = await db
        .select({
          priceBookId: schema.priceBookItems.priceBookId,
          count: sql`count(*)`,
        })
        .from(schema.priceBookItems)
        .where(
          and(
            inArray(schema.priceBookItems.priceBookId, bookIds),
            eq(schema.priceBookItems.organizationId, orgId),
            notDeleted(schema.priceBookItems.deletedAt),
          ),
        )
        .groupBy(schema.priceBookItems.priceBookId);

      const branchMap = new Map<string, { id: string; name: string }[]>();
      branchLinks.forEach((link) => {
        if (!branchMap.has(link.priceBookId)) branchMap.set(link.priceBookId, []);
        branchMap.get(link.priceBookId)!.push({ id: link.locationId, name: link.locationName });
      });

      const countMap = new Map<string, number>();
      itemCounts.forEach((c) => {
        countMap.set(c.priceBookId, Number(c.count) || 0);
      });

      const enrichedBooks = books.map((b) => ({
        ...b,
        branches: branchMap.get(b.id) || [],
        branchCount: (branchMap.get(b.id) || []).length,
        itemCount: countMap.get(b.id) || 0,
      }));

      return { success: true as const, data: enrichedBooks };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ── CREATE / UPDATE PRICE BOOK ───────────────────────────────────────

const PriceBookInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
  status: z.enum(["active", "draft", "archived"]).optional().default("active"),
  assignedLocationIds: z.array(z.string()).optional().default([]),
});

export const createPriceBookFn = createServerFn({ method: "POST" })
  .validator(z.object({ priceBook: PriceBookInputSchema }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const pbId = data.priceBook.id || uuidv4();

      await db.transaction(async (tx) => {
        if (data.priceBook.isDefault) {
          await tx
            .update(schema.priceBooks)
            .set({ isDefault: false })
            .where(
              and(
                eq(schema.priceBooks.organizationId, orgId),
                notDeleted(schema.priceBooks.deletedAt),
              ),
            );
        }

        await tx.insert(schema.priceBooks).values({
          id: pbId,
          organizationId: orgId,
          name: data.priceBook.name.trim(),
          code: data.priceBook.code.trim().toUpperCase(),
          description: data.priceBook.description || null,
          isDefault: data.priceBook.isDefault ?? false,
          effectiveFrom: data.priceBook.effectiveFrom
            ? new Date(data.priceBook.effectiveFrom).toISOString()
            : null,
          effectiveTo: data.priceBook.effectiveTo
            ? new Date(data.priceBook.effectiveTo).toISOString()
            : null,
          status: data.priceBook.status || "active",
        });

        if (data.priceBook.assignedLocationIds && data.priceBook.assignedLocationIds.length > 0) {
          // Remove previous assignments for these locations in this org
          await tx
            .delete(schema.branchPriceBooks)
            .where(
              and(
                eq(schema.branchPriceBooks.organizationId, orgId),
                inArray(schema.branchPriceBooks.locationId, data.priceBook.assignedLocationIds),
              ),
            );

          const links = data.priceBook.assignedLocationIds.map((locId) => ({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locId,
            priceBookId: pbId,
            priority: 1,
          }));
          await tx.insert(schema.branchPriceBooks).values(links);
        }
      });

      return { success: true as const, id: pbId, message: "Price book created successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updatePriceBookFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1, "ID is required"),
      priceBook: PriceBookInputSchema,
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db.transaction(async (tx) => {
        if (data.priceBook.isDefault) {
          await tx
            .update(schema.priceBooks)
            .set({ isDefault: false })
            .where(
              and(
                eq(schema.priceBooks.organizationId, orgId),
                notDeleted(schema.priceBooks.deletedAt),
              ),
            );
        }

        await tx
          .update(schema.priceBooks)
          .set({
            name: data.priceBook.name.trim(),
            code: data.priceBook.code.trim().toUpperCase(),
            description: data.priceBook.description || null,
            isDefault: data.priceBook.isDefault ?? false,
            effectiveFrom: data.priceBook.effectiveFrom
              ? new Date(data.priceBook.effectiveFrom).toISOString()
              : null,
            effectiveTo: data.priceBook.effectiveTo
              ? new Date(data.priceBook.effectiveTo).toISOString()
              : null,
            status: data.priceBook.status || "active",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(schema.priceBooks.id, data.id),
              eq(schema.priceBooks.organizationId, orgId),
            ),
          );

        if (data.priceBook.assignedLocationIds !== undefined) {
          // Clear current assignments for this price book
          await tx
            .delete(schema.branchPriceBooks)
            .where(
              and(
                eq(schema.branchPriceBooks.organizationId, orgId),
                eq(schema.branchPriceBooks.priceBookId, data.id),
              ),
            );

          if (data.priceBook.assignedLocationIds.length > 0) {
            // Remove previous assignments for these locations
            await tx
              .delete(schema.branchPriceBooks)
              .where(
                and(
                  eq(schema.branchPriceBooks.organizationId, orgId),
                  inArray(schema.branchPriceBooks.locationId, data.priceBook.assignedLocationIds),
                ),
              );

            const links = data.priceBook.assignedLocationIds.map((locId) => ({
              id: uuidv4(),
              organizationId: orgId,
              locationId: locId,
              priceBookId: data.id,
              priority: 1,
            }));
            await tx.insert(schema.branchPriceBooks).values(links);
          }
        }
      });

      return { success: true as const, message: "Price book updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deletePriceBookFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1, "ID is required") }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db
        .update(schema.priceBooks)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.priceBooks.id, data.id),
            eq(schema.priceBooks.organizationId, orgId),
          ),
        );

      return { success: true as const, message: "Price book deleted successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ── OUTLET MAPPING MATRIX ─────────────────────────────────────────

export const assignBranchPriceBooksFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mappings: z.array(
        z.object({
          locationId: z.string(),
          priceBookId: z.string().nullable(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db.transaction(async (tx) => {
        for (const map of data.mappings) {
          // Remove existing assignment
          await tx
            .delete(schema.branchPriceBooks)
            .where(
              and(
                eq(schema.branchPriceBooks.organizationId, orgId),
                eq(schema.branchPriceBooks.locationId, map.locationId),
              ),
            );

          if (map.priceBookId) {
            await tx.insert(schema.branchPriceBooks).values({
              id: uuidv4(),
              organizationId: orgId,
              locationId: map.locationId,
              priceBookId: map.priceBookId,
              priority: 1,
            });
          }
        }
      });

      return { success: true as const, message: "Branch price books updated successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ── PRICE BOOK ITEMS & RATE MATRIX ───────────────────────────────────

export const getPriceBookItemsFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        priceBookId: z.string().min(1, "Price Book ID is required"),
        categoryId: z.string().optional(),
        query: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      // 1. Fetch catalog products
      let prodConditions = [
        eq(schema.products.organizationId, orgId),
        notDeleted(schema.products.deletedAt),
      ];

      if (data.categoryId && data.categoryId !== "all") {
        prodConditions.push(eq(schema.products.category, data.categoryId));
      }
      if (data.query) {
        prodConditions.push(
          or(
            ilike(schema.products.name, `%${data.query}%`),
            ilike(schema.products.sku, `%${data.query}%`),
            ilike(schema.products.barcode, `%${data.query}%`),
          )!,
        );
      }

      const products = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          sku: schema.products.sku,
          barcode: schema.products.barcode,
          category: schema.products.category,
          price: schema.products.price,
          cost: schema.products.cost,
          hasVariants: schema.products.hasVariants,
        })
        .from(schema.products)
        .where(and(...prodConditions))
        .orderBy(desc(schema.products.createdAt))
        .limit(200);

      if (products.length === 0) {
        return { success: true as const, data: [] };
      }

      const prodIds = products.map((p) => p.id);

      // 2. Fetch variants for these products
      const variants = await db
        .select({
          id: schema.productVariants.id,
          productId: schema.productVariants.productId,
          name: schema.productVariants.name,
          sku: schema.productVariants.sku,
          barcode: schema.productVariants.barcode,
          price: schema.productVariants.price,
          cost: schema.productVariants.cost,
        })
        .from(schema.productVariants)
        .where(
          and(
            inArray(schema.productVariants.productId, prodIds),
            eq(schema.productVariants.organizationId, orgId),
            notDeleted(schema.productVariants.deletedAt),
          ),
        );

      // 3. Fetch existing price book items
      const existingItems = await db
        .select()
        .from(schema.priceBookItems)
        .where(
          and(
            eq(schema.priceBookItems.priceBookId, data.priceBookId),
            eq(schema.priceBookItems.organizationId, orgId),
            notDeleted(schema.priceBookItems.deletedAt),
          ),
        );

      const itemMap = new Map<string, (typeof existingItems)[0]>();
      existingItems.forEach((it) => {
        const key = it.variantId ? `${it.productId}:${it.variantId}` : `${it.productId}:base`;
        itemMap.set(key, it);
      });

      // Build consolidated rate chart rows
      const rows: any[] = [];

      products.forEach((p) => {
        const pVariants = variants.filter((v) => v.productId === p.id);

        if (pVariants.length > 0) {
          pVariants.forEach((v) => {
            const rule = itemMap.get(`${p.id}:${v.id}`);
            const basePrice = Number(v.price || p.price || 0);
            let effectivePrice = basePrice;
            if (rule) {
              if (rule.pricingType === "fixed" && rule.customPrice != null) {
                effectivePrice = Number(rule.customPrice);
              } else if (rule.pricingType === "percentage_markup" && rule.adjustmentValue) {
                effectivePrice = basePrice * (1 + Number(rule.adjustmentValue) / 100);
              } else if (rule.pricingType === "percentage_discount" && rule.adjustmentValue) {
                effectivePrice = Math.max(0, basePrice * (1 - Number(rule.adjustmentValue) / 100));
              }
            }

            rows.push({
              key: `${p.id}:${v.id}`,
              productId: p.id,
              variantId: v.id,
              productName: p.name,
              variantName: v.name,
              sku: v.sku || p.sku,
              barcode: v.barcode || p.barcode,
              category: p.category,
              basePrice,
              baseCost: Number(v.cost || p.cost || 0),
              ruleId: rule?.id || null,
              pricingType: rule?.pricingType || "fixed",
              customPrice: rule?.customPrice != null ? Number(rule.customPrice) : null,
              adjustmentValue:
                rule?.adjustmentValue != null ? Number(rule.adjustmentValue) : null,
              effectivePrice: Number(effectivePrice.toFixed(2)),
              hasOverride: Boolean(rule),
            });
          });
        } else {
          const rule = itemMap.get(`${p.id}:base`);
          const basePrice = Number(p.price || 0);
          let effectivePrice = basePrice;
          if (rule) {
            if (rule.pricingType === "fixed" && rule.customPrice != null) {
              effectivePrice = Number(rule.customPrice);
            } else if (rule.pricingType === "percentage_markup" && rule.adjustmentValue) {
              effectivePrice = basePrice * (1 + Number(rule.adjustmentValue) / 100);
            } else if (rule.pricingType === "percentage_discount" && rule.adjustmentValue) {
              effectivePrice = Math.max(0, basePrice * (1 - Number(rule.adjustmentValue) / 100));
            }
          }

          rows.push({
            key: `${p.id}:base`,
            productId: p.id,
            variantId: null,
            productName: p.name,
            variantName: null,
            sku: p.sku,
            barcode: p.barcode,
            category: p.category,
            basePrice,
            baseCost: Number(p.cost || 0),
            ruleId: rule?.id || null,
            pricingType: rule?.pricingType || "fixed",
            customPrice: rule?.customPrice != null ? Number(rule.customPrice) : null,
            adjustmentValue:
              rule?.adjustmentValue != null ? Number(rule.adjustmentValue) : null,
            effectivePrice: Number(effectivePrice.toFixed(2)),
            hasOverride: Boolean(rule),
          });
        }
      });

      return { success: true as const, data: rows };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const upsertPriceBookItemsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      priceBookId: z.string().min(1, "Price Book ID is required"),
      items: z.array(
        z.object({
          productId: z.string(),
          variantId: z.string().nullable().optional(),
          pricingType: z.enum(["fixed", "percentage_markup", "percentage_discount"]),
          customPrice: z.union([z.number(), z.string()]).nullable().optional(),
          adjustmentValue: z.union([z.number(), z.string()]).nullable().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      await db.transaction(async (tx) => {
        for (const item of data.items) {
          // Remove existing override for this product / variant
          let deleteConds = [
            eq(schema.priceBookItems.priceBookId, data.priceBookId),
            eq(schema.priceBookItems.productId, item.productId),
            eq(schema.priceBookItems.organizationId, orgId),
          ];
          if (item.variantId) {
            deleteConds.push(eq(schema.priceBookItems.variantId, item.variantId));
          } else {
            deleteConds.push(sql`${schema.priceBookItems.variantId} IS NULL`);
          }

          await tx.delete(schema.priceBookItems).where(and(...deleteConds));

          // Insert new rule
          await tx.insert(schema.priceBookItems).values({
            id: uuidv4(),
            organizationId: orgId,
            priceBookId: data.priceBookId,
            productId: item.productId,
            variantId: item.variantId || null,
            pricingType: item.pricingType,
            customPrice:
              item.customPrice != null ? Number(item.customPrice).toFixed(2) : null,
            adjustmentValue:
              item.adjustmentValue != null
                ? Number(item.adjustmentValue).toFixed(2)
                : null,
          });
        }
      });

      return { success: true as const, message: "Price book items saved successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const bulkAdjustPriceBookFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      priceBookId: z.string().min(1, "Price Book ID is required"),
      categoryId: z.string().optional(),
      adjustmentType: z.enum(["percentage_markup", "percentage_discount"]),
      percentage: z.number().positive(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      // Find all target products
      let prodConditions = [
        eq(schema.products.organizationId, orgId),
        notDeleted(schema.products.deletedAt),
      ];
      if (data.categoryId && data.categoryId !== "all") {
        prodConditions.push(eq(schema.products.category, data.categoryId));
      }

      const products = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(...prodConditions));

      if (products.length === 0) {
        return { success: true as const, count: 0, message: "No products matched criteria" };
      }

      const prodIds = products.map((p) => p.id);

      await db.transaction(async (tx) => {
        // Clear existing rules for these products in this price book
        await tx
          .delete(schema.priceBookItems)
          .where(
            and(
              eq(schema.priceBookItems.priceBookId, data.priceBookId),
              inArray(schema.priceBookItems.productId, prodIds),
              eq(schema.priceBookItems.organizationId, orgId),
            ),
          );

        // Insert new bulk percentage adjustment rules
        const rows = prodIds.map((pid) => ({
          id: uuidv4(),
          organizationId: orgId,
          priceBookId: data.priceBookId,
          productId: pid,
          variantId: null,
          pricingType: data.adjustmentType,
          customPrice: null,
          adjustmentValue: data.percentage.toFixed(2),
        }));

        await tx.insert(schema.priceBookItems).values(rows);
      });

      return {
        success: true as const,
        count: prodIds.length,
        message: `Applied ${data.adjustmentType === "percentage_markup" ? "+" : "-"}${data.percentage}% rule to ${prodIds.length} products`,
      };
    } catch (e) {
      return handleApiError(e);
    }
  });

// ── FAST ACTIVE PRICE BOOK LOOKUP FOR POS TERMINAL ────────────────────

export const getActiveBranchPriceBookFn = createServerFn({ method: "GET" })
  .validator(z.object({ locationId: z.string().optional().nullable() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      let targetPriceBookId: string | null = null;
      let priceBookInfo: any = null;

      // 1. Try branch assignment
      if (data.locationId) {
        const branchBook = await db
          .select({
            priceBookId: schema.branchPriceBooks.priceBookId,
            name: schema.priceBooks.name,
            code: schema.priceBooks.code,
          })
          .from(schema.branchPriceBooks)
          .innerJoin(
            schema.priceBooks,
            and(
              eq(schema.branchPriceBooks.priceBookId, schema.priceBooks.id),
              eq(schema.priceBooks.status, "active"),
              notDeleted(schema.priceBooks.deletedAt),
            ),
          )
          .where(
            and(
              eq(schema.branchPriceBooks.organizationId, orgId),
              eq(schema.branchPriceBooks.locationId, data.locationId),
              notDeleted(schema.branchPriceBooks.deletedAt),
            ),
          )
          .orderBy(schema.branchPriceBooks.priority)
          .limit(1);

        if (branchBook.length > 0) {
          targetPriceBookId = branchBook[0].priceBookId;
          priceBookInfo = { id: targetPriceBookId, name: branchBook[0].name, code: branchBook[0].code };
        }
      }

      // 2. Fallback to org default price book if any
      if (!targetPriceBookId) {
        const defaultBook = await db
          .select({
            id: schema.priceBooks.id,
            name: schema.priceBooks.name,
            code: schema.priceBooks.code,
          })
          .from(schema.priceBooks)
          .where(
            and(
              eq(schema.priceBooks.organizationId, orgId),
              eq(schema.priceBooks.isDefault, true),
              eq(schema.priceBooks.status, "active"),
              notDeleted(schema.priceBooks.deletedAt),
            ),
          )
          .limit(1);

        if (defaultBook.length > 0) {
          targetPriceBookId = defaultBook[0].id;
          priceBookInfo = defaultBook[0];
        }
      }

      if (!targetPriceBookId) {
        return { success: true as const, data: null };
      }

      // 3. Fetch rules
      const rules = await db
        .select({
          productId: schema.priceBookItems.productId,
          variantId: schema.priceBookItems.variantId,
          pricingType: schema.priceBookItems.pricingType,
          customPrice: schema.priceBookItems.customPrice,
          adjustmentValue: schema.priceBookItems.adjustmentValue,
        })
        .from(schema.priceBookItems)
        .where(
          and(
            eq(schema.priceBookItems.priceBookId, targetPriceBookId),
            eq(schema.priceBookItems.organizationId, orgId),
            notDeleted(schema.priceBookItems.deletedAt),
          ),
        );

      const rulesMap: Record<
        string,
        {
          pricingType: string;
          customPrice: number | null;
          adjustmentValue: number | null;
        }
      > = {};

      rules.forEach((r) => {
        const key = r.variantId ? `var_${r.variantId}` : `prod_${r.productId}`;
        rulesMap[key] = {
          pricingType: r.pricingType,
          customPrice: r.customPrice != null ? Number(r.customPrice) : null,
          adjustmentValue: r.adjustmentValue != null ? Number(r.adjustmentValue) : null,
        };
      });

      return {
        success: true as const,
        data: {
          priceBook: priceBookInfo,
          rules: rulesMap,
        },
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
