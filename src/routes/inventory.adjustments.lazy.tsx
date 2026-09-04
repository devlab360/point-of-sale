import { createLazyFileRoute } from "@tanstack/react-router";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventoryAdjustmentsFn, createInventoryAdjustmentFn } from "@/api/inventory";
import { getProductsFn } from "@/api/products";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ClipboardList,
  Loader2,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
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

export const Route = createLazyFileRoute("/inventory/adjustments")({
  component: AdjustmentsPage,
});

function AdjustmentsPage() {
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();

  const { data: adjustmentsData, isLoading: isAdjLoading } = useQuery({
    queryKey: ["inventoryAdjustments", orgId],
    queryFn: async () => ((await getInventoryAdjustmentsFn({ data: {} })) as any)?.data || [],
  });
  const adjustments = Array.isArray(adjustmentsData) ? adjustmentsData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"addition" | "deduction">("addition");
  const [qty, setQty] = useState("1");
  const [reasonCategory, setReasonCategory] = useState("Audit Reconciliation");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<"all" | "additions" | "deductions">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isSaving, setIsSaving] = useState(false);

  // Selected product stock preview
  const selectedProduct = useMemo(
    () => products.find((p: any) => p.id === productId),
    [products, productId],
  );

  // KPI calculations
  const totalAdjustments = adjustments.length;
  const totalAdditions = useMemo(
    () =>
      adjustments
        .filter((a: any) => (a.net || 0) > 0)
        .reduce((acc: number, a: any) => acc + (a.net || 0), 0),
    [adjustments],
  );
  const totalDeductions = useMemo(
    () =>
      adjustments
        .filter((a: any) => (a.net || 0) < 0)
        .reduce((acc: number, a: any) => acc + Math.abs(a.net || 0), 0),
    [adjustments],
  );

  const filtered = useMemo(() => {
    let list = adjustments;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.productName?.toLowerCase().includes(lower) || a.reason?.toLowerCase().includes(lower),
      );
    }
    if (typeFilter === "additions") list = list.filter((a: any) => (a.net || 0) > 0);
    if (typeFilter === "deductions") list = list.filter((a: any) => (a.net || 0) < 0);
    return [...list].reverse();
  }, [adjustments, debouncedSearch, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAdjustments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error(t("pleaseSelectTargetProduct", "Please select a target product"));
      return;
    }
    const quantityNum = parseInt(qty, 10);
    if (!quantityNum || quantityNum <= 0) {
      toast.error(t("adjustmentQtyGreaterThanZero", "Adjustment quantity must be greater than 0"));
      return;
    }

    const prod = products.find((p: any) => p.id === productId);
    const calculatedNet = adjustmentType === "addition" ? quantityNum : -quantityNum;
    const fullReason = `${reasonCategory}${notes ? `: ${notes}` : ""}`;

    setIsSaving(true);
    try {
      const res = (await createInventoryAdjustmentFn({
        data: {
          adjustment: {
            id: uuidv4(),
            ref: `ADJ-${Date.now().toString().slice(-6)}`,
            productId,
            productName: prod?.name || "Product",
            net: calculatedNet,
            reason: fullReason,
            date: new Date().toISOString(),
          },
        },
      })) as any;

      if (res?.success) {
        toast.success(t("stockAdjustmentLoggedSuccess", "Stock adjustment successfully logged"));
        setOpen(false);
        setProductId("");
        setQty("1");
        setNotes("");
        queryClient.invalidateQueries({ queryKey: ["inventoryAdjustments"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["posItems"] });
        queryClient.invalidateQueries({ queryKey: ["posBootstrap"] });
        queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
      } else {
        throw new Error(res?.error || "Failed to log adjustment");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("stockAdjustmentsAuditTitle", "Stock Adjustments & Audit")}
        description={t("stockAdjustmentsAuditDesc", "Record inventory write-offs, physical count reconciliations, shrinkage losses, and restock increments.")}
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> {t("newAdjustment", "New Adjustment")}
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalAuditRecords", "Total Audit Records")}
          value={String(totalAdjustments)}
          hint={t("reconciliationEntries", "Reconciliation entries")}
          icon={ClipboardList}
          accent="primary"
        />
        <StatCard
          label={t("stockAdditions", "Stock Additions")}
          value={`+${totalAdditions} ${t("units", "units")}`}
          hint={t("foundStockSurplus", "Found stock & surplus")}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label={t("deductionsLosses", "Deductions & Losses")}
          value={`-${totalDeductions} ${t("units", "units")}`}
          hint={t("damageExpiredShrinkage", "Damage, expired, shrinkage")}
          icon={TrendingDown}
          accent="destructive"
        />
        <StatCard
          label={t("netAuditImpact", "Net Audit Impact")}
          value={`${totalAdditions - totalDeductions > 0 ? "+" : ""}${totalAdditions - totalDeductions} ${t("units", "units")}`}
          hint={t("totalPhysicalBalanceDelta", "Total physical balance delta")}
          icon={Package}
          accent="info"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchAdjustmentsPlaceholder", "Search adjustments by product or reason...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end sm:self-auto">
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-48 text-xs rounded-lg">
                <SelectValue placeholder={t("filterByType", "Filter by type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allAdjustments", "All Adjustments")} ({totalAdjustments})</SelectItem>
                <SelectItem value="additions">
                  {t("additions", "Additions")} (
                  {totalAdjustments && adjustments.filter((a: any) => (a.net || 0) > 0).length})
                </SelectItem>
                <SelectItem value="deductions">
                  {t("deductions", "Deductions")} (
                  {totalAdjustments && adjustments.filter((a: any) => (a.net || 0) < 0).length})
                </SelectItem>
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
        {isAdjLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={4} rows={6} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("noAdjustmentRecordsFound", "No adjustment records found")}
            description={
              search
                ? t("noAdjustmentSearchDesc", "Try adjusting your search criteria.")
                : t("noAdjustmentDefaultDesc", "No manual inventory adjustments have been recorded yet.")
            }
            actionLabel={t("newAdjustment", "New Adjustment")}
            onAction={() => setOpen(true)}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedAdjustments.map((a: any) => {
                const isPos = (a.net || 0) > 0;

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-bold ${
                            isPos
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }`}
                        >
                          {isPos ? `+${a.net} ${t("units", "units")}` : `${a.net} ${t("units", "units")}`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatAppDate(a.date)}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {a.productName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.reason || t("manualAuditEntry", "Manual Audit Entry")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("recordedByManager", "Recorded By Manager")}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {t("synchronized", "Synchronized")}
                      </Badge>
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
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("productName", "Product Name")}</TableHead>
                    <TableHead>{t("adjustmentDelta", "Adjustment Delta")}</TableHead>
                    <TableHead>{t("reasonAuditNotes", "Reason & Audit Notes")}</TableHead>
                    <TableHead className="text-right">{t("timestamp", "Timestamp")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAdjustments.map((a: any) => {
                    const isPos = (a.net || 0) > 0;

                    return (
                      <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-foreground">{a.productName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-bold ${
                              isPos
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                            }`}
                          >
                            {isPos ? `+${a.net} ${t("units", "units")}` : `${a.net} ${t("units", "units")}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                          {a.reason || t("manualAuditEntry", "Manual Audit Entry")}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatAppDate(a.date)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        )}
      </div>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {t("recordStockAdjustment", "Record Stock Adjustment")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("recordStockAdjustmentDesc", "Adjust on-hand inventory levels for physical audit reconciliation, wastage, or counts.")}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("selectTargetProduct", "Select Target Product")} *</Label>
                  <SearchableSelect
                    options={products.map((p: any) => ({
                      value: p.id,
                      label: `${p.name} (${t("stock", "Stock")}: ${p.stock ?? 0})`,
                    }))}
                    value={productId}
                    onChange={setProductId}
                    placeholder={t("searchSkuOrProductName", "Search SKU or product name...")}
                  />
                </div>

                {selectedProduct && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                    <div className="text-muted-foreground">
                      {t("currentOnHandStock", "Current On-Hand Stock")}:{" "}
                      <strong className="text-foreground">{selectedProduct.stock} {t("units", "units")}</strong>
                    </div>
                    <div className="text-muted-foreground">
                      {t("afterAdjustment", "After Adjustment")}:{" "}
                      <strong className="text-primary font-bold">
                        {Math.max(
                          0,
                          (Number(selectedProduct.stock) || 0) +
                            (adjustmentType === "addition"
                              ? parseInt(qty || "0", 10)
                              : -parseInt(qty || "0", 10)),
                        )}{" "}
                        {t("units", "units")}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("adjustmentType", "Adjustment Type")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType("addition")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        adjustmentType === "addition"
                          ? "border-success bg-success/10 text-success ring-2 ring-success/20"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {t("stockAddition", "+ Stock Addition")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType("deduction")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        adjustmentType === "deduction"
                          ? "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {t("stockDeduction", "- Stock Deduction")}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-xs font-semibold">
                    {t("quantityDelta", "Quantity Delta")} *
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="font-bold text-base"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("reasonCategory", "Reason Category")}</Label>
                  <Select value={reasonCategory} onValueChange={setReasonCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Audit Reconciliation">
                        {t("physicalCountReconciliation", "Physical Count Reconciliation")}
                      </SelectItem>
                      <SelectItem value="Damaged Goods">{t("damagedBrokenInTransit", "Damaged / Broken in Transit")}</SelectItem>
                      <SelectItem value="Expired Product">{t("expiredPerished", "Expired / Perished")}</SelectItem>
                      <SelectItem value="Stock Shrinkage / Theft">
                        {t("shrinkageUnaccounted", "Shrinkage / Unaccounted")}
                      </SelectItem>
                      <SelectItem value="Found Surplus Stock">{t("foundUnrecordedStock", "Found Unrecorded Stock")}</SelectItem>
                      <SelectItem value="Internal Consumption">{t("internalTestingDemo", "Internal Testing / Demo")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold">
                    {t("auditNotes", "Audit Notes")}
                  </Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("auditNotesPlaceholder", "e.g. Broken packaging discovered in shelf A4")}
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {t("saveAdjustment", "Save Adjustment")}
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
