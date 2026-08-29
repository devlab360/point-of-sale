import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
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
  Eye,
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

export const Route = createFileRoute("/purchases/returns")({
  head: () => ({ meta: [{ title: "Purchase Returns (Debit Notes) · OneDesk360" }] }),
  component: PurchaseReturnsPage,
});

function PurchaseReturnsPage() {
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
    <>
      <DataPage
        title="Purchase Returns (Debit Notes)"
        description="Record damaged, defective, or excess stock returned back to vendors."
        primaryAction={{
          label: "Create Return",
          onClick: () => {
            setReturnItems([{ productId: "", productName: "", quantity: 1, cost: 0, total: 0 }]);
            setIsAddOpen(true);
          },
          icon: Plus,
        }}
        searchPlaceholder="Search by return ref, supplier, or reason..."
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
                    ...RETURN_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full font-bold text-xs"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Returns
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground">
                  {metrics.totalReturns}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Returned Value
                </span>
                <span className="text-xl sm:text-2xl font-black text-info">
                  {formatCurrency(metrics.totalValue)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Stock Restored
                </span>
                <span className="text-xl sm:text-2xl font-black text-success">
                  {metrics.processedCount}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pending Adjustments
                </span>
                <span className="text-xl sm:text-2xl font-black text-warning">
                  {metrics.pendingCount}
                </span>
              </div>
            </div>
          }
        >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Debit Note Ref</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Supplier</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Return Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Reason</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Total Credit</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <EmptyState
                          icon={RotateCcw}
                          title="No purchase returns found"
                          description={
                            search
                              ? "Try adjusting your search query."
                              : "No purchase returns or debit notes recorded yet."
                          }
                          actionLabel="Create Return"
                          onAction={() => {
                            setReturnItems([{ productId: "", productName: "", quantity: 1, cost: 0, total: 0 }]);
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
                            {r.status}
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
                                <Trash2 className="size-3.5 mr-2" /> Delete Record
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
                      <span className="text-[10px] text-muted-foreground">{formatDate(r.date)}</span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                      {r.supplier}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">{r.reason}</div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-sm font-black text-foreground">{formatCurrency(Number(r.total) || 0)}</div>
                    <Badge className="text-[9px] font-bold mt-1 bg-success/15 text-success border-success/30">
                      {r.status}
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
        </div>
      </DataPage>

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
                Dispatch Purchase Return (Debit Note)
              </SheetTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Return stock back to supplier and deduct from current inventory counts.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Original Purchase Invoice *</Label>
                <SearchableSelect
                  options={purchases.map((p: any) => ({
                    value: p.id,
                    label: `${p.invoiceNo || p.id.slice(0, 8).toUpperCase()} - ${p.supplier}`,
                    sublabel: `Date: ${p.date ? p.date.split("T")[0] : ""} · Total: ${formatCurrency(Number(p.total) || 0)}`,
                  }))}
                  value={purchaseId}
                  onChange={(val) => {
                    setPurchaseId(val);
                    const selected = purchases.find((p: any) => p.id === val);
                    if (selected) {
                      setSupplier(selected.supplier);
                    }
                  }}
                  placeholder="Select purchase invoice..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Supplier Name *</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Apex Electronics Ltd"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason for Return *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Defective manufacturing batch, damaged in transit, or expired stock"
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-sm">Return Line Items</Label>
                <Button size="sm" variant="outline" onClick={addReturnItem} className="h-8 text-xs font-semibold">
                  <Plus className="size-3.5 mr-1" /> Add Product
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Product</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-24">Qty</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-28">Unit Cost</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right w-28">Total</TableHead>
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
                              sublabel: `Stock: ${p.stock ?? 0} · Cost: ${formatCurrency(Number(p.cost) || 0)}`,
                            }))}
                            value={item.productId}
                            onChange={(val) => updateReturnItem(idx, "productId", val)}
                            placeholder="Select product..."
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateReturnItem(idx, "quantity", parseInt(e.target.value) || 1)}
                            className="h-9 text-right font-bold text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost}
                            onChange={(e) => updateReturnItem(idx, "cost", parseFloat(e.target.value) || 0)}
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
                <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Debit Total</span>
                <p className="text-xs text-muted-foreground mt-0.5">Will be credited to your supplier ledger account.</p>
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
              Cancel
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
              Confirm Debit Note
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Return Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Return Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this debit note? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
