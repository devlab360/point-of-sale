import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepairsFn, createRepairFn, updateRepairStatusFn, deleteRepairFn } from "@/api/repairs";
import { getCustomersFn } from "@/api/customers";
import { useCurrency } from "@/lib/currency";
import {
  Wrench,
  Printer,
  CheckCircle2,
  MoreVertical,
  Trash2,
  ShieldCheck,
  Phone,
  Loader2,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/repairs")({
  head: () => ({ meta: [{ title: "Service & Repair Management · OneDesk360" }] }),
  component: RepairsPage,
});

function RepairsPage() {
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: repairsData } = useQuery({
    queryKey: ["repairs", orgId],
    queryFn: async () => ((await getRepairsFn({ data: {} })) as any)?.data || [],
  });
  const rawRepairs = repairsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialOrImei, setSerialOrImei] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [notes, setNotes] = useState(
    "Backup data before repair. 30 days warranty on replaced parts.",
  );

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredRepairs = useMemo(() => {
    let filtered = rawRepairs;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.ticketNo.toLowerCase().includes(lower) ||
          r.customerName.toLowerCase().includes(lower) ||
          r.deviceName.toLowerCase().includes(lower) ||
          r.serialOrImei?.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    return filtered.reverse();
  }, [rawRepairs, debouncedSearch, filters.status]);

  const totalPages = Math.max(1, Math.ceil(filteredRepairs.length / itemsPerPage));
  const paginated = filteredRepairs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const {
    errors: repErrors,
    validate: validateRep,
    clearError: clearRepError,
    clearAll: clearRepAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    customerPhone: { required: "Phone number is required" },
    deviceName: { required: "Device name is required" },
    problemDescription: { required: "Problem description is required" },
  });

  const handleCreateRepair = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateRep({ customerName, customerPhone, deviceName, problemDescription });
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const ticketNo = `REP-${Date.now().toString().slice(-6)}`;
      await createRepairFn({
        data: {
          repair: {
            ticketNo,
            customerName,
            customerPhone,
            deviceName,
            serialOrImei,
            problemDescription,
            estimatedCost: Number(estimatedCost),
            advancePaid: Number(advancePaid),
            status: "pending",
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast.success("Repair ticket created successfully");
      setIsAddOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setDeviceName("");
      setSerialOrImei("");
      setProblemDescription("");
      setEstimatedCost("");
      setAdvancePaid("");
      clearRepAll();
    } catch (err) {
      toast.error("Failed to create repair ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: any) => {
    await updateRepairStatusFn({ data: { id, status: newStatus } });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
    toast.success(`Repair status updated to ${newStatus}`);
  };

  const deleteRepair = async (id: string) => {
    await deleteRepairFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
    toast.success("Repair ticket deleted");
  };

  return (
    <div>
      <DataPage
        title="Service & Repair Job Sheets"
        description="Track electronics, mobile, computer & vehicle repair tickets from intake to delivery."
        primaryAction={{ label: "Create Repair Ticket", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by ticket #, customer, or IMEI..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "received", label: "Received" },
                    { value: "diagnosing", label: "Diagnosing" },
                    { value: "repaired", label: "Repaired" },
                    { value: "delivered", label: "Delivered" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            {/* Desktop Table */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Device / Model</TableHead>
                    <TableHead>Serial / IMEI</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead className="text-right">Advance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <EmptyState
                          icon={Wrench}
                          title="No repair tickets found"
                          description={
                            search
                              ? "Try adjusting your search query."
                              : "Create your first repair ticket to manage device service."
                          }
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell
                          className="font-mono font-semibold text-primary whitespace-nowrap cursor-pointer hover:underline"
                          onClick={() => setViewItem(r)}
                        >
                          {r.ticketNo}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-semibold text-foreground text-sm">
                            {r.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap text-sm">
                          {r.deviceName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {r.serialOrImei || "—"}
                        </TableCell>
                        <TableCell className="number text-right font-semibold text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(r.estimatedCost)}
                        </TableCell>
                        <TableCell className="number text-right font-semibold text-success whitespace-nowrap text-sm">
                          {formatCurrency(r.advancePaid)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.status === "delivered" ? (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs font-semibold">
                              Delivered
                            </Badge>
                          ) : r.status === "repaired" ? (
                            <Badge className="bg-info/10 text-info border-info/20 text-xs font-semibold">
                              Repaired & Ready
                            </Badge>
                          ) : r.status === "diagnosing" ? (
                            <Badge className="bg-warning/10 text-warning-foreground border-warning/20 text-xs font-semibold">
                              In Diagnosis
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-semibold">
                              Received
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-9 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-lg">
                              <DropdownMenuItem
                                onClick={() => setViewItem(r)}
                                className="text-xs font-medium cursor-pointer"
                              >
                                <Printer className="mr-2 size-4 text-primary" /> View / Print Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(r.id, "diagnosing")}
                                className="text-xs font-medium text-warning-foreground cursor-pointer"
                              >
                                <Wrench className="mr-2 size-4" /> Mark In Diagnosis
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(r.id, "repaired")}
                                className="text-xs font-medium text-info cursor-pointer"
                              >
                                <CheckCircle2 className="mr-2 size-4" /> Mark Repaired
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(r.id, "delivered")}
                                className="text-xs font-semibold text-success cursor-pointer"
                              >
                                <ShieldCheck className="mr-2 size-4" /> Mark Delivered
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive text-xs font-medium cursor-pointer"
                                onClick={() => deleteRepair(r.id)}
                              >
                                <Trash2 className="mr-2 size-4" /> Delete Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Feed (< 768px) */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Wrench}
                  title="No repair tickets found"
                  description={
                    search
                      ? "Try adjusting your search query."
                      : "Create your first repair ticket to manage device service."
                  }
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                paginated.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => setViewItem(r)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {r.ticketNo}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold py-0 ${
                            r.status === "delivered"
                              ? "bg-success/12 text-success"
                              : r.status === "repaired"
                                ? "bg-info/12 text-info"
                                : r.status === "diagnosing"
                                  ? "bg-warning/15 text-warning-foreground"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="mt-1 font-bold text-foreground text-xs sm:text-sm">
                        {r.customerName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.deviceName} · {r.customerPhone}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-black text-foreground">
                          {formatCurrency(r.estimatedCost)}
                        </span>
                        {r.advancePaid > 0 && (
                          <span className="font-bold text-success">
                            (Adv: {formatCurrency(r.advancePaid)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredRepairs.length > 0 && (
              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredRepairs.length}
                />
              </div>
            )}
          </div>
        </div>
      </DataPage>

      {/* Create Repair Ticket Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearRepAll();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wrench className="size-5 text-primary" />
              <span>Create Service & Repair Ticket</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateRepair} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Customer Name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    clearRepError("customerName");
                  }}
                  className={
                    repErrors.customerName
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                <FieldError message={repErrors.customerName} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <PhoneInput
                  placeholder="e.g. 1711000000"
                  value={customerPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setCustomerPhone(e.target.value);
                    clearRepError("customerPhone");
                  }}
                  className={
                    repErrors.customerPhone
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                <FieldError message={repErrors.customerPhone} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Device / Model Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Device / Model Name"
                  value={deviceName}
                  onChange={(e) => {
                    setDeviceName(e.target.value);
                    clearRepError("deviceName");
                  }}
                  className={
                    repErrors.deviceName ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={repErrors.deviceName} />
              </div>
              <div className="space-y-1.5">
                <Label>Serial / IMEI Number</Label>
                <Input
                  placeholder="e.g. Serial or IMEI Number"
                  value={serialOrImei}
                  onChange={(e) => setSerialOrImei(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Problem / Fault Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="e.g. Describe the device issue or fault"
                value={problemDescription}
                onChange={(e) => {
                  setProblemDescription(e.target.value);
                  clearRepError("problemDescription");
                }}
                className={
                  repErrors.problemDescription
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              <FieldError message={repErrors.problemDescription} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Advance Paid</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  clearRepAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Create Repair Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View / Print Repair Ticket Sheet */}
      <Sheet open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border"
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 pr-8">
            <div>
              <SheetTitle className="text-xl font-bold text-primary">
                {viewItem?.ticketNo}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Repair Receipt for {viewItem?.customerName}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 size-3.5" /> Print Receipt Slip
            </Button>
          </SheetHeader>

          {viewItem && (
            <div className="space-y-6 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 bg-muted/20">
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    Customer Info
                  </h4>
                  <div className="font-semibold text-base mt-1">{viewItem.customerName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="size-3" /> {viewItem.customerPhone}
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    Device Details
                  </h4>
                  <div className="font-semibold text-base mt-1">{viewItem.deviceName}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    SN: {viewItem.serialOrImei || "N/A"}
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              <div className="rounded-xl border p-4 space-y-1">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">
                  Reported Problem Description
                </h4>
                <div className="text-sm font-medium pt-1 text-foreground">
                  {viewItem.problemDescription}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs">
                  <span>Estimated Repair Cost:</span>
                  <span className="font-semibold">{formatCurrency(viewItem.estimatedCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-success">
                  <span>Advance Deposit Paid:</span>
                  <span className="font-semibold">-{formatCurrency(viewItem.advancePaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Balance Due upon Delivery:</span>
                  <span className="text-destructive">
                    {formatCurrency(Math.max(0, viewItem.estimatedCost - viewItem.advancePaid))}
                  </span>
                </div>
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-8 pt-10 border-t">
                <div className="text-center">
                  <div className="border-b border-dashed border-foreground/40 pb-8"></div>
                  <div className="text-xs font-semibold mt-2">Customer Signature</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed border-foreground/40 pb-8"></div>
                  <div className="text-xs font-semibold mt-2">Technician Signature & Stamp</div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
