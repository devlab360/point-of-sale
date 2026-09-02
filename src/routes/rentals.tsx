import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { appName } from "@/lib/env";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRentalsFn, createRentalFn, updateRentalStatusFn, deleteRentalFn } from "@/api/rentals";
import { getCustomersFn, createCustomerFn } from "@/api/customers";
import { useCurrency } from "@/lib/currency";
import {
  KeyRound,
  Plus,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Loader2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Package,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { RENTAL_STATUSES } from "@/constants";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/rentals")({
  head: () => ({ meta: [{ title: `Equipment Rentals & Booking · ${appName}` }] }),
  component: RentalsPage,
});

function RentalsPage() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const { formatAppDate } = useAppFormatter();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rentalsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["rentals", orgId],
    queryFn: async () => ((await getRentalsFn({ data: {} })) as any)?.data || [],
  });
  const rawRentals = rentalsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [rentStartDate, setRentStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [dailyRate, setDailyRate] = useState("25.00");
  const [securityDeposit, setSecurityDeposit] = useState("100.00");

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
        (r: any) =>
          r.rentalNo?.toLowerCase().includes(lower) ||
          r.customerName?.toLowerCase().includes(lower) ||
          r.itemName?.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((r: any) => r.status === filters.status);
    }
    return filtered;
  }, [rawRentals, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(filteredRentals.length / pageSize);
  const paginatedRentals = filteredRentals.slice((page - 1) * pageSize, page * pageSize);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = rawRentals.length;
    const activeCount = rawRentals.filter((r: any) => r.status === "active").length;
    const totalDeposits = rawRentals
      .filter((r: any) => r.status === "active")
      .reduce((sum: number, r: any) => sum + (Number(r.securityDeposit) || 0), 0);
    const totalDailyRevenue = rawRentals
      .filter((r: any) => r.status === "active")
      .reduce((sum: number, r: any) => sum + (Number(r.dailyRate) || 0), 0);
    return { totalCount, activeCount, totalDeposits, totalDailyRevenue };
  }, [rawRentals]);

  const {
    errors: rntErrors,
    validate: validateRnt,
    clearError: clearRntError,
    clearAll: clearRntAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    itemName: { required: "Rented item / equipment name is required" },
    dailyRate: { required: "Daily rate is required", positive: "Rate must be positive" },
    rentStartDate: { required: "Start date is required" },
    expectedReturnDate: { required: "Return date is required" },
  });

  const handleCreateRental = async (e: React.FormEvent<HTMLFormElement>) => {
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
    try {
      const res = await createRentalFn({
        data: {
          rental: {
            customerName: customerName.trim(),
            itemName: itemName.trim(),
            rentStartDate,
            expectedReturnDate,
            dailyRate: parseFloat(dailyRate),
            securityDeposit: parseFloat(securityDeposit || "0"),
            totalAmount: parseFloat(dailyRate),
            status: "active",
          },
        },
      });

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["rentals"] });
        toast.success("Equipment rental dispatched successfully");
        setIsAddOpen(false);
        setCustomerName("");
        setItemName("");
        clearRntAll();
      } else {
        toast.error("Failed to create rental");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating rental");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markReturned = async (id: string) => {
    try {
      await updateRentalStatusFn({ data: { id, status: "returned" } });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Equipment marked as returned");
    } catch {
      toast.error("Failed to update rental status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRentalFn({ data: { id: deleteId } });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Rental record deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete rental");
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawRentals.map((r: any) => ({
        "Rental No": r.rentalNo,
        Customer: r.customerName,
        Item: r.itemName,
        "Start Date": r.rentStartDate ? formatAppDate(r.rentStartDate) : "-",
        "Return Date": r.expectedReturnDate ? formatAppDate(r.expectedReturnDate) : "-",
        "Daily Rate": r.dailyRate,
        Deposit: r.securityDeposit,
        Status: r.status,
      })),
      [
        { key: "Rental No", label: "Rental No" },
        { key: "Customer", label: "Customer" },
        { key: "Item", label: "Rented Equipment" },
        { key: "Start Date", label: "Start Date" },
        { key: "Return Date", label: "Expected Return" },
        { key: "Daily Rate", label: "Daily Rate" },
        { key: "Deposit", label: "Security Deposit" },
        { key: "Status", label: "Status" },
      ],
      "rentals-export",
    );
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Equipment Rentals & Bookings"
        description="Track rental equipment, security deposits, daily rental rates, and overdue returns."
        primaryAction={{
          label: "New Rental",
          onClick: () => {
            clearRntAll();
            setIsAddOpen(true);
          },
        }}
        searchPlaceholder="Search by rental #, customer, or equipment..."
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
                  Status
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Rentals" },
                    ...RENTAL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
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
                Apply Filters
              </Button>
            </div>
          </div>
        )}
        topContent={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Bookings
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">
                {metrics.totalCount}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-emerald-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Rentals
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Package className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {metrics.activeCount}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-blue-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Daily Rental Revenue
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {formatCurrency(metrics.totalDailyRevenue)}/day
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-amber-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Deposits Held
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(metrics.totalDeposits)}
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Table Container */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {isLoading ? (
              <TableSkeleton columns={7} rows={5} />
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
                          Rental #
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Customer
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Rented Equipment
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Start & Return
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Rate / Day
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Deposit
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {paginatedRentals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-64 text-center">
                            <EmptyState
                              icon={KeyRound}
                              title="No rentals found"
                              description={
                                search
                                  ? "No rentals matched your search query."
                                  : "You haven't dispatched any equipment rentals yet."
                              }
                              actionLabel="New Rental"
                              onAction={() => setIsAddOpen(true)}
                              className="border-none bg-transparent my-0 py-8 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRentals.map((r: any) => (
                          <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-mono font-bold text-xs text-foreground whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                                  <KeyRound className="size-4" />
                                </div>
                                <span>{r.rentalNo}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground whitespace-nowrap">
                              {r.customerName}
                            </TableCell>
                            <TableCell className="font-medium text-foreground whitespace-nowrap">
                              {r.itemName}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                              <div>
                                <span>
                                  {r.rentStartDate ? formatAppDate(r.rentStartDate) : "-"}
                                </span>
                                <span className="mx-1 text-muted-foreground/60">→</span>
                                <span className="font-semibold text-foreground">
                                  {r.expectedReturnDate ? formatAppDate(r.expectedReturnDate) : "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-black text-foreground whitespace-nowrap">
                              {formatCurrency(Number(r.dailyRate) || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {formatCurrency(Number(r.securityDeposit) || 0)}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  r.status === "returned"
                                    ? "bg-muted text-muted-foreground border-border/60"
                                    : r.status === "overdue"
                                      ? "bg-destructive/15 text-destructive border-destructive/25"
                                      : "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {r.status !== "returned" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                    onClick={() => markReturned(r.id)}
                                  >
                                    <CheckCircle2 className="size-3.5 mr-1" /> Mark Returned
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
                                      onClick={() => setDeleteId(r.id)}
                                      className="text-xs font-semibold text-destructive cursor-pointer"
                                    >
                                      <Trash2 className="mr-2 size-3.5" /> Delete
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
                  {paginatedRentals.length === 0 ? (
                    <EmptyState
                      icon={KeyRound}
                      title="No rentals found"
                      description="You haven't dispatched any equipment rentals yet."
                      actionLabel="New Rental"
                      onAction={() => setIsAddOpen(true)}
                      className="border-none bg-transparent my-0 py-6 shadow-none"
                    />
                  ) : (
                    paginatedRentals.map((r: any) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-xs font-bold text-muted-foreground">
                              {r.rentalNo}
                            </p>
                            <p className="font-bold text-sm text-foreground">{r.customerName}</p>
                            <p className="text-xs text-primary font-semibold">{r.itemName}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              r.status === "returned"
                                ? "bg-muted text-muted-foreground border-border/60"
                                : r.status === "overdue"
                                  ? "bg-destructive/15 text-destructive border-destructive/25"
                                  : "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-2 text-muted-foreground">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Daily Rate
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(Number(r.dailyRate) || 0)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Deposit Held
                            </span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(Number(r.securityDeposit) || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                          {r.status !== "returned" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-semibold text-emerald-600 border-emerald-500/30"
                              onClick={() => markReturned(r.id)}
                            >
                              Mark Returned
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredRentals.length > 0 && (
                  <div className="border-t border-border p-3 sm:p-4">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                      totalItems={filteredRentals.length}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DataPage>

      {/* Dispatch Rental Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <KeyRound className="size-5 text-primary" />
              <span>Dispatch Rental Booking</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issue tools, event hardware, media equipment, or vehicles with security deposits.
            </p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateRental}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Customer / Client Name *</Label>
                <SearchableSelect
                  options={customers.map((c) => ({
                    value: c.name,
                    label: c.name,
                    sublabel: c.phone || "",
                  }))}
                  value={customerName}
                  onChange={(val) => {
                    setCustomerName(val);
                    clearRntError("customerName");
                  }}
                  placeholder="Select or enter customer name..."
                  onCreate={async (name) => {
                    const res = await createCustomerFn({ data: { customer: { name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                      return name;
                    }
                  }}
                />
                <FieldError message={rntErrors.customerName} />
              </div>

              <div className="space-y-1.5">
                <Label>Rented Equipment / Item *</Label>
                <Input
                  placeholder="e.g. Sony FX3 4K Cine Camera, Concrete Mixer, DJ PA System"
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
                  <Label>Rent Start Date *</Label>
                  <DatePicker
                    date={rentStartDate}
                    onDateChange={(d) => {
                      setRentStartDate(d ? d.toISOString().split("T")[0] : "");
                      clearRntError("rentStartDate");
                    }}
                  />
                  <FieldError message={rntErrors.rentStartDate} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Return Date *</Label>
                  <DatePicker
                    date={expectedReturnDate}
                    onDateChange={(d) => {
                      setExpectedReturnDate(d ? d.toISOString().split("T")[0] : "");
                      clearRntError("expectedReturnDate");
                    }}
                  />
                  <FieldError message={rntErrors.expectedReturnDate} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Daily Rate ({currencySymbol}) *</Label>
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
                  <Label>Security Deposit ({currencySymbol})</Label>
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
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Dispatch Booking
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rental Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the equipment rental entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
