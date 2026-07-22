import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Undo2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import type { LocalSaleReturn, OfflineSale } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

export const Route = createFileRoute("/sales/returns")({
  head: () => ({ meta: [{ title: "Sales Returns · Grocer.Pro" }] }),
  component: SalesReturnsPage,
});

function SalesReturnsPage() {
  const { formatCurrency } = useCurrency();
  const returns = useLiveQuery(() => localDb.salesReturns.reverse().toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.reverse().toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredReturns = useMemo(() => {
    let list = returns;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(r => 
        r.ref.toLowerCase().includes(lower) || 
        r.saleId.toLowerCase().includes(lower) || 
        r.customerName.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [returns, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredReturns.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredReturns.length, page]);

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const paginatedReturns = filteredReturns.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Form state
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "wallet">("cash");
  const [selectedItems, setSelectedItems] = useState<{ productId: string; productName: string; quantity: number; price: number; total: number }[]>([]);

  const selectedSale: OfflineSale | undefined = sales.find(s => s.id === saleId);

  const toggleItem = (item: OfflineSale["saleItems"][0], checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }]);
    } else {
      setSelectedItems(prev => prev.filter(i => i.productId !== item.productId));
    }
  };

  const handleAdd = async () => {
    try {
      if (!saleId) { toast.error("Please select an invoice"); return; }
      if (!reason.trim()) { toast.error("Reason is required"); return; }
      if (selectedItems.length === 0) { toast.error("Select at least one item to return"); return; }

      const returnTotal = selectedItems.reduce((s, i) => s + i.total, 0);
      const ref = `SR-${Math.floor(Math.random() * 90000) + 10000}`;

      const newReturn: LocalSaleReturn = {
        id: uuidv4(),
        ref,
        saleId,
        customerName: selectedSale?.customerName || "Walk-in",
        reason,
        items: selectedItems,
        total: parseFloat(returnTotal.toFixed(2)),
        status: "approved",
        date: new Date().toISOString(),
        stockRestored: true,
      };

      await localDb.salesReturns.add(newReturn);

      if (refundMethod === "wallet" && selectedSale?.customerId) {
        const cust = customers.find(c => c.id === selectedSale?.customerId);
        if (cust) {
          await localDb.customers.update(cust.id, {
            walletBalance: (cust.walletBalance || 0) + parseFloat(returnTotal.toFixed(2)),
            synced: false
          });
        }
      }

      // Restore stock
      for (const item of selectedItems) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await localDb.products.update(item.productId, { stock: product.stock + item.quantity });
          await localDb.inventoryMovements.add({
            productName: item.productName,
            action: "sale_return",
            quantity: item.quantity,
            createdAt: new Date().toISOString(),
          });
        }
      }

      toast.success(`Return ${ref} processed — stock restored`);
      setIsAddOpen(false);
      setSaleId("");
      setReason("");
      setSelectedItems([]);
      setRefundMethod("cash");
    } catch (err) {
      toast.error("Failed to process return");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.salesReturns.delete(deleteId);
      toast.success("Return record deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete return");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Sales Returns"
        description="Refunds and exchanges issued to customers."
        primaryAction={{ label: "Process Return", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by ref or customer..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={returns.length === 0}
      >
        {filteredReturns.length === 0 ? (
          <EmptyState 
            icon={Undo2} 
            title="No returns found" 
            description={search ? "Try adjusting your search." : "No sales returns have been recorded yet."} 
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Refund</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedReturns.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{r.ref}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.saleId.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 font-semibold">{r.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      {/* Process Return Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Process Sales Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Select Invoice</Label>
              <select
                value={saleId}
                onChange={e => { setSaleId(e.target.value); setSelectedItems([]); }}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
              >
                <option value="">— choose an invoice —</option>
                {sales.map(s => (
                  <option key={s.id} value={s.id}>
                    #{s.id.slice(0, 8).toUpperCase()} · {s.customerName || "Walk-in"} · ${s.total.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedSale && (
              <div className="space-y-1">
                <Label>Items to Return</Label>
                <div className="space-y-2 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                  {selectedSale.saleItems.map(item => {
                    const checked = selectedItems.some(i => i.productId === item.productId);
                    return (
                      <label key={item.productId} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={e => toggleItem(item, e.target.checked)} className="size-4 rounded" />
                        <span className="flex-1 text-sm">{item.productName}</span>
                        <span className="text-sm font-semibold">{item.quantity}x · {formatCurrency(item.total)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Reason</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Wrong item, Damaged, Customer changed mind" />
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-3">
                {selectedSale?.customerId && (
                  <div className="space-y-1">
                    <Label>Refund Method</Label>
                    <select
                      value={refundMethod}
                      onChange={e => setRefundMethod(e.target.value as any)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
                    >
                      <option value="cash">Cash / Original Payment Method</option>
                      <option value="wallet">Store Wallet Credit</option>
                    </select>
                  </div>
                )}
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  Refund total: <strong>{formatCurrency(selectedItems.reduce((s, i) => s + i.total, 0))}</strong>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Process Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return Record?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the return record. Stock will not be reversed.</AlertDialogDescription>
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
