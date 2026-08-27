import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRentalsFn, createRentalFn, updateRentalStatusFn, deleteRentalFn } from "@/api/rentals";
import { useCurrency } from "@/lib/currency";
import { KeyRound, Plus, MoreVertical, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/rentals")({
  head: () => ({ meta: [{ title: "Equipment Rentals & Booking · OneDesk360" }] }),
  component: RentalsPage,
});

function RentalsPage() {
  const { formatCurrency } = useCurrency();
  const { formatAppDate } = useAppFormatter();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rentalsData } = useQuery({
    queryKey: ["rentals", orgId],
    queryFn: async () => ((await getRentalsFn({ data: {} })) as any)?.data || [],
  });
  const rawRentals = rentalsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [rentStartDate, setRentStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredRentals = useMemo(() => {
    let filtered = rawRentals;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rentalNo.toLowerCase().includes(lower) ||
          r.customerName.toLowerCase().includes(lower) ||
          r.itemName.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    return filtered.reverse();
  }, [rawRentals, debouncedSearch, filters.status]);

  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / itemsPerPage));
  const paginated = filteredRentals.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const {
    errors: rntErrors,
    validate: validateRnt,
    clearError: clearRntError,
    clearAll: clearRntAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    itemName: { required: "Item name is required" },
    dailyRate: { required: "Daily rate is required", positive: "Rate must be positive" },
    rentStartDate: { required: "Start date is required" },
    expectedReturnDate: { required: "Return date is required" },
  });

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateRnt({
      customerName,
      itemName,
      dailyRate,
      rentStartDate,
      expectedReturnDate,
    });
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const rNo = `RNT-${Date.now().toString().slice(-6)}`;
      await createRentalFn({
        data: {
          rental: {
            rentalNo: rNo,
            customerName,
            itemName,
            rentStartDate,
            expectedReturnDate,
            dailyRate: parseFloat(dailyRate) || 0,
            securityDeposit: parseFloat(securityDeposit) || 0,
            totalAmount: 0,
            status: "active",
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      toast.success(`Rental Booking ${rNo} created!`);
      setIsAddOpen(false);
      setCustomerName("");
      setItemName("");
      setDailyRate("");
      setSecurityDeposit("");
      clearRntAll();
    } catch (err) {
      toast.error("Failed to create rental booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markReturned = async (id: string) => {
    await updateRentalStatusFn({ data: { id, status: "returned" } });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    toast.success("Equipment returned successfully");
  };

  const deleteRental = async (id: string) => {
    await deleteRentalFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    toast.success("Rental record deleted");
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Equipment Rentals & Bookings (ভাড়া ও রেেন্টাল)"
        description="Manage rented cameras, vehicles, event props, scaffolding, and tools."
        primaryAction={{ label: "New Rental Booking", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by rental #, customer, or item..."
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
                    { value: "active", label: "Active Rented" },
                    { value: "returned", label: "Returned & Closed" },
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
            <div className="table-desktop overflow-x-auto hidden md:block">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Rental #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rented Asset</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead className="text-right">Deposit</TableHead>
                    <TableHead>Return Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <EmptyState
                          icon={KeyRound}
                          title="No rental bookings found"
                          description={
                            search
                              ? "Try adjusting your search query."
                              : "Create your first rental booking for cameras, tools, or vehicles."
                          }
                          actionLabel="Add Rental Booking"
                          onAction={() => setIsAddOpen(true)}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                          {r.rentalNo}
                        </TableCell>
                        <TableCell className="font-bold text-foreground whitespace-nowrap text-xs sm:text-sm">
                          {r.customerName}
                        </TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap text-xs">
                          {r.itemName}
                        </TableCell>
                        <TableCell className="number text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(r.dailyRate)}/day
                        </TableCell>
                        <TableCell className="number text-right font-black text-warning-foreground whitespace-nowrap text-xs">
                          {formatCurrency(r.securityDeposit)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {r.expectedReturnDate ? formatAppDate(r.expectedReturnDate) : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.status === "returned" ? (
                            <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                              Returned
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/12 text-primary border-primary/25 text-[10px] font-bold">
                              Active Rented
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              {r.status !== "returned" && (
                                <DropdownMenuItem
                                  onClick={() => markReturned(r.id)}
                                  className="text-xs font-bold text-success"
                                >
                                  <CheckCircle2 className="mr-2 size-3.5" /> Mark Returned
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => deleteRental(r.id)}
                              >
                                <Trash2 className="mr-2 size-3.5" /> Delete Booking
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
            <div className="table-mobile-cards p-3 space-y-2.5 md:hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={KeyRound}
                  title="No rental bookings found"
                  description={
                    search
                      ? "Try adjusting your search query."
                      : "Create your first rental booking for cameras, tools, or vehicles."
                  }
                  actionLabel="Add Rental Booking"
                  onAction={() => setIsAddOpen(true)}
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                paginated.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {r.rentalNo}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold py-0 ${
                            r.status === "returned"
                              ? "bg-success/12 text-success"
                              : "bg-primary/12 text-primary"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                        {r.customerName}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{r.itemName}</p>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Due: {r.expectedReturnDate ? formatAppDate(r.expectedReturnDate) : "-"}
                      </span>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">
                        {formatCurrency(r.dailyRate)}/d
                      </div>
                      <span className="text-[10px] text-warning-foreground font-bold mt-0.5 block">
                        Dep: {formatCurrency(r.securityDeposit)}
                      </span>
                      {r.status !== "returned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-bold mt-1 text-success border-success/30 hover:bg-success/10"
                          onClick={() => markReturned(r.id)}
                        >
                          Return
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredRentals.length > 0 && (
              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredRentals.length}
                />
              </div>
            )}
          </div>
        </div>
      </DataPage>

      {/* Create Rental Booking Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearRntAll();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <span>Create Rental Booking</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateRental} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Customer Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  clearRntError("customerName");
                }}
                className={
                  rntErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={rntErrors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Rented Equipment / Item <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Item Name"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  clearRntError("itemName");
                }}
                className={
                  rntErrors.itemName ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={rntErrors.itemName} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Rent Start Date <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                  <DatePicker
                    date={rentStartDate ? new Date(rentStartDate) : undefined}
                    onDateChange={(d) => {
                      setRentStartDate(d ? d.toISOString().split("T")[0] : "");
                      clearRntError("rentStartDate");
                    }}
                  />
                </div>
                <FieldError message={rntErrors.rentStartDate} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Expected Return Date <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                  <DatePicker
                    date={expectedReturnDate ? new Date(expectedReturnDate) : undefined}
                    onDateChange={(d) => {
                      setExpectedReturnDate(d ? d.toISOString().split("T")[0] : "");
                      clearRntError("expectedReturnDate");
                    }}
                  />
                </div>
                <FieldError message={rntErrors.expectedReturnDate} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Daily Rate <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={dailyRate}
                  onChange={(e) => {
                    setDailyRate(e.target.value);
                    clearRntError("dailyRate");
                  }}
                  className={
                    rntErrors.dailyRate ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={rntErrors.dailyRate} />
              </div>
              <div className="space-y-1.5">
                <Label>Security Deposit Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  clearRntAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Dispatch Rental Booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
