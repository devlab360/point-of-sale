import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";

const insertSchema = schema.deliveryChallans
  ? createInsertSchema(schema.deliveryChallans).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.deliveryChallans
  ? createInsertSchema(schema.deliveryChallans).partial()
  : z.any();
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const getDeliveryChallansFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      const all = await db
        .select()
        .from(schema.deliveryChallans)
        .where(eq(schema.deliveryChallans.organizationId, orgId));
      return { success: true, data: all };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db.insert(schema.deliveryChallans).values({
        id: uuidv4(),
        organizationId: orgId,
        challanNo: data.challan.challanNo,
        date: new Date(data.challan.date).toISOString(),
        customerId: data.challan.customerId,
        customerName: data.challan.customerName,
        transportName: data.challan.transportName || null,
        vehicleNo: data.challan.vehicleNo || null,
        driverName: data.challan.driverName || null,
        notes: data.challan.notes || null,
        items: data.challan.items,
        status: data.challan.status,
      });
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateDeliveryChallanStatusFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .update(schema.deliveryChallans)
        .set({
          status: data.status,
        })
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
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const orgId = session.orgId;
    try {
      await db
        .delete(schema.deliveryChallans)
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
