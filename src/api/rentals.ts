import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getRentalsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
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
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const r = data?.rental || data || {};
    try {
      const rentalData = {
        id: r.id || uuidv4(),
        organizationId: orgId,
        rentalNo: r.rentalNo || `RNT-${Date.now().toString().slice(-6)}`,
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

      await db.insert(schema.rentals).values(rentalData);
      return { success: true, data: rentalData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateRentalStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
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
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const updates = data.updates || data.rental || data;
    try {
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
        .where(
          and(
            eq(schema.rentals.id, data.id || updates.id),
            eq(schema.rentals.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteRentalFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.rentals)
        .where(and(eq(schema.rentals.id, data.id), eq(schema.rentals.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
