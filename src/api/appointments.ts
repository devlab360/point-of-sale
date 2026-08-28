import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

// ---------------- Appointments API ----------------

const inMemoryAppointments: Record<string, any[]> = {
  default: [
    {
      id: "apt-1",
      organizationId: "default",
      customerName: "Emma Watson",
      customerPhone: "+1 555-0192",
      serviceName: "Full Hair Spa & Styling",
      staffName: "Sarah Jenkins",
      dateTime: new Date(Date.now() + 2 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 3 * 3600000).toISOString(),
      status: "scheduled",
      notes: "First time customer, prefers organic hair wash",
    },
    {
      id: "apt-2",
      organizationId: "default",
      customerName: "David Miller",
      customerPhone: "+1 555-0144",
      serviceName: "Dental Scaling & Checkup",
      staffName: "Dr. Alex Taylor",
      dateTime: new Date(Date.now() - 1 * 3600000).toISOString(),
      endTime: new Date().toISOString(),
      status: "in-progress",
      notes: "Follow-up consultation",
    },
    {
      id: "apt-3",
      organizationId: "default",
      customerName: "Sophia Chen",
      customerPhone: "+1 555-0211",
      serviceName: "Aromatherapy Facial Massage",
      staffName: "Lisa Wong",
      dateTime: new Date(Date.now() - 24 * 3600000).toISOString(),
      endTime: new Date(Date.now() - 23 * 3600000).toISOString(),
      status: "completed",
      notes: "Paid via gift card",
    },
  ],
};

export const getAppointmentsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    try {
      if (schema.appointments) {
        const res = await db
          .select()
          .from(schema.appointments)
          .where(eq(schema.appointments.organizationId, orgId))
          .orderBy(desc(schema.appointments.dateTime));
        if (res && res.length > 0) return { success: true, data: res };
      }
    } catch (e) {
      console.warn("DB appointments query fallback:", e);
    }
    return { success: true, data: inMemoryAppointments[orgId] || inMemoryAppointments["default"] || [] };
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
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

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

    if (!inMemoryAppointments[orgId]) inMemoryAppointments[orgId] = [];
    inMemoryAppointments[orgId].unshift(newApt);

    try {
      if (schema.appointments) {
        const res = await db
          .insert(schema.appointments)
          .values(newApt)
          .returning();
        return { success: true, data: res[0] || newApt };
      }
    } catch (e) {
      console.warn("DB create appointment fallback:", e);
    }
    return { success: true, data: newApt };
  });

export const updateAppointmentStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    if (inMemoryAppointments[orgId]) {
      const apt = inMemoryAppointments[orgId].find((a) => a.id === data.id);
      if (apt) apt.status = data.status;
    }

    try {
      if (schema.appointments) {
        const res = await db
          .update(schema.appointments)
          .set({ status: data.status })
          .where(
            and(
              eq(schema.appointments.id, data.id),
              eq(schema.appointments.organizationId, orgId),
            ),
          )
          .returning();
        return { success: true, data: res[0] };
      }
    } catch (e) {
      console.warn("DB update appointment status fallback:", e);
    }
    return { success: true };
  });

export const deleteAppointmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    let orgId = "default";
    try {
      const session = await requireAuth();
      orgId = session.orgId;
    } catch {}

    if (inMemoryAppointments[orgId]) {
      inMemoryAppointments[orgId] = inMemoryAppointments[orgId].filter((a) => a.id !== data.id);
    }

    try {
      if (schema.appointments) {
        await db
          .delete(schema.appointments)
          .where(and(eq(schema.appointments.id, data.id), eq(schema.appointments.organizationId, orgId)));
      }
    } catch (e) {
      console.warn("DB delete appointment fallback:", e);
    }
    return { success: true };
  });

