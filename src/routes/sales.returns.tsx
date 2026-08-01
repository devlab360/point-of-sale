import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MoreVertical, Trash2, Undo2, Loader2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import type { LocalSaleReturn, OfflineSale } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/sales/returns")({
  head: () => ({ meta: [{ title: "Sales Returns · Grocer.Pro" }] }),
  component: SalesReturnsPage,
});

function SalesReturnsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const returns = useLiveQuery(() => localDb.salesReturns.filter(r => !r._deleted).reverse().toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.filter(s => !s._deleted).reverse().toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

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
    if (filters.status) {
      list = list.filter(r => r.status === filters.status);
    }
    return list;
  }, [returns, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  // Form state
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "wallet">("cash");
  const [selectedItems, setSelectedItems] = useState<{ productId: string; productName: string; quantity: number; price: number; total: number }[]>([]);

  const selectedSale: OfflineSale | undefined = sales.find(s => s.id === saleId);

  const toggleItem = (item: any, checked: boolean) => {
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

      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const returnTotal = selectedItems.reduce((s, i) => s + i.total, 0);
      const ref = `SR-${Math.floor(Math.random() * 90000) + 10000}`;

      const newReturn: LocalSaleReturn = {
        id: uuidv4(),
        orgId: PersistStore.getOrgId() || "default",
        ref,
        saleId,
        customerName: selectedSale?.customerName || "Walk-in",
        reason,
        items: selectedItems,
        total: parseFloat(returnTotal.toFixed(2)),
        status: "approved",
        date: new Date().toISOString(),
        stockRestored: true,
        synced: false
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
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.salesReturns.update(deleteId, { _deleted: true, synced: false });
      await localDb.activityLog.add({
        id: uuidv4(),
        orgId: PersistStore.getOrgId() || "default",
        action: "TOMBSTONE",
        user: "system",
        details: JSON.stringify({ entityType: "salesReturns", entityId: deleteId }),
        timestamp: new Date().toISOString(),
        synced: false,
      });
      toast.success("Return record deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete return");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("salesReturns") || "Sales Returns"}
        description={t("manageReturns") || "Refunds and exchanges issued to customers."}
        primaryAction={{ label: t("processReturn") || "Process Return", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder={t("searchReturns") || "Search by ref or customer..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={returns.length === 0}
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
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button className="w-full" onClick={() => { setFilters(draftFilters); close(); }}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {filteredReturns.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title={t("noReturnsFound") || "No returns found"}
            description={search ? (t("adjustSearch") || "Try adjusting your search.") : (t("noReturnsYet") || "No sales returns have been recorded yet.")}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("ref") || "Ref"}</th>
                    <th className="px-4 py-3">{t("invoice") || "Invoice"}</th>
                    <th className="px-4 py-3">{t("customer") || "Customer"}</th>
                    <th className="px-4 py-3">{t("reason") || "Reason"}</th>
                    <th className="px-4 py-3">{t("date") || "Date"}</th>
                    <th className="px-4 py-3">{t("status") || "Status"}</th>
                    <th className="px-4 py-3 text-right">{t("refund") || "Refund"}</th>
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
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
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
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
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
              <SearchableSelect
                options={sales.map(s => ({
                  value: s.id,
                  label: `#${s.id.slice(0, 8).toUpperCase()} · ${s.customerName || "Walk-in"}`,
                  sublabel: `Total: ${formatCurrency(s.total)}`
                }))}
                value={saleId}
                onChange={val => { setSaleId(val); setSelectedItems([]); }}
                placeholder="— choose an invoice —"
              />
            </div>

            {selectedSale && (
              <div className="space-y-1">
                <Label>Items to Return</Label>
                <div className="space-y-2 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                  {selectedSale.saleItems?.map(item => {
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
                    <SearchableSelect
                      options={[
                        { value: "cash", label: "Cash / Original Payment Method" },
                        { value: "wallet", label: "Store Wallet Credit" }
                      ]}
                      value={refundMethod}
                      onChange={val => setRefundMethod(val as any)}
                      placeholder="Select Refund Method"
                    />
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
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Return
            </Button>
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
