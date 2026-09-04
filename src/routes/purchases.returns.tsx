import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RETURN_STATUSES } from "@/constants";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  Loader2,
  Plus,
  RotateCcw,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseReturnsFn,
  createPurchaseReturnFn,
  deletePurchaseReturnFn,
  getPurchasesFn,
} from "@/api/purchases";
import { getProductsFn } from "@/api/products";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/purchases/returns")({
  head: () => ({ meta: [{ title: `Purchase Returns (Debit Notes) · ${appName}` }] }),
  component: PurchaseReturnsPage,
});

function PurchaseReturnsPage() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawReturnsData } = useQuery({
    queryKey: ["purchaseReturns", orgId],
    queryFn: async () => ((await getPurchaseReturnsFn({ data: {} })) as any)?.data || [],
  });
  const rawReturns: any[] = rawReturnsData || [];

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases", orgId],
    queryFn: async () => ((await getPurchasesFn({ data: {} })) as any)?.data || [],
  });
  const purchases: any[] = purchasesData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products: any[] = productsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [purchaseId, setPurchaseId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reason, setReason] = useState("");
  const [returnItems, setReturnItems] = useState<
    { productId: string; productName: string; quantity: number; cost: number; total: number }[]
  >([]);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredReturns = useMemo(() => {
    let res = rawReturns;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(
        (r: any) =>
          r.ref?.toLowerCase().includes(q) ||
          r.supplier?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      res = res.filter((r: any) => r.status === filters.status);
    }
    return [...res].reverse();
  }, [rawReturns, search, filters.status]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  // Metrics
  const metrics = useMemo(() => {
    const totalReturns = rawReturns.length;
    const totalValue = rawReturns.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const processedCount = rawReturns.filter((r) => r.status === "processed").length;
    const pendingCount = rawReturns.filter((r) => r.status === "pending").length;
    return { totalReturns, totalValue, processedCount, pendingCount };
  }, [rawReturns]);

  const addReturnItem = () => {
    setReturnItems((prev) => [
      ...prev,
      { productId: "", productName: "", quantity: 1, cost: 0, total: 0 },
    ]);
  };

  const updateReturnItem = (idx: number, field: string, value: any) => {
    setReturnItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "productId") {
        const prod = products.find((p: any) => p.id === value);
        if (prod) {
          updated[idx].productName = prod.name;
          updated[idx].cost = Number(prod.cost) || 0;
        }
      }
      updated[idx].total = (Number(updated[idx].quantity) || 1) * (Number(updated[idx].cost) || 0);
      return updated;
    });
  };

  const removeReturnItem = (idx: number) =>
    setReturnItems((prev) => prev.filter((_, i) => i !== idx));

  const handleAdd = async () => {
    try {
      if (!purchaseId) {
        toast.error("Please select an original purchase invoice");
        return;
      }
      if (!supplier.trim()) {
        toast.error("Supplier name is required");
        return;
      }
      if (!reason.trim()) {
        toast.error("Reason for return is required");
        return;
      }
      if (returnItems.length === 0) {
        toast.error("Add at least one line item to return");
        return;
      }
      if (returnItems.some((i) => !i.productId)) {
        toast.error("All items must have a valid product selected");
        return;
      }

      setIsSubmitting(true);
      const totalRefund = returnItems.reduce((s, i) => s + i.total, 0);
      const purchase = purchases.find((p: any) => p.id === purchaseId);
      if (!purchase) throw new Error("Purchase not found");

      const res = await createPurchaseReturnFn({
        data: {
          purchaseReturn: {
            ref: `PR-${Math.floor(Math.random() * 90000) + 10000}`,
            purchaseId: purchase.id,
            supplier,
            reason,
            items: returnItems,
            total: parseFloat(totalRefund.toFixed(2)),
            status: "processed",
            date: new Date().toISOString(),
            stockRestored: true,
          },
        },
      });
      if (!res?.success) throw new Error(res?.error);

      queryClient.invalidateQueries({ queryKey: ["purchaseReturns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Purchase return recorded & stock adjusted successfully");
      setIsAddOpen(false);
      setPurchaseId("");
      setSupplier("");
      setReason("");
      setReturnItems([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to process purchase return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deletePurchaseReturnFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Return record deleted");
        setDeleteId(null);
        queryClient.invalidateQueries({ queryKey: ["purchaseReturns"] });
      } else throw new Error(res?.error);
    } catch {
      toast.error("Failed to delete return");
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("purchaseReturnsTitle", "Purchase Returns (Debit Notes)")}
        description={t("purchaseReturnsDesc", "Record damaged, defective, or excess stock returned back to vendors.")}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setReturnItems([{ productId: "", productName: "", quantity: 1, cost: 0, total: 0 }]);
              setIsAddOpen(true);
            }}
            className="shadow-soft"
          >
            <Plus className="size-4 mr-1.5" />
            {t("createReturn", "Create Return")}
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalReturns", "Total Returns")}
          value={String(metrics.totalReturns)}
          icon={RotateCcw}
          accent="primary"
        />
        <StatCard
          label={t("returnedValue", "Returned Value")}
          value={formatCurrency(metrics.totalValue)}
          icon={DollarSign}
          accent="info"
        />
        <StatCard
          label={t("stockRestored", "Stock Restored")}
          value={String(metrics.processedCount)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("pendingAdjustments", "Pending Adjustments")}
          value={String(metrics.pendingCount)}
          icon={Clock}
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
            placeholder={t("searchReturnsPlaceholder", "Search by return ref, supplier, or reason...")}
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
                <SheetTitle className="text-lg font-bold">{t("filterReturns", "Filter Returns")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("status", "Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allStatuses", "All Statuses") },
                      ...RETURN_STATUSES.map((s) => ({ value: s.value, label: s.label })),
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

      {/* Main Table / Mobile View */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
        <div className="table-desktop overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  {t("debitNoteRef", "Debit Note Ref")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  {t("supplier", "Supplier")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  {t("returnDate", "Return Date")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  {t("reason", "Reason")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">
                  {t("status", "Status")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                  {t("totalCredit", "Total Credit")}
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                  {t("actions", "Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {paginatedReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <EmptyState
                      icon={RotateCcw}
                      title={t("noPurchaseReturnsFound", "No purchase returns found")}
                      description={
                        search
                          ? t("tryAdjustingSearchQuery", "Try adjusting your search query.")
                          : t("noReturnsRecordedYet", "No purchase returns or debit notes recorded yet.")
                      }
                      actionLabel={t("createReturn", "Create Return")}
                      onAction={() => {
                        setReturnItems([
                          { productId: "", productName: "", quantity: 1, cost: 0, total: 0 },
                        ]);
                        setIsAddOpen(true);
                      }}
                      className="border-none bg-transparent my-0 py-8 shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReturns.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {r.ref}
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-foreground">
                      {r.supplier}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      {formatDate(r.date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.reason}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          r.status === "processed"
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-warning/15 text-warning border-warning/30",
                        )}
                      >
                        {t(r.status, r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-foreground text-sm">
                      {formatCurrency(Number(r.total) || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-36">
                          <DropdownMenuItem
                            onClick={() => setDeleteId(r.id)}
                            className="text-xs font-semibold text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-2" /> {t("deleteRecord", "Delete Record")}
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

        {/* Mobile Cards */}
        <div className="table-mobile-cards p-3 space-y-2.5">
          {paginatedReturns.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{r.ref}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(r.date)}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                  {r.supplier}
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {r.reason}
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <div className="text-sm font-black text-foreground">
                  {formatCurrency(Number(r.total) || 0)}
                </div>
                <Badge className="text-[9px] font-bold mt-1 bg-success/15 text-success border-success/30">
                  {t(r.status, r.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {filteredReturns.length > 0 && (
          <div className="border-t border-border/60 p-3">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredReturns.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* New Return Slide-over Drawer Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" />
              <SheetTitle className="text-xl font-black text-foreground">
                {t("dispatchPurchaseReturn", "Dispatch Purchase Return (Debit Note)")}
              </SheetTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("purchaseReturnDesc", "Return stock back to supplier and deduct from current inventory counts.")}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("originalPurchaseInvoice", "Original Purchase Invoice")} *</Label>
                <SearchableSelect
                  options={purchases.map((p: any) => ({
                    value: p.id,
                    label: `${p.invoiceNo || p.id.slice(0, 8).toUpperCase()} - ${p.supplier}`,
                    sublabel: `${t("date", "Date")}: ${p.date ? p.date.split("T")[0] : ""} · ${t("total", "Total")}: ${formatCurrency(Number(p.total) || 0)}`,
                  }))}
                  value={purchaseId}
                  onChange={(val) => {
                    setPurchaseId(val);
                    const selected = purchases.find((p: any) => p.id === val);
                    if (selected) {
                      setSupplier(selected.supplier);
                    }
                  }}
                  placeholder={t("selectPurchaseInvoice", "Select purchase invoice...")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("supplierName", "Supplier Name")} *</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder={t("supplierPlaceholder", "e.g. Apex Electronics Ltd")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("reasonForReturn", "Reason for Return")} *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder", "e.g. Defective manufacturing batch, damaged in transit, or expired stock")}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-sm">{t("returnLineItems", "Return Line Items")}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addReturnItem}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1" /> {t("addProduct", "Add Product")}
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">{t("product", "Product")}</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-24">
                        {t("qty", "Qty")}
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-28">
                        {t("unitCost", "Unit Cost")}
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-28">
                        {t("total", "Total")}
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {returnItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <SearchableSelect
                            options={products.map((p: any) => ({
                              value: p.id,
                              label: p.name,
                              sublabel: `${t("stock", "Stock")}: ${p.stock ?? 0} · ${t("cost", "Cost")}: ${formatCurrency(Number(p.cost) || 0)}`,
                            }))}
                            value={item.productId}
                            onChange={(val) => updateReturnItem(idx, "productId", val)}
                            placeholder={t("selectProduct", "Select product...")}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateReturnItem(idx, "quantity", parseInt(e.target.value) || 1)
                            }
                            className="h-9 text-right font-bold text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost}
                            onChange={(e) =>
                              updateReturnItem(idx, "cost", parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-right font-bold text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-foreground">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeReturnItem(idx)}
                            className="size-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Refund Total Summary */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  {t("estimatedDebitTotal", "Estimated Debit Total")}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("estimatedDebitTotalDesc", "Will be credited to your supplier ledger account.")}
                </p>
              </div>
              <div className="text-xl font-black text-primary">
                {formatCurrency(returnItems.reduce((s, i) => s + i.total, 0))}
              </div>
            </div>
          </div>

          <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="font-bold text-xs"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting}
              className="font-bold text-xs min-w-[160px] shadow-soft"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              {t("confirmDebitNote", "Confirm Debit Note")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Return Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePurchaseReturnTitle", "Delete Purchase Return Record?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePurchaseReturnDesc", "Are you sure you want to delete this debit note? This cannot be undone.")}
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
