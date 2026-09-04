import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { appName } from "@/lib/env";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CalendarDays,
  Clock,
  User,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Phone,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppointmentsFn,
  createAppointmentFn,
  updateAppointmentStatusFn,
  deleteAppointmentFn,
} from "@/api/appointments";
import { getCustomersFn, createCustomerFn } from "@/api/customers";
import { APPOINTMENT_STATUSES } from "@/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { exportToCSV } from "@/lib/csv";
import { PersistStore } from "@/lib/session-store";
import { ErrorState } from "@/components/ui/error-state";

import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/appointments")({
  head: () => ({ meta: [{ title: `Appointments & Bookings · ${appName}` }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();
  const orgId = PersistStore.getOrgId() || "default";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["appointments", orgId],
    queryFn: () => getAppointmentsFn({ data: {} }),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const rawAppointments = Array.isArray((data as any)?.data) ? (data as any).data : [];
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredAppointments = useMemo(() => {
    let list = rawAppointments;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.customerName?.toLowerCase().includes(lower) ||
          a.serviceName?.toLowerCase().includes(lower) ||
          a.staffName?.toLowerCase().includes(lower) ||
          a.customerPhone?.includes(lower),
      );
    }
    if (filters.status) {
      list = list.filter((a: any) => a.status === filters.status);
    }
    return list;
  }, [rawAppointments, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    const total = rawAppointments.length;
    const scheduled = rawAppointments.filter((a: any) => a.status === "scheduled").length;
    const inProgress = rawAppointments.filter((a: any) => a.status === "in-progress").length;
    const completed = rawAppointments.filter((a: any) => a.status === "completed").length;
    return { total, scheduled, inProgress, completed };
  }, [rawAppointments]);

  const createAppointment = useMutation({
    mutationFn: (data: any) => createAppointmentFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Appointment scheduled successfully");
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        setFormData({
          customerName: "",
          customerPhone: "",
          serviceName: "",
          staffName: "",
          date: format(new Date(), "yyyy-MM-dd"),
          time: "10:00",
          durationMinutes: 30,
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

  const deleteAppointment = useMutation({
    mutationFn: (id: string) => deleteAppointmentFn({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Appointment removed");
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        setDeleteId(null);
      } else {
        toast.error(res?.error || "Failed to remove appointment");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove appointment"),
  });

  const handleCreate = () => {
    if (!formData.customerName || !formData.serviceName) {
      toast.error("Customer name and Service name are required");
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

  const handleExport = () => {
    exportToCSV(
      rawAppointments.map((a: any) => ({
        Customer: a.customerName,
        Phone: a.customerPhone || "-",
        Service: a.serviceName,
        Staff: a.staffName || "-",
        "Date & Time": formatAppDate(a.dateTime, "datetime", "PPpp"),
        Status: a.status,
        Notes: a.notes || "-",
      })),
      [
        { key: "Customer", label: t("customer", "Customer") },
        { key: "Phone", label: t("phone", "Phone") },
        { key: "Service", label: t("service", "Service") },
        { key: "Staff", label: t("staffSpecialist", "Staff Specialist") },
        { key: "Date & Time", label: t("dateTime", "Date & Time") },
        { key: "Status", label: t("status", "Status") },
        { key: "Notes", label: t("notes", "Notes") },
      ],
      "appointments-schedule",
    );
  };

  return (
    <div className="space-y-6">
      <DataPage
        title={t("appointmentsBookings", "Appointments & Service Bookings")}
        description={t("appointmentsDesc", "Salon, clinic, and spa scheduling with staff assignments and live booking status.")}
        primaryAction={{ label: t("newAppointment", "New Appointment"), onClick: () => setIsCreateOpen(true) }}
        searchPlaceholder={t("searchAppointmentsPlaceholder", "Search by customer, service, or staff...")}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[40vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("status", "Status")}
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: t("allBookings", "All Bookings") },
                    ...APPOINTMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder={t("filterByStatus", "Filter by Status")}
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full font-bold shadow-soft"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                {t("applyFilters", "Apply Filters")}
              </Button>
            </div>
          </div>
        )}
        topContent={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("totalBookings", "Total Bookings")}
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">{metrics.total}</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-blue-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("upcoming", "Upcoming")}
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {metrics.scheduled}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-amber-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("inProgress", "In Progress")}
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {metrics.inProgress}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-success/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("completed", "Completed")}
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-success">
                {metrics.completed}
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Table Container */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          {t("customer", "Customer")}
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          {t("serviceNotes", "Service & Notes")}
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          {t("staffSpecialist", "Staff Specialist")}
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          {t("dateTime", "Date & Time")}
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                          {t("status", "Status")}
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          {t("actions", "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {paginatedAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-64 text-center">
                            <EmptyState
                              icon={CalendarDays}
                              title={t("noAppointmentsFound", "No appointments found")}
                              description={
                                search
                                  ? t("noAppointmentsMatchQuery", "No appointments matched your search query.")
                                  : t("noAppointmentsYet", "You haven't scheduled any appointments yet.")
                              }
                              actionLabel={t("scheduleAppointment", "Schedule Appointment")}
                              onAction={() => setIsCreateOpen(true)}
                              className="border-none bg-transparent my-0 py-8 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAppointments.map((a: any) => (
                          <TableRow key={a.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-bold text-foreground whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                                  <User className="size-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground">
                                    {a.customerName}
                                  </p>
                                  {a.customerPhone && (
                                    <p className="text-xs text-muted-foreground">
                                      {a.customerPhone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <p className="font-semibold text-sm text-foreground">
                                {a.serviceName}
                              </p>
                              {a.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {a.notes}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-foreground whitespace-nowrap font-medium">
                              {a.staffName || t("unassigned", "Unassigned")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-primary" />
                                <span>{formatAppDate(a.dateTime, "datetime", "PP · p")}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  a.status === "completed"
                                    ? "bg-success/15 text-success border-success/25"
                                    : a.status === "in-progress"
                                      ? "bg-amber-500/15 text-amber-600 border-amber-500/25"
                                      : a.status === "cancelled"
                                        ? "bg-destructive/15 text-destructive border-destructive/25"
                                        : "bg-blue-500/15 text-blue-600 border-blue-500/25"
                                }`}
                              >
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {a.status !== "completed" && a.status !== "cancelled" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold"
                                    onClick={() =>
                                      updateStatus.mutate({
                                        id: a.id,
                                        status:
                                          a.status === "scheduled" ? "in-progress" : "completed",
                                      })
                                    }
                                  >
                                    {a.status === "scheduled" ? t("start", "Start") : t("complete", "Complete")}
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 rounded-lg"
                                    >
                                      <MoreVertical className="size-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatus.mutate({ id: a.id, status: "completed" })
                                      }
                                      className="text-xs font-semibold cursor-pointer"
                                    >
                                      {t("markCompleted", "Mark Completed")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatus.mutate({ id: a.id, status: "cancelled" })
                                      }
                                      className="text-xs font-semibold cursor-pointer text-destructive"
                                    >
                                      {t("cancelBooking", "Cancel Booking")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeleteId(a.id)}
                                      className="text-xs font-semibold cursor-pointer text-destructive"
                                    >
                                      <Trash2 className="mr-2 size-3.5" /> {t("delete", "Delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden p-3 space-y-3">
                  {paginatedAppointments.length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title={t("noAppointmentsFound", "No appointments found")}
                      description={t("noAppointmentsYet", "You haven't scheduled any appointments yet.")}
                      actionLabel={t("scheduleAppointment", "Schedule Appointment")}
                      onAction={() => setIsCreateOpen(true)}
                      className="border-none bg-transparent my-0 py-6 shadow-none"
                    />
                  ) : (
                    paginatedAppointments.map((a: any) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-sm text-foreground">{a.customerName}</p>
                            <p className="text-xs text-primary font-semibold">{a.serviceName}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              a.status === "completed"
                                ? "bg-success/15 text-success border-success/25"
                                : a.status === "in-progress"
                                  ? "bg-amber-500/15 text-amber-600 border-amber-500/25"
                                  : a.status === "cancelled"
                                    ? "bg-destructive/15 text-destructive border-destructive/25"
                                    : "bg-blue-500/15 text-blue-600 border-blue-500/25"
                            }`}
                          >
                            {a.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-2 text-muted-foreground">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              {t("staff", "Staff")}
                            </span>
                            <span className="font-semibold text-foreground">
                              {a.staffName || t("unassigned", "Unassigned")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              {t("time", "Time")}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatAppDate(a.dateTime, "datetime", "PP · p")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                          {a.status !== "completed" && a.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-semibold"
                              onClick={() =>
                                updateStatus.mutate({
                                  id: a.id,
                                  status: a.status === "scheduled" ? "in-progress" : "completed",
                                })
                              }
                            >
                              {a.status === "scheduled" ? t("start", "Start") : t("complete", "Complete")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredAppointments.length > 0 && (
                  <div className="border-t border-border p-3 sm:p-4">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                      totalItems={filteredAppointments.length}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DataPage>

      {/* Schedule Appointment Drawer */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <CalendarDays className="size-5 text-primary" />
              <span>{t("scheduleServiceAppointment", "Schedule Service Appointment")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("scheduleServiceAppointmentDesc", "Book salon, clinic, spa, or consulting services with assigned staff.")}
            </p>
          </SheetHeader>
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("customerName", "Customer Name")} *</Label>
                  <SearchableSelect
                    options={customers.map((c) => ({
                      value: c.name,
                      label: c.name,
                      sublabel: c.phone || "",
                    }))}
                    value={formData.customerName}
                    onChange={(val) => {
                      const found = customers.find((c) => c.name === val);
                      setFormData({
                        ...formData,
                        customerName: val,
                        customerPhone: found?.phone || formData.customerPhone,
                      });
                    }}
                    placeholder={t("searchOrEnterCustomer", "Search or enter customer...")}
                    onCreate={async (name) => {
                      const res = await createCustomerFn({ data: { customer: { name } } });
                      if (res?.success) {
                        queryClient.invalidateQueries({ queryKey: ["customers"] });
                        return name;
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("phoneNumber", "Phone Number")}</Label>
                  <Input
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder={t("phonePlaceholder", "e.g. +1 555 0192")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("serviceTreatment", "Service / Treatment")} *</Label>
                  <Input
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder={t("serviceTreatmentPlaceholder", "e.g. Hair Spa, Dental Checkup, Massage")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("staffSpecialist", "Staff / Specialist")}</Label>
                  <Input
                    value={formData.staffName}
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    placeholder={t("staffSpecialistPlaceholder", "e.g. Dr. Alex, Sarah")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("date", "Date")}</Label>
                  <DatePicker
                    date={formData.date}
                    onDateChange={(d) =>
                      setFormData({
                        ...formData,
                        date: d ? format(d, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("time", "Time")}</Label>
                  <TimePicker
                    value={formData.time}
                    onChange={(t) => setFormData({ ...formData, time: t })}
                    step={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("durationMin", "Duration (min)")}</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 15 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("notesInstructions", "Notes & Instructions")}</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t("notesPlaceholder", "Optional customer requests or preferences...")}
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createAppointment.isPending || !formData.customerName || !formData.serviceName
                }
                className="min-w-[160px]"
              >
                {createAppointment.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {t("saveAppointment", "Save Appointment")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAppointmentTitle", "Delete Appointment?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAppointmentDesc", "This action cannot be undone. This will permanently remove the appointment record.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteAppointment.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
