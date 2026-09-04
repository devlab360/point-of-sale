import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PersistStore } from "@/lib/session-store";
import { useLanguage } from "@/contexts/LanguageContext";
import { exportToCSV } from "@/lib/csv";
import { appName } from "@/lib/env";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Eye, Printer, Plus, Search, Receipt, Ban, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalesFn } from "@/api/sales";
import { voidPosSaleFn } from "@/api/pos";
import { getLocationsFn } from "@/api/locations";
import { hasPermissionForRoute } from "@/lib/menu-config";
import { getSettingsFn } from "@/api/settings";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { printReceiptIframe } from "@/lib/printIframe";
import { useDebounce } from "@/hooks/useDebounce";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Download,
  Filter,
  RotateCcw,
  DollarSign,
  TrendingDown,
  Clock,
  CheckCircle2,
  Package,
  X,
  CreditCard,
  ShoppingBag,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDER_STATUSES, PAYMENT_METHOD_OPTIONS } from "@/constants";

export const Route = createFileRoute("/sales/")({
  head: () => ({ meta: [{ title: `Sales · ${appName}` }] }),
  loader: async ({ context: { queryClient } }) => {
    const orgId = PersistStore.getOrgId();
    if (!orgId) return;

    queryClient.ensureQueryData({
      queryKey: ["sales", orgId, 1, 10, "", "", "", ""],
      queryFn: async () => await getSalesFn({ data: { page: 1, pageSize: 10 } }),
    });

    queryClient.ensureQueryData({
      queryKey: ["settings", orgId],
      queryFn: async () => ((await getSettingsFn()) as any)?.data,
    });
  },
  component: SalesPage,
});

function SalesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDateTime } = usePreferences();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { user, saasPlan } = useAuth();
  const orgId = user?.orgId || "default";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ status: "", payment: "", sync: "", location: "" });
  const [draftFilters, setDraftFilters] = useState({
    status: "",
    payment: "",
    sync: "",
    location: "",
  });
  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.payment ? 1 : 0) +
    (filters.sync ? 1 : 0) +
    (filters.location ? 1 : 0);

  const { data: locationsRes } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: async () => {
      const res = await getLocationsFn({ data: {} });
      return (res as any)?.data || [];
    },
  });
  const locations: any[] = locationsRes || [];

  const queryClient = useQueryClient();
  const canVoid = hasPermissionForRoute(
    user,
    "/sales",
    user?.role === "super_admin",
    saasPlan,
  ).allowed;
  const [voidTarget, setVoidTarget] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const voidMutation = useMutation({
    mutationFn: (data: { saleId: string; reason: string }) => voidPosSaleFn({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Bill voided and stock restored.");
        queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
        setVoidTarget(null);
        setVoidReason("");
      } else {
        toast.error(res?.error || "Failed to void bill");
      }
    },
    onError: () => toast.error(t("failedToVoidBill", "Failed to void bill")),
  });

  const {
    data: salesResponse,
    isLoading: isSalesLoading,
    isError: isSalesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: [
      "sales",
      orgId,
      page,
      pageSize,
      debouncedQuery,
      filters.status,
      filters.payment,
      filters.sync,
      filters.location,
    ],
    queryFn: async () =>
      ((await getSalesFn({
        data: {
          page,
          pageSize,
          query: debouncedQuery,
          status: filters.status,
          payment: filters.payment,
          sync: filters.sync,
          locationId: filters.location || undefined,
        },
      })) as any) || {},
  });

  const sales = salesResponse?.data || [];
  const totalCount = salesResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data,
  });
  const settings = settingsData || null;

  const { data: salesSummaryResponse } = useQuery({
    queryKey: [
      "salesSummary",
      orgId,
      debouncedQuery,
      filters.status,
      filters.payment,
      filters.sync,
    ],
    queryFn: async () =>
      ((await getSalesFn({
        data: {
          page: 1,
          pageSize: 1000,
          query: debouncedQuery,
          status: filters.status,
          payment: filters.payment,
          sync: filters.sync,
        },
      })) as any) || {},
  });
  const allSales = salesSummaryResponse?.data || [];

  const totalRevenue = allSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const pendingCount = allSales.filter((s) => s.status === "pending").length;
  const refundedAmount = allSales
    .filter((s) => s.status === "refunded")
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const completedCount = allSales.filter((s) => s.status === "completed").length;

  // States moved up

  const handleResetFilters = () => {
    setFilters({ status: "", payment: "", sync: "", location: "" });
    setDraftFilters({ status: "", payment: "", sync: "", location: "" });
  };
  const [viewSale, setViewSale] = useState<any | null>(null);

  const storeName = settings?.storeName || "";
  const storeAddress = settings?.address || "";
  const storePhone = settings?.phone || "";

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters]);

  const handleExport = () => {
    exportToCSV(
      sales,
      [
        { key: "id", label: "Invoice No" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total" },
        { key: "status", label: "Status" },
      ],
      "sales",
    );
  };

  const summaries = useMemo(() => {
    let cash = 0,
      card = 0,
      upi = 0,
      credit = 0;
    sales.forEach((s: any) => {
      if (
        !s ||
        s.status === "refunded" ||
        s.status === "quotation" ||
        s.status === "void" ||
        s.status === "cancelled" ||
        s.status === "draft"
      )
        return; // Ignore refunded, quotes, voided and cancelled in total collected

      if (Array.isArray(s.payments) && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          const amt = Number(p.amount) || 0;
          if (p.method === "cash") cash += amt;
          else if (p.method === "card") card += amt;
          else if (
            p.method === "upi" ||
            p.method === "online" ||
            p.method === "mobile" ||
            p.method === "wallet"
          )
            upi += amt;
          else if (p.method === "credit") credit += amt;
        });
      } else {
        const tot = Number(s.total) || 0;
        if (s.paymentMethod === "cash") cash += tot;
        else if (s.paymentMethod === "card") card += tot;
        else if (s.paymentMethod === "credit") credit += tot;
        else if (
          s.paymentMethod === "upi" ||
          s.paymentMethod === "wallet" ||
          s.paymentMethod === "mobile"
        )
          upi += tot;
      }
    });
    return { cash, card, upi, credit, total: cash + card + upi + credit };
  }, [sales]);

  const printReceipt = (s: any) => {
    setViewSale(s);
    setTimeout(() => {
      printReceiptIframe(".pos-sales-print-receipt");
    }, 150);
  };
  const handlePrintDirect = printReceipt;

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("salesTransactionsTitle", "Sales & POS Transactions")}
        description={t("manageSales", "Every customer order, split tender receipt, and register settlement across all stores.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-4" /> {t("exportCSV", "Export CSV")}
            </Button>
            <Button size="sm" onClick={() => void navigate({ to: "/pos" })} className="gap-1.5">
              <Plus className="size-4" /> {t("newSale", "New Sale")}
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalTransactions", "Total Transactions")}
          value={String(totalCount)}
          hint={`${completedCount} ${t("completed", "Completed")}`}
          icon={Receipt}
          accent="primary"
        />
        <StatCard
          label={t("totalRevenue", "Total Revenue")}
          value={formatCurrency(totalRevenue)}
          hint={`${formatCurrency(refundedAmount)} ${t("refunded", "Refunded")}`}
          icon={DollarSign}
          accent="success"
        />
        <StatCard
          label={t("pendingOrders", "Pending Orders")}
          value={String(pendingCount)}
          hint={t("awaitingSettlement", "Awaiting register payment")}
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label={t("refundedAmount", "Refunded Amount")}
          value={formatCurrency(refundedAmount)}
          hint={t("processedReturns", "Total returns & voided receipts")}
          icon={TrendingDown}
          accent="destructive"
        />
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchSales", "Search by invoice # or customer...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs">
                <RotateCcw className="size-3.5" /> {t("reset", "Reset")}
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs relative">
                  <Filter className="size-3.5" />
                  <span>{t("filters", "Filters")}</span>
                  {activeFilterCount > 0 && (
                    <span className="size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
                <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
                  <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Filter className="size-4.5 text-primary" />
                    <span>{t("filterTransactions", "Filter Transactions")}</span>
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    {t("filterSalesDesc", "Filter by status, payment method, branch, or sync status.")}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("status", "Status")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allStatuses", "All Statuses") },
                        ...ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                      ]}
                      value={draftFilters.status}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                      placeholder={t("filterByStatus", "Filter by Status")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("paymentMethod", "Payment Method")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allMethods", "All Methods") },
                        ...PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m.value, label: m.label })),
                      ]}
                      value={draftFilters.payment}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, payment: val }))}
                      placeholder={t("filterByPayment", "Filter by Payment")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("syncStatus", "Sync Status")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allSyncStatus", "All Sync Status") },
                        { value: "synced", label: t("synced", "Synced") },
                        { value: "pending", label: t("pendingSync", "Pending Sync") },
                      ]}
                      value={draftFilters.sync}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, sync: val }))}
                      placeholder={t("filterBySync", "Filter by Sync")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("storeBranch", "Store Branch")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allBranches", "All Branches") },
                        ...locations.map((loc: any) => ({ value: loc.id, label: loc.name })),
                      ]}
                      value={draftFilters.location}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, location: val }))}
                      placeholder={t("filterByBranch", "Filter by Branch")}
                    />
                  </div>
                </div>
                <SheetFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleResetFilters();
                    }}
                  >
                    {t("reset", "Reset")}
                  </Button>
                  <Button
                    className="flex-1 font-bold"
                    onClick={() => {
                      setFilters(draftFilters);
                    }}
                  >
                    {t("applyFilters", "Apply Filters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content View */}
        {isSalesLoading ? (
          <TableSkeleton columns={8} rows={6} />
        ) : isSalesError ? (
          <ErrorState onRetry={refetchSales} />
        ) : (
          <div className="space-y-4">
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("cashRevenue", "Cash Revenue")}
                </span>
                <span className="text-lg font-black text-success">
                  {formatCurrency(summaries.cash)}
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("cardRevenue", "Card Revenue")}
                </span>
                <span className="text-lg font-black text-info">
                  {formatCurrency(summaries.card)}
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("upiDigital", "UPI / Digital")}
                </span>
                <span className="text-lg font-black text-primary">
                  {formatCurrency(summaries.upi)}
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("creditDue", "Credit (Due)")}
                </span>
                <span className="text-lg font-black text-warning">
                  {formatCurrency(summaries.credit)}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[850px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invoice", "Invoice")}</TableHead>
                      <TableHead>{t("customer", "Customer")}</TableHead>
                      <TableHead>{t("date", "Timestamp")}</TableHead>
                      <TableHead className="text-right">{t("items", "Items")}</TableHead>
                      <TableHead>{t("payment", "Payment")}</TableHead>
                      <TableHead>{t("sync", "Sync")}</TableHead>
                      <TableHead>{t("status", "Status")}</TableHead>
                      <TableHead className="text-right">{t("total", "Total")}</TableHead>
                      <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-64 text-center">
                          <EmptyState
                            icon={Receipt}
                            title={t("noSalesFound", "No sales found")}
                            description={
                              debouncedQuery
                                ? t("adjustSearch", "Try adjusting your search query.")
                                : t("noSalesYet", "No transactions have been recorded yet.")
                            }
                            actionLabel="Open POS"
                            onAction={() => void navigate({ to: "/pos" })}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell
                            className="font-mono text-xs font-semibold text-primary cursor-pointer hover:underline"
                            onClick={() => setViewSale(s)}
                          >
                            #{s.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {s.customerName || "Walk-in Customer"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {formatDateTime(s.date)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                            {s.items}
                          </TableCell>
                          <TableCell className="text-muted-foreground capitalize">
                            {s.paymentMethod === "split" && s.payments && s.payments.length > 0 ? (
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <span className="font-bold text-primary">SPLIT</span>
                                {s.payments.map((p, i) => (
                                  <span key={i} className="font-semibold text-foreground">
                                    {p.method.toUpperCase()}: {formatCurrency(p.amount)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-bold text-[10px] uppercase bg-muted/40"
                              >
                                {s.paymentMethod || "cash"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold",
                                s.synced
                                  ? "bg-success/10 text-success border-success/25"
                                  : "bg-warning/10 text-warning border-warning/25",
                              )}
                            >
                              {s.synced ? "Synced" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] font-bold",
                                s.status === "completed" &&
                                  "bg-success/12 text-success hover:bg-success/20 border-success/20",
                                s.status === "pending" &&
                                  "bg-warning/15 text-warning-foreground hover:bg-warning/20 border-warning/20",
                                s.status === "refunded" && "bg-muted text-muted-foreground",
                              )}
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="number text-right font-black text-foreground">
                            {formatCurrency(s.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => setViewSale(s)}
                                title={t("viewReceipt", "View Receipt")}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary"
                                onClick={() => handlePrintDirect(s)}
                                title={t("quickThermalPrint", "Quick Thermal Print")}
                              >
                                <Printer className="size-4" />
                              </Button>
                              {canVoid && s.status !== "voided" && !s.metadata?.voided && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setVoidTarget(s);
                                    setVoidReason("");
                                  }}
                                  title={t("voidThisBill", "Void this bill")}
                                >
                                  <Ban className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {sales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => setViewSale(s)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #{s.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(s.date)}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                        {s.customerName || "Walk-in Customer"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0">
                          {s.paymentMethod === "split" ? t("split", "SPLIT") : (s.paymentMethod || "cash")}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-[9px] font-bold py-0",
                            s.status === "completed"
                              ? "bg-success/12 text-success"
                              : "bg-warning/15 text-warning-foreground",
                          )}
                        >
                          {s.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">
                        {formatCurrency(s.total)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-semibold text-muted-foreground mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          printReceipt(s);
                        }}
                      >
                        <Printer className="size-3 mr-1" /> {t("print", "Print")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {sales.length > 0 && (
                <div className="border-t border-border/60 p-2 sm:p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      {/* Sale Detail Sheet */}
      <Sheet open={!!viewSale} onOpenChange={(open) => !open && setViewSale(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Invoice #{viewSale?.id.slice(0, 8).toUpperCase()}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("saleDetailsLineItemsAndTotals", "Sale details, line items, and totals.")}
              </SheetDescription>
            </SheetHeader>
            {viewSale && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("customer", "Customer")}:</span>{" "}
                      <strong>{viewSale.customerName || "Walk-in"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("date", "Date")}:</span>{" "}
                      {formatDateTime(viewSale.date)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("payment", "Payment")}:</span>{" "}
                      <strong className="capitalize">{viewSale.paymentMethod}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("status", "Status")}:</span>{" "}
                      <Badge
                        variant="outline"
                        className={cn(
                          viewSale.status === "completed" &&
                            "bg-success/10 text-success hover:bg-success/20 border-success/20",
                          viewSale.status === "pending" &&
                            "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
                          viewSale.status === "cancelled" &&
                            "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
                        )}
                      >
                        {viewSale.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table className="min-w-[400px]">
                      <TableHeader className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <TableRow>
                          <TableHead className="px-3 py-2 whitespace-nowrap text-left">
                            {t("sales.item", "Item")}
                          </TableHead>
                          <TableHead className="px-3 py-2 whitespace-nowrap text-right">
                            {t("common.qty", "Qty")}
                          </TableHead>
                          <TableHead className="px-3 py-2 whitespace-nowrap text-right">
                            {t("common.price", "Price")}
                          </TableHead>
                          <TableHead className="px-3 py-2 whitespace-nowrap text-right">
                            {t("common.total", "Total")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {viewSale.saleItems?.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="px-3 py-2 whitespace-nowrap">
                              {item.productName}
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap text-right">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap text-right font-semibold">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                    {viewSale.subtotal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("subtotal", "Subtotal")}</span>
                        <span>{formatCurrency(viewSale.subtotal)}</span>
                      </div>
                    )}
                    {viewSale.discountAmt !== undefined && viewSale.discountAmt > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>{t("discount", "Discount")}</span>
                        <span>-{formatCurrency(viewSale.discountAmt)}</span>
                      </div>
                    )}
                    {viewSale.taxAmt !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("tax", "Tax")}</span>
                        <span>{formatCurrency(viewSale.taxAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-1 font-bold">
                      <span>{t("total", "Total")}</span>
                      <span>{formatCurrency(viewSale.total)}</span>
                    </div>
                    {viewSale.paymentMethod === "cash" && viewSale.cashTendered && (
                      <div className="flex justify-between text-muted-foreground mt-1 pt-1 border-t border-border">
                        <span>{t("cashTendered", "Cash Tendered")}</span>
                        <span>{formatCurrency(parseFloat(viewSale.cashTendered))}</span>
                      </div>
                    )}
                    {viewSale.paymentMethod === "cash" && viewSale.changeDue != null && (
                      <div className="flex justify-between font-semibold text-success">
                        <span>{t("changeDue", "Change Due")}</span>
                        <span>{formatCurrency(parseFloat(viewSale.changeDue))}</span>
                      </div>
                    )}
                  </div>
                </div>
                <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      className="w-full font-bold"
                      onClick={() => {
                        setViewSale(null);
                        printReceipt(viewSale);
                      }}
                    >
                      <Printer className="size-4 mr-1.5" /> {t("reprintReceipt", "Reprint Receipt")}
                    </Button>
                    {canVoid && viewSale.status !== "voided" && !viewSale.metadata?.voided && (
                      <Button
                        variant="destructive"
                        className="w-full font-bold"
                        onClick={() => {
                          setVoidTarget(viewSale);
                          setVoidReason("");
                          setViewSale(null);
                        }}
                      >
                        <Ban className="size-4 mr-1.5" /> {t("voidBill", "Void Bill")}
                      </Button>
                    )}
                  </div>
                </SheetFooter>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Print receipt */}
      {viewSale && (
        <div className="pos-sales-print-receipt hidden print:block fixed inset-0 z-[200] bg-white text-black text-[12px] font-mono leading-tight p-4">
          <div className="max-w-[300px] mx-auto">
            {(() => {
              const saleBranch = locations.find((l: any) => l.id === viewSale.locationId);
              const branchName = saleBranch?.name || storeName;
              const branchAddress = saleBranch?.address || storeAddress;
              const branchPhone = saleBranch?.phone || storePhone;
              return (
                <div className="text-center mb-3">
                  <h1 className="text-xl font-bold">{branchName}</h1>
                  {branchAddress && <p>{branchAddress}</p>}
                  {branchPhone && <p>Tel: {branchPhone}</p>}
                </div>
              );
            })()}
            <div className="border-t border-black pt-2 mb-2 text-[11px]">
              <div className="flex justify-between">
                <span>{t("receiptNumber", "Receipt #")}:</span>
                <span>{viewSale.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("date", "Date")}:</span>
                <span>{formatDateTime(viewSale.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("customer", "Customer")}:</span>
                <span>{viewSale.customerName || "Walk-in"}</span>
              </div>
            </div>
            <div className="border-t border-b border-black py-2 mb-2">
              {viewSale.saleItems?.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate max-w-[160px]">
                    {item.productName} x{item.quantity}
                  </span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold">
              <span>{t("totalUpper", "TOTAL")}:</span>
              <span>{formatCurrency(viewSale.total)}</span>
            </div>
            {viewSale.paymentMethod === "cash" && viewSale.cashTendered && (
              <div className="flex justify-between mt-1 pt-1 border-t border-black">
                <span>{t("cashTendered", "Cash Tendered")}:</span>
                <span>{formatCurrency(parseFloat(viewSale.cashTendered))}</span>
              </div>
            )}
            {viewSale.paymentMethod === "cash" && viewSale.changeDue != null && (
              <div className="flex justify-between font-bold">
                <span>{t("changeDue", "Change Due")}:</span>
                <span>{formatCurrency(parseFloat(viewSale.changeDue))}</span>
              </div>
            )}
            <p className="mt-3 text-center text-[10px]">{t("thankYouForBusiness", "Thank you for your business!")}</p>
          </div>
        </div>
      )}

      {/* Void Completed Bill Confirmation */}
      <Dialog
        open={!!voidTarget}
        onOpenChange={(o) => {
          if (!o && !voidMutation.isPending) setVoidTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Ban className="size-5 text-destructive" /> {t("voidThisBill", "Void This Bill?")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will mark bill{" "}
              <span className="font-mono font-bold text-foreground">
                #{voidTarget?.id.slice(0, 8).toUpperCase()}
              </span>{" "}
              for {voidTarget?.customerName} ({formatCurrency(voidTarget?.total)}) as voided and
              restore the stock. This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("reasonRequired", "Reason (required)")}</Label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t("voidReasonPlaceholder", "e.g. Wrong items, customer returned")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setVoidTarget(null)}
              disabled={voidMutation.isPending}
              className="rounded-xl h-10 px-4 text-xs font-semibold"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={voidMutation.isPending || !voidReason.trim()}
              onClick={() =>
                voidMutation.mutate({ saleId: voidTarget.id, reason: voidReason.trim() })
              }
              className="rounded-xl h-10 px-4 text-xs font-bold"
            >
              {voidMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Void Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
