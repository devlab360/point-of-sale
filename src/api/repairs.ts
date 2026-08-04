import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getRepairsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.repairs)
        .where(eq(schema.repairs.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createRepairFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const r = data?.repair || data || {};
    try {
      const repairData = {
        id: r.id || uuidv4(),
        organizationId: orgId,
        ticketNo: r.ticketNo || `REP-${Date.now().toString().slice(-6)}`,
        customerName: r.customerName || "Walk-in Customer",
        customerPhone: r.customerPhone || "",
        deviceName: r.deviceName || "Device",
        serialOrImei: r.serialOrImei || null,
        problemDescription: r.problemDescription || "General Service",
        estimatedCost: (Number(r.estimatedCost) || 0).toFixed(2),
        advancePaid: (Number(r.advancePaid) || 0).toFixed(2),
        status: r.status || "pending",
        date: r.date
          ? new Date(r.date).toISOString()
          : r.createdAt
            ? new Date(r.createdAt).toISOString()
            : new Date().toISOString(),
        notes: r.notes || null,
      };

      await db.insert(schema.repairs).values(repairData);
      return { success: true, data: repairData };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateRepairStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .update(schema.repairs)
        .set({ status: data.status })
        .where(and(eq(schema.repairs.id, data.id), eq(schema.repairs.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateRepairFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    const updates = data.updates || data.repair || data;
    try {
      const payload: any = {};
      if (updates.ticketNo !== undefined) payload.ticketNo = updates.ticketNo;
      if (updates.customerName !== undefined) payload.customerName = updates.customerName;
      if (updates.customerPhone !== undefined) payload.customerPhone = updates.customerPhone;
      if (updates.deviceName !== undefined) payload.deviceName = updates.deviceName;
      if (updates.serialOrImei !== undefined) payload.serialOrImei = updates.serialOrImei;
      if (updates.problemDescription !== undefined)
        payload.problemDescription = updates.problemDescription;
      if (updates.estimatedCost !== undefined)
        payload.estimatedCost = (Number(updates.estimatedCost) || 0).toFixed(2);
      if (updates.advancePaid !== undefined)
        payload.advancePaid = (Number(updates.advancePaid) || 0).toFixed(2);
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.notes !== undefined) payload.notes = updates.notes;

      await db
        .update(schema.repairs)
        .set(payload)
        .where(
          and(
            eq(schema.repairs.id, data.id || updates.id),
            eq(schema.repairs.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteRepairFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.repairs)
        .where(and(eq(schema.repairs.id, data.id), eq(schema.repairs.organizationId, orgId)));
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
