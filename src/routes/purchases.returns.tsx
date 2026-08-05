import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { MoreVertical, Trash2, Loader2 } from "lucide-react";
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
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/purchases/returns")({
  head: () => ({ meta: [{ title: "Purchase Returns · Grocer.Pro" }] }),
  component: PurchaseReturnsPage,
});

function PurchaseReturnsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawReturnsData } = useQuery({
    queryKey: ["purchaseReturns", orgId],
    queryFn: async () => ((await getPurchaseReturnsFn({ data: {} })) as any)?.data || [],
  });
  const rawReturns = rawReturnsData || [];

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases", orgId],
    queryFn: async () => ((await getPurchasesFn({ data: {} })) as any)?.data || [],
  });
  const purchases = purchasesData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

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
        (r) =>
          r.ref.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      res = res.filter((r) => r.status === filters.status);
    }
    return [...res].reverse();
  }, [rawReturns, search, filters.status]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

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
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated[idx].productName = prod.name;
          updated[idx].cost = prod.cost;
        }
      }
      updated[idx].total = updated[idx].quantity * updated[idx].cost;
      return updated;
    });
  };

  const removeReturnItem = (idx: number) =>
    setReturnItems((prev) => prev.filter((_, i) => i !== idx));

  const handleAdd = async () => {
    try {
      if (!purchaseId) {
        toast.error("Please select a purchase");
        return;
      }
      if (!supplier.trim()) {
        toast.error("Supplier name is required");
        return;
      }
      if (!reason.trim()) {
        toast.error("Reason is required");
        return;
      }
      if (returnItems.length === 0) {
        toast.error("Add at least one item");
        return;
      }
      if (returnItems.some((i) => !i.productId)) {
        toast.error("All items must have a product selected");
        return;
      }

      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const totalQty = returnItems.reduce((s, i) => s + i.quantity, 0);
      const totalRefund = returnItems.reduce((s, i) => s + i.total, 0);
      const purchase = purchases.find((p) => p.id === purchaseId);
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
      toast.success(`Purchase return recorded`);
      setIsAddOpen(false);
      setPurchaseId("");
      setSupplier("");
      setReason("");
      setReturnItems([]);
    } catch {
      toast.error("Failed to process purchase return");
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
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Purchase Returns"
        description="Damaged or excess stock returned to suppliers."
        primaryAction={{ label: "New Return", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by ref or supplier..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawReturns.length === 0}
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
                    { value: "approved", label: "Approved" },
                    { value: "pending", label: "Pending" },
                    { value: "rejected", label: "Rejected" },
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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Ref</th>
                <th className="px-4 py-3 whitespace-nowrap">Supplier</th>
                <th className="px-4 py-3 whitespace-nowrap">Reason</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Items</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                <th className="px-4 py-3 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No purchase returns recorded.
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">{r.ref}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.supplier}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        className={cn(
                          r.status === "approved" &&
                            "bg-success/10 text-success hover:bg-success/15",
                          r.status === "pending" && "bg-warning/15 text-warning-foreground",
                        )}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="number px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
              </div>
              <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
           totalItems={filteredReturns.length}/>
            </div>
      </DataPage>

      {/* New Purchase Return Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Purchase Order</Label>
                <SearchableSelect
                  options={purchases.map((p) => ({
                    value: p.id,
                    label: `${p.id.slice(0, 8).toUpperCase()} · ${p.supplier}`,
                  }))}
                  value={purchaseId}
                  onChange={(val) => {
                    setPurchaseId(val);
                    const p = purchases.find((pr) => pr.id === val);
                    if (p) setSupplier(p.supplier);
                  }}
                  placeholder="— select purchase —"
                />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Reason</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Damaged goods, Over-delivery, Quality issue"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items Being Returned</Label>
                <Button type="button" size="sm" variant="outline" onClick={addReturnItem}>
                  + Add Item
                </Button>
              </div>
              {returnItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end">
                  <div className="min-w-[120px]">
                    <Label className="text-xs">Product</Label>
                    <SearchableSelect
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                      value={item.productId}
                      onChange={(val) => updateReturnItem(idx, "productId", val)}
                      placeholder="Select product"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateReturnItem(idx, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cost</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.cost}
                      onChange={(e) =>
                        updateReturnItem(idx, "cost", parseFloat(e.target.value) || 0)
                      }
                      className="mt-1 h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeReturnItem(idx)}
                    className="mb-0 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {returnItems.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-2 text-sm text-right">
                  Total:{" "}
                  <strong>{formatCurrency(returnItems.reduce((s, i) => s + i.total, 0))}</strong>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the return record. Stock adjustments will not be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
