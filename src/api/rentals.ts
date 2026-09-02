import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const RentalInputSchema = z
  .object({
    id: z.string().optional(),
    rentalNo: z.string().optional(),
    customerName: z.string().optional(),
    itemName: z.string().optional(),
    rentStartDate: z.string().optional(),
    expectedReturnDate: z.string().optional(),
    dailyRate: z.union([z.string(), z.number()]).optional(),
    securityDeposit: z.union([z.string(), z.number()]).optional(),
    totalAmount: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const getRentalsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.rentals)
        .where(eq(schema.rentals.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createRentalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rental: RentalInputSchema.optional(),
    }).passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const r = (data as any)?.rental || data || {};
      const rentalData = {
        id: r.id || uuidv4(),
        organizationId: orgId,
        rentalNo: r.rentalNo || `RNT-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: r.customerName || "Customer",
        itemName: r.itemName || "Equipment Item",
        rentStartDate: r.rentStartDate
          ? new Date(r.rentStartDate).toISOString()
          : new Date().toISOString(),
        expectedReturnDate: r.expectedReturnDate
          ? new Date(r.expectedReturnDate).toISOString()
          : new Date(Date.now() + 86400000).toISOString(),
        dailyRate: (Number(r.dailyRate) || 0).toFixed(2),
        securityDeposit: (Number(r.securityDeposit) || 0).toFixed(2),
        totalAmount: (Number(r.totalAmount) || 0).toFixed(2),
        status: r.status || "active",
      };

      const inserted = await db
        .insert(schema.rentals)
        .values(rentalData)
        .onConflictDoUpdate({
          target: schema.rentals.id,
          set: rentalData,
        })
        .returning();
      return { success: true, data: inserted[0] || rentalData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateRentalStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.rentals)
        .set({ status: data.status })
        .where(and(eq(schema.rentals.id, data.id), eq(schema.rentals.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateRentalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      updates: RentalInputSchema.optional(),
      rental: RentalInputSchema.optional(),
    }).passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const updates = (data as any).updates || (data as any).rental || data;
      const rentalId = (data as any).id || updates.id;

      const payload: any = {};
      if (updates.rentalNo !== undefined) payload.rentalNo = updates.rentalNo;
      if (updates.customerName !== undefined) payload.customerName = updates.customerName;
      if (updates.itemName !== undefined) payload.itemName = updates.itemName;
      if (updates.rentStartDate !== undefined)
        payload.rentStartDate = new Date(updates.rentStartDate).toISOString();
      if (updates.expectedReturnDate !== undefined)
        payload.expectedReturnDate = new Date(updates.expectedReturnDate).toISOString();
      if (updates.dailyRate !== undefined)
        payload.dailyRate = (Number(updates.dailyRate) || 0).toFixed(2);
      if (updates.securityDeposit !== undefined)
        payload.securityDeposit = (Number(updates.securityDeposit) || 0).toFixed(2);
      if (updates.totalAmount !== undefined)
        payload.totalAmount = (Number(updates.totalAmount) || 0).toFixed(2);
      if (updates.status !== undefined) payload.status = updates.status;

      await db
        .update(schema.rentals)
        .set(payload)
        .where(and(eq(schema.rentals.id, rentalId), eq(schema.rentals.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteRentalFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .delete(schema.rentals)
        .where(and(eq(schema.rentals.id, data.id), eq(schema.rentals.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
