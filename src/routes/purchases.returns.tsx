import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Loader2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import type { LocalPurchaseReturn } from "@/lib/db";
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
  const rawReturns = useLiveQuery(() => localDb.purchaseReturns.toArray()) || [];
  const purchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [purchaseId, setPurchaseId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reason, setReason] = useState("");
  const [returnItems, setReturnItems] = useState<{ productId: string; productName: string; quantity: number; cost: number; total: number }[]>([]);

  const filteredReturns = useMemo(() => {
    let res = rawReturns;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(r => r.ref.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q));
    }
    return [...res].reverse();
  }, [rawReturns, search]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const addReturnItem = () => {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
    setReturnItems(prev => [...prev, { productId: "", productName: "", quantity: 1, cost: 0, total: 0 }]);
  };

  const updateReturnItem = (idx: number, field: string, value: any) => {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
    setReturnItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "productId") {
        const prod = products.find(p => p.id === value);
        if (prod) { updated[idx].productName = prod.name; updated[idx].cost = prod.cost; }
      }
      updated[idx].total = updated[idx].quantity * updated[idx].cost;
      return updated;
    });
  };

  const removeReturnItem = (idx: number) => setReturnItems(prev => prev.filter((_, i) => i !== idx));

  const handleAdd = async () => {
    try {
      if (!purchaseId) { toast.error("Please select a purchase"); return; }
      if (!supplier.trim()) { toast.error("Supplier name is required"); return; }
      if (!reason.trim()) { toast.error("Reason is required"); return; }
      if (returnItems.length === 0) { toast.error("Add at least one item"); return; }
      if (returnItems.some(i => !i.productId)) { toast.error("All items must have a product selected"); return; }

      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const returnTotal = returnItems.reduce((s, i) => s + i.total, 0);
      const ref = `PR-${Math.floor(Math.random() * 90000) + 10000}`;

      const newReturn: LocalPurchaseReturn = {
        id: uuidv4(),
        ref,
        purchaseId,
        supplier,
        reason,
        items: returnItems,
        total: parseFloat(returnTotal.toFixed(2)),
        status: "approved",
        date: new Date().toISOString(),
        stockRestored: true,
      };

      await localDb.purchaseReturns.add(newReturn);

      // Reduce stock (we're returning to supplier)
      for (const item of returnItems) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await localDb.products.update(item.productId, { stock: Math.max(0, product.stock - item.quantity) });
          await localDb.inventoryMovements.add({
            productName: item.productName,
            action: "purchase_return",
            quantity: -item.quantity,
            createdAt: new Date().toISOString(),
          });
        }
      }

      toast.success(`Purchase return ${ref} recorded`);
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
      await localDb.purchaseReturns.delete(deleteId);
      toast.success("Return record deleted");
      setDeleteId(null);
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
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReturns.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No purchase returns recorded.</td></tr>
              ) : (
                paginatedReturns.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{r.ref}</td>
                    <td className="px-4 py-3 font-semibold">{r.supplier}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-right">{r.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn(r.status === "approved" && "bg-success/10 text-success hover:bg-success/15", r.status === "pending" && "bg-warning/15 text-warning-foreground")}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="number px-4 py-3 text-right font-semibold">{formatCurrency(r.total)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(r.id)}>
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
        {filteredReturns.length > 0 && (
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </DataPage>

      {/* New Purchase Return Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Purchase Order</Label>
                <SearchableSelect
                  options={purchases.map(p => ({
                    value: p.id,
                    label: `${p.id.slice(0, 8).toUpperCase()} · ${p.supplier}`
                  }))}
                  value={purchaseId}
                  onChange={val => {
                    setPurchaseId(val);
                    const p = purchases.find(pr => pr.id === val);
                    if (p) setSupplier(p.supplier);
                  }}
                  placeholder="— select purchase —"
                />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Reason</Label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Damaged goods, Over-delivery, Quality issue" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items Being Returned</Label>
                <Button type="button" size="sm" variant="outline" onClick={addReturnItem}>+ Add Item</Button>
              </div>
              {returnItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end">
                  <div className="min-w-[120px]">
                    <Label className="text-xs">Product</Label>
                    <SearchableSelect
                      options={products.map(p => ({ value: p.id, label: p.name }))}
                      value={item.productId}
                      onChange={val => updateReturnItem(idx, "productId", val)}
                      placeholder="Select product"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={e => updateReturnItem(idx, "quantity", parseInt(e.target.value) || 1)} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Cost</Label>
                    <Input type="number" min={0} value={item.cost} onChange={e => updateReturnItem(idx, "cost", parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeReturnItem(idx)} className="mb-0 text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {returnItems.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-2 text-sm text-right">
                  Total: <strong>{formatCurrency(returnItems.reduce((s, i) => s + i.total, 0))}</strong>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return Record?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the return record. Stock adjustments will not be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
