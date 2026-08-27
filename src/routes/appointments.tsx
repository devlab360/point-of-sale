import { createFileRoute } from "@tanstack/react-router";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  Clock,
  User,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppointmentsFn,
  createAppointmentFn,
  updateAppointmentStatusFn,
} from "@/api/appointments";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    serviceName: "",
    staffName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    durationMinutes: 30,
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => getAppointmentsFn(),
  });

  const createAppointment = useMutation({
    mutationFn: (data: any) => createAppointmentFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Appointment scheduled successfully");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        // Reset form
        setFormData({
          ...formData,
          customerName: "",
          customerPhone: "",
          serviceName: "",
          notes: "",
        });
      } else {
        toast.error("Failed to schedule appointment");
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: (data: {
      id: string;
      status: "scheduled" | "in-progress" | "completed" | "cancelled";
    }) => updateAppointmentStatusFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Status updated");
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } else {
        toast.error("Failed to update status");
      }
    },
  });

  const handleCreate = () => {
    if (!formData.customerName || !formData.serviceName) {
      toast.error("Customer name and Service are required");
      return;
    }

    const dateTimeStr = `${formData.date}T${formData.time}:00`;
    const dateTime = new Date(dateTimeStr);
    const endTime = new Date(dateTime.getTime() + formData.durationMinutes * 60000);

    createAppointment.mutate({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      serviceName: formData.serviceName,
      staffName: formData.staffName,
      dateTime: dateTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: formData.notes,
    });
  };

  const appointments = data?.success ? data.data : [];

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Appointments & Service Bookings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Salon, clinic, and spa scheduling with staff assignments.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-soft">
              <Plus className="size-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Customer Name *</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Customer Name"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Phone Number</Label>
                  <Input
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="e.g. +1 555 0192"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Service *</Label>
                  <Input
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="e.g. Haircut & Styling"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Staff / Specialist</Label>
                  <Input
                    value={formData.staffName}
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    placeholder="e.g. Sarah"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Time</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Duration (min)</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 15 })
                    }
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional service notes..."
                  className="rounded-xl"
                />
              </div>

              <Button
                className="w-full mt-2 font-bold rounded-xl shadow-soft"
                onClick={handleCreate}
                disabled={
                  createAppointment.isPending || !formData.customerName || !formData.serviceName
                }
              >
                {createAppointment.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Save Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <TableSkeleton />
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-muted/20 border-dashed border-border/80">
            <CalendarDays className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-bold text-base text-foreground">No appointments scheduled</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Create your first client appointment to track bookings.
            </p>
          </div>
        ) : (
          appointments.map((apt: any) => {
            const dateObj = parseISO(apt.dateTime);
            const endDateObj = parseISO(apt.endTime);
            const duration = Math.round((endDateObj.getTime() - dateObj.getTime()) / 60000);

            const isCompleted = apt.status === "completed";
            const isInProgress = apt.status === "in-progress";
            const isCancelled = apt.status === "cancelled";

            return (
              <div
                key={apt.id}
                className={`relative rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ease-in-out group ${
                  isCompleted
                    ? "opacity-75 bg-muted/20 border-border/40"
                    : isCancelled
                      ? "opacity-50 border-destructive/20 bg-destructive/5"
                      : "bg-card border-border/80 hover:border-primary/40 hover:-translate-y-1"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl min-w-20 sm:min-w-24 shrink-0 transition-colors ${
                      isCompleted
                        ? "bg-muted/50 border-muted text-muted-foreground"
                        : isCancelled
                          ? "bg-destructive/10 border-destructive/20 text-destructive"
                          : "bg-primary/5 text-primary border-primary/20 group-hover:bg-primary/10 group-hover:border-primary/30"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      {formatAppDate(dateObj, "date", "MMM d")}
                    </span>
                    <span className="text-sm font-black text-foreground mt-0.5">
                      {formatAppDate(dateObj, "time", "h:mm a")}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                      {duration} min
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`font-bold text-base truncate transition-colors ${
                        isCompleted || isCancelled
                          ? "text-foreground"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {apt.serviceName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground mt-1 font-medium">
                      <span className="flex items-center gap-1.5 text-foreground font-bold bg-background px-2 py-0.5 rounded border shadow-sm">
                        <User className="size-3 text-primary" /> {apt.customerName}
                      </span>
                      {apt.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5 text-muted-foreground/70" />{" "}
                          {apt.customerPhone}
                        </span>
                      )}
                      {apt.staffName && (
                        <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border border-border/60">
                          <Clock className="size-3.5 text-muted-foreground/70" /> Stylist:{" "}
                          {apt.staffName}
                        </span>
                      )}
                    </div>
                    {apt.notes && (
                      <p className="text-xs mt-2 text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/40">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <Badge
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isCompleted
                        ? "bg-success/12 text-success border-success/25"
                        : isInProgress
                          ? "bg-info/12 text-info border-info/25"
                          : isCancelled
                            ? "bg-destructive/12 text-destructive border-destructive/25"
                            : "bg-primary/12 text-primary border-primary/25"
                    }`}
                  >
                    {apt.status}
                  </Badge>

                  <Select
                    value={apt.status}
                    onValueChange={(val: any) => updateStatus.mutate({ id: apt.id, status: val })}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs w-[130px] rounded-xl font-bold bg-background">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="scheduled" className="text-xs font-semibold">
                        Scheduled
                      </SelectItem>
                      <SelectItem value="in-progress" className="text-xs font-semibold text-info">
                        In Progress
                      </SelectItem>
                      <SelectItem value="completed" className="text-xs font-semibold text-success">
                        Completed
                      </SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-xs font-semibold text-destructive"
                      >
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
