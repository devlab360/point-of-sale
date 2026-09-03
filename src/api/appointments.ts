import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notDeleted } from "@/lib/soft-delete";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

export const getAppointmentsFn = createServerFn({ method: "GET" })
  .validator(z.object({}).optional().default({}))
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .select()
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.organizationId, orgId),
            notDeleted(schema.appointments.deletedAt),
          ),
        )
        .orderBy(desc(schema.appointments.dateTime));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createAppointmentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().optional(),
      customerId: z.string().optional(),
      customerName: z.string().min(1),
      customerPhone: z.string().optional(),
      serviceId: z.string().optional(),
      serviceName: z.string().min(1),
      staffId: z.string().optional(),
      staffName: z.string().optional(),
      dateTime: z.string(),
      endTime: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const id = data.id || uuidv4();
      const newApt = {
        id,
        organizationId: orgId,
        customerId: data.customerId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        serviceId: data.serviceId || null,
        serviceName: data.serviceName,
        staffId: data.staffId || null,
        staffName: data.staffName || null,
        dateTime: new Date(data.dateTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        status: "scheduled",
        notes: data.notes || null,
      };

      const res = await db.insert(schema.appointments).values(newApt).returning();
      return { success: true, data: res[0] || newApt };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateAppointmentStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const res = await db
        .update(schema.appointments)
        .set({ status: data.status })
        .where(
          and(eq(schema.appointments.id, data.id), eq(schema.appointments.organizationId, orgId)),
        )
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteAppointmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      await db
        .update(schema.appointments)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(eq(schema.appointments.id, data.id), eq(schema.appointments.organizationId, orgId)),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
