import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";
import { v4 as uuidv4 } from "uuid";

const ChallanItemSchema = z
  .object({
    productId: z.string().optional(),
    productName: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const ChallanInputSchema = z
  .object({
    id: z.string().optional(),
    challanNo: z.string().optional(),
    date: z.string().optional(),
    customerId: z.string().nullable().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().nullable().optional(),
    transportName: z.string().nullable().optional(),
    vehicleNo: z.string().nullable().optional(),
    driverName: z.string().nullable().optional(),
    driverPhone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    items: z.array(ChallanItemSchema).optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const getDeliveryChallansFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const all = await db
        .select()
        .from(schema.deliveryChallans)
        .where(
          and(
            eq(schema.deliveryChallans.organizationId, orgId),
            notDeleted(schema.deliveryChallans.deletedAt),
          ),
        );
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(z.object({ challan: ChallanInputSchema }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const newChallan = {
        id: data.challan?.id || uuidv4(),
        organizationId: orgId,
        challanNo: data.challan?.challanNo || `DC-${Date.now()}`,
        date: new Date(data.challan?.date || Date.now()).toISOString(),
        customerId: data.challan?.customerId || null,
        customerName: data.challan?.customerName || "Walk-in Customer",
        customerPhone: data.challan?.customerPhone || null,
        transportName: data.challan?.transportName || null,
        vehicleNo: data.challan?.vehicleNo || null,
        driverName: data.challan?.driverName || null,
        driverPhone: data.challan?.driverPhone || null,
        notes: data.challan?.notes || null,
        items: data.challan?.items || [],
        status: data.challan?.status || "delivered",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const inserted = await db.insert(schema.deliveryChallans).values(newChallan).returning();
      return { success: true, data: inserted[0] || newChallan };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateDeliveryChallanStatusFn = createServerFn({ method: "POST" })
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
        .update(schema.deliveryChallans)
        .set({ status: data.status })
        .where(
          and(
            eq(schema.deliveryChallans.id, data.id),
            eq(schema.deliveryChallans.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.deliveryChallans)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(schema.deliveryChallans.id, data.id),
            eq(schema.deliveryChallans.organizationId, orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
