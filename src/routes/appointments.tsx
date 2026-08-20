import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, User, Plus, Loader2, Calendar as CalendarIcon, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointmentsFn, createAppointmentFn, updateAppointmentStatusFn } from "@/api/appointments";
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
    notes: ""
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
          notes: ""
        });
      } else {
        toast.error("Failed to schedule appointment");
      }
    }
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: string; status: "scheduled" | "in-progress" | "completed" | "cancelled" }) => 
      updateAppointmentStatusFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Status updated");
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } else {
        toast.error("Failed to update status");
      }
    }
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
      notes: formData.notes
    });
  };

  const appointments = data?.success ? data.data : [];

  return (
    <>
      <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Schedule Appointment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input 
                        value={formData.customerName}
                        onChange={e => setFormData({...formData, customerName: e.target.value})}
                        placeholder="John Doe" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input 
                        value={formData.customerPhone}
                        onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                        placeholder="(555) 000-0000" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Service *</Label>
                      <Input 
                        value={formData.serviceName}
                        onChange={e => setFormData({...formData, serviceName: e.target.value})}
                        placeholder="e.g. Haircut & Styling" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Staff / Stylist</Label>
                      <Input 
                        value={formData.staffName}
                        onChange={e => setFormData({...formData, staffName: e.target.value})}
                        placeholder="e.g. Emma" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input 
                        type="time"
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Input 
                        type="number"
                        min={15}
                        step={15}
                        value={formData.durationMinutes}
                        onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input 
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Optional notes..." 
                    />
                  </div>

                  <Button 
                    className="w-full mt-2" 
                    onClick={handleCreate}
                    disabled={createAppointment.isPending}
                  >
                    {createAppointment.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Appointment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center p-12 border rounded-xl bg-muted/20 border-dashed">
                <h3 className="font-semibold text-lg">No appointments</h3>
                <p className="text-muted-foreground mt-1 text-sm">You have no upcoming appointments scheduled.</p>
              </div>
            ) : (
              appointments.map((apt: any) => {
                const dateObj = parseISO(apt.dateTime);
                const endDateObj = parseISO(apt.endTime);
                const duration = Math.round((endDateObj.getTime() - dateObj.getTime()) / 60000);
                
                let borderClass = "border-l-primary";
                let badgeVariant = "default" as any;
                if (apt.status === "completed") { borderClass = "border-l-green-500 opacity-70"; badgeVariant = "outline"; }
                if (apt.status === "in-progress") { borderClass = "border-l-blue-500"; badgeVariant = "secondary"; }
                if (apt.status === "cancelled") { borderClass = "border-l-red-500 opacity-50"; badgeVariant = "destructive"; }

                return (
                  <Card key={apt.id} className={`border-l-4 ${borderClass}`}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-md min-w-24 border">
                          <span className="text-xs text-muted-foreground mb-1">{formatAppDate(dateObj, "date", "MMM d")}</span>
                          <span className="text-sm font-bold text-foreground">{formatAppDate(dateObj, "time", "h:mm a")}</span>
                          <span className="text-xs text-muted-foreground mt-1">{duration} min</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{apt.serviceName}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {apt.customerName}</span>
                            {apt.customerPhone && (
                              <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {apt.customerPhone}</span>
                            )}
                            {apt.staffName && (
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> with {apt.staffName}</span>
                            )}
                          </div>
                          {apt.notes && (
                            <p className="text-xs mt-2 text-muted-foreground italic">Note: {apt.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2">
                        <Badge variant={badgeVariant} className="capitalize">{apt.status}</Badge>
                        <Select 
                          value={apt.status} 
                          onValueChange={(val: any) => updateStatus.mutate({ id: apt.id, status: val })}
                          disabled={updateStatus.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-[130px]">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
    </>
  );
}
