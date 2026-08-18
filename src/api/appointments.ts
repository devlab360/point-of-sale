import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

// ---------------- Appointments API ----------------

export const getAppointmentsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.organizationId, session.orgId))
        .orderBy(desc(schema.appointments.dateTime));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createAppointmentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
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
      const id = uuidv4();
      const res = await db
        .insert(schema.appointments)
        .values({
          id,
          organizationId: session.orgId,
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
        })
        .returning();
      return { success: true, data: res[0] };
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
      const res = await db
        .update(schema.appointments)
        .set({ status: data.status })
        .where(
          and(
            eq(schema.appointments.id, data.id),
            eq(schema.appointments.organizationId, session.orgId),
          ),
        )
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });
