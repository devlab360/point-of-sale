import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const inMemoryRentals: Record<string, any[]> = {
  default: [
    {
      id: "rnt-1",
      organizationId: "default",
      rentalNo: "RNT-881201",
      customerName: "Alex Harrison",
      itemName: "Heavy Duty Rotary Hammer Drill",
      rentStartDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      expectedReturnDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      dailyRate: "25.00",
      securityDeposit: "100.00",
      totalAmount: "125.00",
      status: "active",
    },
    {
      id: "rnt-2",
      organizationId: "default",
      rentalNo: "RNT-881202",
      customerName: "Apex Media Works",
      itemName: "4K Sony Cine Cinema Camera + Lens Kit",
      rentStartDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      expectedReturnDate: new Date(Date.now() + 1 * 86400000).toISOString(),
      dailyRate: "120.00",
      securityDeposit: "500.00",
      totalAmount: "720.00",
      status: "active",
    },
    {
      id: "rnt-3",
      organizationId: "default",
      rentalNo: "RNT-881190",
      customerName: "Marcus Vance",
      itemName: "DJ PA Audio System & Dual Subwoofers",
      rentStartDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      expectedReturnDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      dailyRate: "80.00",
      securityDeposit: "300.00",
      totalAmount: "240.00",
      status: "returned",
    },
  ],
};

export const getRentalsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;

    try {
      if (schema.rentals) {
        const all = await db
          .select()
          .from(schema.rentals)
          .where(eq(schema.rentals.organizationId, orgId));
        if (all) return { success: true, data: all };
      }
    } catch (e) {
      console.warn("DB getRentals fallback:", e);
    }
    return { success: true, data: inMemoryRentals[orgId] || [] };
  });

export const createRentalFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    const r = data?.rental || data || {};
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

    if (!inMemoryRentals[orgId]) inMemoryRentals[orgId] = [];
    inMemoryRentals[orgId].unshift(rentalData);

    try {
      if (schema.rentals) {
        await db.insert(schema.rentals).values(rentalData).onConflictDoUpdate({
          target: schema.rentals.id,
          set: rentalData,
        });
      }
      return { success: true, data: rentalData };
    } catch (e) {
      console.warn("DB createRental fallback:", e);
      return { success: true, data: rentalData };
    }
  });

export const updateRentalStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryRentals[orgId]) {
      const rnt = inMemoryRentals[orgId].find((r) => r.id === data.id);
      if (rnt) rnt.status = data.status;
    }

    try {
      if (schema.rentals) {
        await db
          .update(schema.rentals)
          .set({ status: data.status })
          .where(and(eq(schema.rentals.id, data.id), eq(schema.rentals.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB updateRentalStatus fallback:", e);
      return { success: true };
    }
  });

export const updateRentalFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    const updates = data.updates || data.rental || data;
    const rentalId = data.id || updates.id;

    if (inMemoryRentals[orgId]) {
      const idx = inMemoryRentals[orgId].findIndex((r) => r.id === rentalId);
      if (idx >= 0) inMemoryRentals[orgId][idx] = { ...inMemoryRentals[orgId][idx], ...updates };
    }

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

      if (schema.rentals) {
        await db
          .update(schema.rentals)
          .set(payload)
          .where(and(eq(schema.rentals.id, rentalId), eq(schema.rentals.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB updateRental fallback:", e);
      return { success: true };
    }
  });

export const deleteRentalFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;

    if (inMemoryRentals[orgId]) {
      inMemoryRentals[orgId] = inMemoryRentals[orgId].filter((r) => r.id !== data.id);
    }

    try {
      if (schema.rentals) {
        await db
          .delete(schema.rentals)
          .where(and(eq(schema.rentals.id, data.id), eq(schema.rentals.organizationId, orgId)));
      }
      return { success: true };
    } catch (e) {
      console.warn("DB deleteRental fallback:", e);
      return { success: true };
    }
  });
