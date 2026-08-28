import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRepairsFn, createRepairFn, updateRepairStatusFn, deleteRepairFn } from "@/api/repairs";
import { getCustomersFn } from "@/api/customers";
import { useCurrency } from "@/lib/currency";
import {
  Wrench,
  Printer,
  CheckCircle2,
  Trash2,
  Phone,
  Loader2,
  Search,
  Plus,
  Clock,
  CheckCircle,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  User,
  MoreVertical,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/repairs")({
  head: () => ({ meta: [{ title: "Service & Repair Job Sheets · OneDesk360" }] }),
  component: RepairsPage,
});

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s === "received") {
    return {
      label: "Received",
      color: "bg-info/10 text-info border-info/20",
    };
  }
  if (s === "diagnosing" || s === "in_progress" || s === "in_repair") {
    return {
      label: "In Repair",
      color: "bg-warning/15 text-warning-foreground border-warning/30",
    };
  }
  if (s === "ready" || s === "ready_for_pickup") {
    return {
      label: "Ready for Pickup",
      color: "bg-primary/10 text-primary border-primary/20",
    };
  }
  if (s === "delivered" || s === "completed") {
    return {
      label: "Delivered",
      color: "bg-success/15 text-success border-success/30",
    };
  }
  return {
    label: status,
    color: "bg-muted text-muted-foreground border-border",
  };
}

function RepairsPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: repairsData,
    isLoading: isRepairsLoading,
    isError: isRepairsError,
    refetch: refetchRepairs,
  } = useQuery({
    queryKey: ["repairs", orgId],
    queryFn: async () => {
      const res = (await getRepairsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const repairs = repairsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => {
      const res = (await getCustomersFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const customers = customersData || [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Drawer / Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialOrImei, setSerialOrImei] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [technicianNotes, setTechnicianNotes] = useState("");

  const {
    errors: repErrors,
    validate: validateRep,
    clearError: clearRepError,
    clearAll: clearRepAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    customerPhone: { required: "Customer phone is required" },
    deviceName: { required: "Device / Equipment model is required" },
    problemDescription: { required: "Issue description is required" },
  });

  const totalRepairs = repairs.length;
  const inProgressCount = useMemo(
    () => repairs.filter((r: any) => ["pending", "diagnosing", "in_progress"].includes(r.status)).length,
    [repairs]
  );
  const readyCount = useMemo(
    () => repairs.filter((r: any) => ["ready", "ready_for_pickup"].includes(r.status)).length,
    [repairs]
  );
  const completedCount = useMemo(
    () => repairs.filter((r: any) => ["delivered", "completed"].includes(r.status)).length,
    [repairs]
  );

  const filteredRepairs = useMemo(() => {
    let list = Array.isArray(repairs) ? repairs : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.ticketNo?.toLowerCase().includes(lower) ||
          r.customerName?.toLowerCase().includes(lower) ||
          r.deviceName?.toLowerCase().includes(lower) ||
          r.serialOrImei?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r: any) => (r.status || "").toLowerCase() === statusFilter.toLowerCase());
    }
    return [...list].reverse();
  }, [repairs, debouncedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRepairs.length / pageSize));
  const paginatedRepairs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRepairs.slice(start, start + pageSize);
  }, [filteredRepairs, page, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateRep({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deviceName: deviceName.trim(),
      problemDescription: problemDescription.trim(),
    });
    if (!isValid) return;

    setIsSaving(true);
    try {
      const ticketNo = `REP-${Date.now().toString().slice(-5)}`;
      const res = (await createRepairFn({
        data: {
          repair: {
            ticketNo,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            deviceName: deviceName.trim(),
            serialOrImei: serialOrImei.trim() || null,
            problemDescription: problemDescription.trim(),
            estimatedCost: Number(estimatedCost) || 0,
            advancePaid: Number(advancePaid) || 0,
            status: "pending",
            technicianNotes: technicianNotes.trim() || null,
            createdAt: new Date().toISOString(),
          },
        },
      })) as any;

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["repairs", orgId] });
        toast.success(`Repair ticket #${ticketNo} created!`);
        setIsAddOpen(false);
        setCustomerName("");
        setCustomerPhone("");
        setDeviceName("");
        setSerialOrImei("");
        setProblemDescription("");
        setEstimatedCost("");
        setAdvancePaid("0");
        setTechnicianNotes("");
        clearRepAll();
      } else {
        throw new Error(res?.error || "Failed to create repair ticket");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create repair ticket");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = (await updateRepairStatusFn({ data: { id, status: newStatus as any } })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["repairs", orgId] });
        toast.success(`Job status updated to ${newStatus}`);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const res = (await deleteRepairFn({ data: { id } })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["repairs", orgId] });
        toast.success("Repair ticket deleted");
        setDeleteId(null);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete ticket");
    }
  };

  const handlePrintSlip = (ticket: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Job Sheet - ${ticket.ticketNo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 12px; margin-bottom: 16px; }
            .ticket-no { font-size: 24px; font-weight: 900; color: #111; margin: 4px 0; }
            .section { margin-bottom: 16px; font-size: 13px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .bold { font-weight: 700; }
            .box { background: #f5f5f5; border: 1px solid #eee; padding: 12px; border-radius: 8px; margin: 12px 0; }
            .footer { font-size: 10px; color: #666; text-align: center; margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">Repair Job Sheet & Intake Receipt</div>
            <div class="ticket-no">${ticket.ticketNo}</div>
            <div style="font-size: 12px; color: #666;">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="section">
            <div class="row"><span class="bold">Customer:</span> <span>${ticket.customerName}</span></div>
            <div class="row"><span class="bold">Contact:</span> <span>${ticket.customerPhone || "N/A"}</span></div>
            <div class="row"><span class="bold">Device:</span> <span>${ticket.deviceName}</span></div>
            <div class="row"><span class="bold">Serial / IMEI:</span> <span>${ticket.serialOrImei || "N/A"}</span></div>
          </div>
          <div class="box">
            <div class="bold" style="margin-bottom: 4px;">Reported Issue:</div>
            <div>${ticket.problemDescription}</div>
          </div>
          <div class="section">
            <div class="row"><span class="bold">Estimated Cost:</span> <span>${ticket.estimatedCost}</span></div>
            <div class="row"><span class="bold">Advance Paid:</span> <span>${ticket.advancePaid}</span></div>
            <div class="row"><span class="bold">Balance Due:</span> <span>${Math.max(0, (ticket.estimatedCost || 0) - (ticket.advancePaid || 0))}</span></div>
          </div>
          <div class="footer">
            Terms: Backup data before repair. 30 days warranty on replaced parts. Please bring this receipt for device pickup.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Repair Orders & Job Sheets"
        description="Log customer intake receipts, track diagnostic bench status, record advance deposits, and generate printable thermal work orders."
        actions={
          <Button
            size="sm"
            onClick={() => {
              clearRepAll();
              setIsAddOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New Repair Ticket
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Job Sheets"
          value={String(totalRepairs)}
          hint="All intake tickets"
          icon={Wrench}
          accent="primary"
        />
        <StatCard
          label="On Workbench"
          value={String(inProgressCount)}
          hint="Diagnosing / In progress"
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label="Ready for Pickup"
          value={String(readyCount)}
          hint="Awaiting customer pickup"
          icon={CheckCircle}
          accent="info"
        />
        <StatCard
          label="Delivered & Closed"
          value={String(completedCount)}
          hint="Settled service orders"
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket #, customer, device..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-38 text-xs rounded-lg">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Received / Intake</SelectItem>
                <SelectItem value="in_progress">In Progress / Diagnosing</SelectItem>
                <SelectItem value="ready">Ready for Pickup</SelectItem>
                <SelectItem value="delivered">Delivered / Completed</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isRepairsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={6} rows={6} />
          )
        ) : isRepairsError ? (
          <ErrorState onRetry={refetchRepairs} />
        ) : filteredRepairs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No repair job sheets found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't logged any repair or service intake tickets yet."
            }
            actionLabel="New Repair Ticket"
            onAction={() => {
              clearRepAll();
              setIsAddOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedRepairs.map((r: any) => {
                const badgeInfo = getStatusBadge(r.status);
                const estCost = Number(r.estimatedCost) || 0;
                const advPaid = Number(r.advancePaid) || 0;
                const balDue = Math.max(0, estCost - advPaid);

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="font-mono font-bold text-xs text-primary">
                          #{r.ticketNo}
                        </span>
                        <Badge variant="outline" className={`text-[10px] font-bold ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground truncate">
                          {r.deviceName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {r.customerName} · {r.customerPhone}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1">
                        <span className="text-muted-foreground font-semibold block">Issue:</span>
                        <p className="text-foreground line-clamp-2">{r.problemDescription}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Estimate: <strong className="text-foreground">{formatCurrency(estCost)}</strong></span>
                        <span>Due: <strong className="text-destructive">{formatCurrency(balDue)}</strong></span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintSlip(r)}
                        className="h-8 text-xs font-semibold"
                      >
                        <Printer className="size-3.5 mr-1" /> Slip
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-44">
                          <DropdownMenuItem onClick={() => updateStatus(r.id, "in_progress")}>
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(r.id, "ready")}>
                            Mark Ready for Pickup
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(r.id, "delivered")}>
                            Mark Delivered / Closed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(r.id)} className="text-destructive">
                            <Trash2 className="size-3.5 mr-2" /> Delete Ticket
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredRepairs.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredRepairs.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Device & Model</TableHead>
                    <TableHead>Issue Summary</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRepairs.map((r: any) => {
                    const badgeInfo = getStatusBadge(r.status);

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          #{r.ticketNo}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{r.customerName}</div>
                          <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {r.deviceName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {r.problemDescription}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatCurrency(Number(r.estimatedCost) || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${badgeInfo.color}`}>
                            {badgeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintSlip(r)}
                              className="h-8 text-xs font-semibold"
                            >
                              <Printer className="size-3.5 mr-1" /> Slip
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-44">
                                <DropdownMenuItem onClick={() => updateStatus(r.id, "in_progress")}>
                                  Mark In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(r.id, "ready")}>
                                  Mark Ready
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(r.id, "delivered")}>
                                  Mark Delivered
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteId(r.id)} className="text-destructive">
                                  <Trash2 className="size-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredRepairs.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredRepairs.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Intake Repair Job Sheet
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Register customer equipment details, reported faults, and advance deposit payments.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rep-cust" className="text-xs font-semibold">
                      Customer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rep-cust"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        clearRepError("customerName");
                      }}
                      placeholder="e.g. Alex Morgan"
                      className={repErrors.customerName ? "border-destructive" : ""}
                    />
                    <FieldError message={repErrors.customerName} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rep-phone" className="text-xs font-semibold">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rep-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        clearRepError("customerPhone");
                      }}
                      placeholder="e.g. +1 555-0199"
                      className={repErrors.customerPhone ? "border-destructive" : ""}
                    />
                    <FieldError message={repErrors.customerPhone} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rep-dev" className="text-xs font-semibold">
                      Device / Model <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rep-dev"
                      value={deviceName}
                      onChange={(e) => {
                        setDeviceName(e.target.value);
                        clearRepError("deviceName");
                      }}
                      placeholder="e.g. iPhone 15 Pro, Dell XPS 15"
                      className={repErrors.deviceName ? "border-destructive" : ""}
                    />
                    <FieldError message={repErrors.deviceName} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rep-sn" className="text-xs font-semibold">Serial / IMEI</Label>
                    <Input
                      id="rep-sn"
                      value={serialOrImei}
                      onChange={(e) => setSerialOrImei(e.target.value)}
                      placeholder="e.g. 356789102938475"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rep-issue" className="text-xs font-semibold">
                    Reported Problem / Diagnostics <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="rep-issue"
                    rows={3}
                    value={problemDescription}
                    onChange={(e) => {
                      setProblemDescription(e.target.value);
                      clearRepError("problemDescription");
                    }}
                    placeholder="e.g. Cracked screen, battery draining rapidly..."
                    className={repErrors.problemDescription ? "border-destructive" : ""}
                  />
                  <FieldError message={repErrors.problemDescription} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rep-est" className="text-xs font-semibold">Estimated Repair Cost ($)</Label>
                    <Input
                      id="rep-est"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rep-adv" className="text-xs font-semibold">Advance Deposit Paid ($)</Label>
                    <Input
                      id="rep-adv"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rep-notes" className="text-xs font-semibold">Technician Internal Notes</Label>
                  <Input
                    id="rep-notes"
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="e.g. Replacement OLED screen ordered from vendor"
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Create Job Sheet
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Delete Repair Ticket
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to permanently delete this repair ticket?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteId && deleteTicket(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
