import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  DollarSign,
  ShieldCheck,
  Package,
  Download,
  Search,
  Filter,
  X,
} from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { RENTAL_STATUSES } from "@/constants";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/rentals")({
  head: () => ({ meta: [{ title: `Equipment Rentals & Booking · ${appName}` }] }),
  component: RentalsPage,
});

function RentalsPage() {
  const { t } = useLanguage();
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
    queryFn: async () => ((await getCustomersFn({ data: { page: 1, pageSize: 500 } })) as any)?.data || [],
  });
  const customers = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.status ? 1 : 0;

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [rentStartDate, setRentStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const {
    errors: rntErrors,
    validate: validateRnt,
    clearError: clearRntError,
    clearAll: clearRntAll,
  } = useFormValidation({
    customerName: { required: t("customerNameRequired", "Customer name is required") },
    itemName: { required: t("equipmentNameRequired", "Equipment / Item name is required") },
    rentStartDate: { required: t("startDateRequired", "Start date is required") },
    expectedReturnDate: { required: t("returnDateRequired", "Return date is required") },
    dailyRate: {
      required: t("dailyRateRequired", "Daily rate is required"),
      positive: t("ratePositive", "Rate must be positive"),
    },
  });

  const filteredRentals = useMemo(() => {
    let list = [...rawRentals];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (r: any) =>
          r.rentalNo?.toLowerCase().includes(q) ||
          r.customerName?.toLowerCase().includes(q) ||
          r.itemName?.toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      list = list.filter((r: any) => r.status === filters.status);
    }
    return list;
  }, [rawRentals, debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / pageSize));
  const paginatedRentals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRentals.slice(start, start + pageSize);
  }, [filteredRentals, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const metrics = useMemo(() => {
    const totalCount = rawRentals.length;
    const activeCount = rawRentals.filter((r: any) => r.status === "active").length;
    const totalDailyRevenue = rawRentals
      .filter((r: any) => r.status === "active")
      .reduce((sum: number, r: any) => sum + (parseFloat(r.dailyRate) || 0), 0);
    const totalDeposits = rawRentals
      .filter((r: any) => r.status === "active")
      .reduce((sum: number, r: any) => sum + (parseFloat(r.securityDeposit) || 0), 0);
    return { totalCount, activeCount, totalDailyRevenue, totalDeposits };
  }, [rawRentals]);

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateRnt({
      customerName,
      itemName,
      rentStartDate,
      expectedReturnDate,
      dailyRate,
    });
    if (!isValid) {
      const firstError = Object.values(rntErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRentalFn({
        data: {
          rental: {
            rentalNo: `RNT-${Math.floor(10000 + Math.random() * 90000)}`,
            customerName,
            itemName,
            rentStartDate,
            expectedReturnDate,
            dailyRate: parseFloat(dailyRate).toFixed(2),
            securityDeposit: parseFloat(securityDeposit || "0").toFixed(2),
            status: "active",
          },
        },
      });

      if (res?.success) {
        toast.success("Equipment rental dispatched successfully");
        queryClient.invalidateQueries({ queryKey: ["rentals"] });
        setIsAddOpen(false);
        setCustomerName("");
        setItemName("");
        setDailyRate("");
        setSecurityDeposit("");
        setExpectedReturnDate("");
        clearRntAll();
      } else {
        toast.error(res?.error || "Failed to create rental");
      }
    } catch {
      toast.error("Failed to create rental");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markReturned = async (id: string) => {
    try {
      const res = await updateRentalStatusFn({
        data: {
          id,
          status: "returned",
        },
      });
      if (res?.success) {
        toast.success("Rental marked as returned and deposit refunded/released");
        queryClient.invalidateQueries({ queryKey: ["rentals"] });
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteRentalFn({ data: { id: deleteId } });
        toast.success("Rental record removed");
        queryClient.invalidateQueries({ queryKey: ["rentals"] });
        setDeleteId(null);
      } catch {
        toast.error("Failed to delete rental");
      }
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawRentals.map((r: any) => ({
        "Rental No": r.rentalNo,
        Customer: r.customerName,
        Item: r.itemName,
        "Start Date": r.rentStartDate,
        "Return Date": r.expectedReturnDate,
        "Daily Rate": r.dailyRate,
        Deposit: r.securityDeposit,
        Status: r.status,
      })),
      [
        { key: "Rental No", label: t("rentalNo", "Rental No") },
        { key: "Customer", label: t("customer", "Customer") },
        { key: "Item", label: t("rentedEquipment", "Rented Equipment") },
        { key: "Start Date", label: t("startDate", "Start Date") },
        { key: "Return Date", label: t("expectedReturn", "Expected Return") },
        { key: "Daily Rate", label: t("dailyRate", "Daily Rate") },
        { key: "Deposit", label: t("securityDeposit", "Security Deposit") },
        { key: "Status", label: t("status", "Status") },
      ],
      "rentals-export",
    );
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("rentalsBookings", "Equipment Rentals & Bookings")}
        description={t("rentalsDesc", "Track rental equipment, security deposits, daily rental rates, and overdue returns.")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="hidden sm:flex"
            >
              <Download className="size-4 mr-1.5" />
              {t("exportCSV", "Export CSV")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearRntAll();
                setIsAddOpen(true);
              }}
              className="shadow-soft"
            >
              <Plus className="size-4 mr-1.5" />
              {t("newRental", "New Rental")}
            </Button>
          </>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalBookings", "Total Bookings")}
          value={metrics.totalCount}
          icon={KeyRound}
          accent="primary"
        />
        <StatCard
          label={t("activeRentals", "Active Rentals")}
          value={metrics.activeCount}
          icon={Package}
          accent="success"
        />
        <StatCard
          label={t("dailyRentalRevenue", "Daily Rental Revenue")}
          value={`${formatCurrency(metrics.totalDailyRevenue)}/${t("day", "day")}`}
          icon={DollarSign}
          accent="info"
        />
        <StatCard
          label={t("depositsHeld", "Deposits Held")}
          value={formatCurrency(metrics.totalDeposits)}
          icon={ShieldCheck}
          accent="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchRentalsPlaceholder", "Search by rental #, customer, or equipment...")}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5 mr-1" />
              {t("clearFilters", "Clear")}
            </Button>
          )}

          <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 relative">
                <Filter className="size-3.5 mr-1.5" />
                {t("filters", "Filters")}
                {activeFilterCount > 0 && (
                  <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
              <SheetHeader className="p-5 border-b pr-12 text-left shrink-0">
                <SheetTitle className="text-lg font-bold">{t("filterRentals", "Filter Rentals")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("status", "Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allRentals", "All Rentals") },
                      ...RENTAL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                    ]}
                    value={draftFilters.status}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                    placeholder={t("filterByStatus", "Filter by Status")}
                  />
                </div>
              </div>
              <div className="border-t p-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 font-bold text-xs"
                  onClick={handleResetFilters}
                >
                  {t("reset", "Reset")}
                </Button>
                <Button
                  className="flex-1 font-bold text-xs"
                  onClick={() => {
                    setFilters(draftFilters);
                    setFilterDrawerOpen(false);
                  }}
                >
                  {t("applyFilters", "Apply Filters")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Table / Mobile Feed */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
        {isLoading ? (
          <TableSkeleton columns={8} rows={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("rentalHash", "Rental #")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("customer", "Customer")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("rentedEquipment", "Rented Equipment")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("startReturn", "Start & Return")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("rateDay", "Rate / Day")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("deposit", "Deposit")}
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
                  {paginatedRentals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <EmptyState
                          icon={KeyRound}
                          title={t("noRentalsFound", "No rentals found")}
                          description={
                            search
                              ? t("noRentalsMatchQuery", "No rentals matched your search query.")
                              : t("noRentalsYet", "You haven't dispatched any equipment rentals yet.")
                          }
                          actionLabel={t("newRental", "New Rental")}
                          onAction={() => setIsAddOpen(true)}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRentals.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
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
                                <CheckCircle2 className="size-3.5 mr-1" /> {t("markReturned", "Mark Returned")}
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
            <div className="table-mobile-cards p-3 space-y-2.5">
              {paginatedRentals.length === 0 ? (
                <EmptyState
                  icon={KeyRound}
                  title={t("noRentalsFound", "No rentals found")}
                  description={t("noRentalsYet", "You haven't dispatched any equipment rentals yet.")}
                  actionLabel={t("newRental", "New Rental")}
                  onAction={() => setIsAddOpen(true)}
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                paginatedRentals.map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border/80 bg-card p-3.5 shadow-soft space-y-3"
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
                          {t("dailyRate", "Daily Rate")}
                        </span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(Number(r.dailyRate) || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          {t("depositsHeld", "Deposit Held")}
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
                          {t("markReturned", "Mark Returned")}
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
              <div className="border-t border-border/60 p-3">
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

      {/* Dispatch Rental Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <KeyRound className="size-5 text-primary" />
              <span>{t("dispatchRentalBooking", "Dispatch Rental Booking")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("dispatchRentalDesc", "Issue tools, event hardware, media equipment, or vehicles with security deposits.")}
            </p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateRental}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>{t("customerClientName", "Customer / Client Name")} *</Label>
                <SearchableSelect
                  options={customers.map((c: any) => ({
                    value: c.name,
                    label: c.name,
                    sublabel: c.phone || "",
                  }))}
                  value={customerName}
                  onChange={(val) => {
                    setCustomerName(val);
                    clearRntError("customerName");
                  }}
                  placeholder={t("selectEnterCustomer", "Select or enter customer name...")}
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
                <Label>{t("rentedEquipmentItem", "Rented Equipment / Item")} *</Label>
                <Input
                  placeholder={t("equipmentPlaceholder", "e.g. Sony FX3 4K Cine Camera, Concrete Mixer, DJ PA System")}
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
                  <Label>{t("rentStartDate", "Rent Start Date")} *</Label>
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
                  <Label>{t("expectedReturnDate", "Expected Return Date")} *</Label>
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
                  <Label>{t("dailyRate", "Daily Rate")} ({currencySymbol}) *</Label>
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
                  <Label>{t("securityDeposit", "Security Deposit")} ({currencySymbol})</Label>
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
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("dispatchBooking", "Dispatch Booking")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRentalTitle", "Delete Rental Record?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteRentalDesc", "This action cannot be undone. This will permanently remove the equipment rental entry.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
