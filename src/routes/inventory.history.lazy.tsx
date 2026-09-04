import { createLazyFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersistStore } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { getInventoryMovementsFn } from "@/api/inventory";
import { useState, useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  History,
  Search,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ShoppingCart,
  Truck,
  RotateCcw,
} from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export const Route = createLazyFileRoute("/inventory/history")({
  component: HistoryPage,
});

function getActionVisuals(action: string, t: (key: string, fallback: string) => string) {
  const a = (action || "").toLowerCase();
  if (a.includes("sale") || a.includes("pos")) {
    return {
      label: t("posSale", "POS Sale"),
      badge: "bg-destructive/10 text-destructive border-destructive/25",
    };
  }
  if (a.includes("purchase") || a.includes("inward") || a.includes("receive")) {
    return {
      label: t("purchaseInward", "Purchase Inward"),
      badge: "bg-success/15 text-success border-success/30",
    };
  }
  if (a.includes("adjust")) {
    return {
      label: t("adjustment", "Adjustment"),
      badge: "bg-warning/15 text-warning-foreground border-warning/30",
    };
  }
  if (a.includes("transfer")) {
    return {
      label: t("branchTransfer", "Branch Transfer"),
      badge: "bg-info/10 text-info border-info/20",
    };
  }
  return {
    label: action.replace("_", " "),
    badge: "bg-muted text-muted-foreground border-border",
  };
}

function HistoryPage() {
  const { t } = useLanguage();
  const { formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["inventoryMovements", orgId],
    queryFn: async () => ((await getInventoryMovementsFn({ data: {} })) as any)?.data || [],
  });
  const rawMovements = Array.isArray(movementsData) ? movementsData : [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // KPI calculations
  const totalEvents = rawMovements.length;
  const posSalesOut = useMemo(
    () => rawMovements.filter((m: any) => (m.action || "").toLowerCase().includes("sale")).length,
    [rawMovements],
  );
  const inwardPurchases = useMemo(
    () =>
      rawMovements.filter((m: any) => (m.action || "").toLowerCase().includes("purchase")).length,
    [rawMovements],
  );
  const adjustmentsCount = useMemo(
    () => rawMovements.filter((m: any) => (m.action || "").toLowerCase().includes("adjust")).length,
    [rawMovements],
  );

  const filtered = useMemo(() => {
    let list = rawMovements;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (m: any) =>
          m.productName?.toLowerCase().includes(lower) ||
          m.action?.toLowerCase().includes(lower) ||
          m.notes?.toLowerCase().includes(lower),
      );
    }
    if (actionFilter !== "all") {
      list = list.filter((m: any) => (m.action || "").toLowerCase().includes(actionFilter));
    }
    return [...list].reverse();
  }, [rawMovements, debouncedSearch, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("stockMovementLedgerTitle", "Stock Movement Ledger")}
        description={t("stockMovementLedgerDesc", "Immutable audit trail of all SKU balance adjustments, POS sale dispatches, purchases, and transfer movements.")}
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalLedgerEvents", "Total Ledger Events")}
          value={String(totalEvents)}
          hint={t("continuousMovementLog", "Continuous movement log")}
          icon={History}
          accent="primary"
        />
        <StatCard
          label={t("posSalesDispatched", "POS Sales Dispatched")}
          value={String(posSalesOut)}
          hint={t("retailCheckoutEvents", "Retail Checkout Events")}
          icon={ShoppingCart}
          accent="destructive"
        />
        <StatCard
          label={t("purchaseInwardOrders", "Purchase Inward Orders")}
          value={String(inwardPurchases)}
          hint={t("vendorSupplyReceipts", "Vendor supply receipts")}
          icon={Truck}
          accent="success"
        />
        <StatCard
          label={t("auditAdjustments", "Audit Adjustments")}
          value={String(adjustmentsCount)}
          hint={t("manualReconciliationEntries", "Manual reconciliation entries")}
          icon={RotateCcw}
          accent="warning"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchProductOrMovementPlaceholder", "Search product name or movement notes...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-40 text-xs rounded-lg">
                <SelectValue placeholder={t("allEventTypes", "All Event Types")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allEventTypes", "All Event Types")}</SelectItem>
                <SelectItem value="sale">{t("posSalesOut", "POS Sales Out")}</SelectItem>
                <SelectItem value="purchase">{t("purchaseInward", "Purchase Inward")}</SelectItem>
                <SelectItem value="adjust">{t("stockAdjustments", "Stock Adjustments")}</SelectItem>
                <SelectItem value="transfer">{t("branchTransfers", "Branch Transfers")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
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
            </div>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          viewMode === "table" ? (
            <TableSkeleton columns={5} rows={8} />
          ) : (
            <CardGridSkeleton cards={8} />
          )
        ) : viewMode === "table" ? (
          filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title={t("noInventoryMovementLogsFound", "No inventory movement logs found")}
              description={
                search
                  ? t("noMovementLogsSearchDesc", "Try adjusting your search criteria.")
                  : t("noMovementLogsDefaultDesc", "Movement audit entries will automatically appear as POS sales and stock changes occur.")
              }
            />
          ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("productName", "Product Name")}</TableHead>
                    <TableHead>{t("eventType", "Event Type")}</TableHead>
                    <TableHead>{t("stockDelta", "Stock Delta")}</TableHead>
                    <TableHead>{t("movementDetails", "Movement Details")}</TableHead>
                    <TableHead className="text-right">{t("timestamp", "Timestamp")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <EmptyState
                          icon={History}
                          title={t("noInventoryMovementLogsFound", "No inventory movement logs found")}
                          description={
                            search
                              ? t("noMovementLogsSearchDesc", "Try adjusting your search criteria.")
                              : t("noMovementLogsDefaultDesc", "Movement audit entries will automatically appear as POS sales and stock changes occur.")
                          }
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMovements.map((m: any) => {
                    const visuals = getActionVisuals(m.action, t);
                    const isPositive = (m.quantity || 0) > 0;

                    return (
                      <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-foreground">{m.productName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${visuals.badge}`}>
                            {visuals.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-bold ${
                              isPositive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                            }`}
                          >
                            {isPositive ? `+${m.quantity} ${t("units", "units")}` : `${m.quantity} ${t("units", "units")}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                          {m.notes || t("systemMovementAudit", "System movement audit")}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateTime(m.timestamp || m.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  }))}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
          )
        ) : (
          /* Card View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedMovements.map((m: any) => {
                const visuals = getActionVisuals(m.action, t);
                const isPositive = (m.quantity || 0) > 0;

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className={`text-xs ${visuals.badge}`}>
                          {visuals.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-bold ${
                            isPositive
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : `${m.quantity}`} {t("units", "units")}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground truncate">
                          {m.productName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {m.notes || t("systemMovementAudit", "System movement audit")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("auditRecord", "Audit Record")}</span>
                      <span>{formatDateTime(m.timestamp || m.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
