import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Eye, Printer, Plus, Search, Receipt } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { OfflineSale } from "@/lib/db";
import { usePreferences } from "@/contexts/PreferencesContext";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales · Grocer.Pro" }] }),
  component: SalesPage,
});

function SalesPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatDateTime } = usePreferences();
  const { currencySymbol, formatCurrency } = useCurrency();
  const sales = useLiveQuery(() => localDb.offlineSales.reverse().toArray()) || [];
  const settings = useLiveQuery(() => localDb.settings.get("default"));

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");
  const [viewSale, setViewSale] = useState<OfflineSale | null>(null);

  const storeName = settings?.storeName || "GROCER.PRO";
  const storeAddress = settings?.address || "";
  const storePhone = settings?.phone || "";

  const filtered = useMemo(() => {
    let list = sales;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(s =>
        Boolean(
          (s.id && String(s.id).toLowerCase().includes(q)) ||
          (s.customerName && String(s.customerName).toLowerCase().includes(q))
        )
      );
    }
    if (statusFilter) {
      list = list.filter(s => s.status === statusFilter);
    }
    if (paymentFilter) {
      list = list.filter(s => s.paymentMethod === paymentFilter);
    }
    if (syncFilter) {
      const isSynced = syncFilter === "synced";
      list = list.filter(s => s.synced === isSynced);
    }
    return list;
  }, [sales, debouncedQuery, statusFilter, paymentFilter, syncFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, paymentFilter, syncFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedSales = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const summaries = useMemo(() => {
    let cash = 0, card = 0, upi = 0, credit = 0;
    filtered.forEach(s => {
      if (s.status === "refunded") return; // Ignore refunded sales in total collected
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach(p => {
          if (p.method === 'cash') cash += p.amount;
          else if (p.method === 'card') card += p.amount;
          else if (p.method === 'upi' || p.method === 'online' || p.method === 'mobile' || p.method === 'wallet') upi += p.amount;
          else if (p.method === 'credit') credit += p.amount;
        });
      } else {
        if (s.paymentMethod === 'cash') cash += s.total;
        else if (s.paymentMethod === 'card') card += s.total;
        else if (s.paymentMethod === 'credit') credit += s.total;
        else if (s.paymentMethod === 'upi' || s.paymentMethod === 'wallet' || s.paymentMethod === 'mobile') upi += s.total;
      }
    });
    return { cash, card, upi, credit, total: cash + card + upi + credit };
  }, [filtered]);

  const printReceipt = (s: OfflineSale) => {
    setViewSale(s);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("salesHistory") || "Sales History"}
        description={t("manageSales") || "Every transaction across all your registers."}
        primaryAction={{ label: t("newSale") || "New Sale", onClick: () => navigate({ to: "/pos" }), icon: Plus }}
        searchPlaceholder={t("searchSales") || "Search by invoice or customer..."}
        searchValue={query}
        onSearchChange={setQuery}
        hideToolbar={sales.length === 0}
        filtersContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "completed", label: "Completed" },
                  { value: "pending", label: "Pending" },
                  { value: "refunded", label: "Refunded" }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by Status"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "All Methods" },
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "mobile", label: "Mobile Banking" },
                  { value: "wallet", label: "Wallet" }
                ]}
                value={paymentFilter}
                onChange={setPaymentFilter}
                placeholder="Filter by Payment"
              />
            </div>
            <div className="space-y-2">
              <Label>Sync Status</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "All Sync Status" },
                  { value: "synced", label: "Synced" },
                  { value: "pending", label: "Pending Sync" }
                ]}
                value={syncFilter}
                onChange={setSyncFilter}
                placeholder="Filter by Sync"
              />
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setStatusFilter(""); setPaymentFilter(""); setSyncFilter(""); }}>
              Reset Filters
            </Button>
          </div>
        }
      >
        {/* We override the primaryAction onClick to use a Link instead, since DataPage only takes a callback, or we can just keep the button as child. Wait, DataPage's primaryAction just takes onClick. We can just pass the Link inside children, or adapt DataPage. Actually, DataPage primaryAction is fine. */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("noSalesFound") || "No sales found"}
            description={debouncedQuery ? (t("adjustSearch") || "Try adjusting your search.") : (t("noSalesYet") || "No transactions have been recorded yet.")}
          />
        ) : (
          <div className="space-y-4">
            {/* Payment Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Cash</span>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(summaries.cash)}</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Card</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(summaries.card)}</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">UPI / Online</span>
                <span className="text-xl font-black text-indigo-600">{formatCurrency(summaries.upi)}</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credit (Due)</span>
                <span className="text-xl font-black text-amber-600">{formatCurrency(summaries.credit)}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("invoice") || "Invoice"}</th>
                    <th className="px-4 py-3">{t("customer") || "Customer"}</th>
                    <th className="px-4 py-3">{t("date") || "Date"}</th>
                    <th className="px-4 py-3 text-right">{t("items") || "Items"}</th>
                    <th className="px-4 py-3">{t("payment") || "Payment"}</th>
                    <th className="px-4 py-3">{t("sync") || "Sync"}</th>
                    <th className="px-4 py-3">{t("status") || "Status"}</th>
                    <th className="px-4 py-3 text-right">{t("total") || "Total"}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedSales.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{s.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 font-semibold">{s.customerName || "Walk-in"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.date)}</td>
                      <td className="px-4 py-3 text-right">{s.items}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {s.paymentMethod === 'split' && s.payments && s.payments.length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-[10px]">
                            <span className="font-bold text-primary">SPLIT</span>
                            {s.payments.map((p, i) => (
                              <span key={i} className="font-semibold text-foreground">{p.method.toUpperCase()}: {formatCurrency(p.amount)}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">{s.paymentMethod || "cash"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(s.synced ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground")}>
                          {s.synced ? "Synced" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          s.status === "completed" && "bg-success/10 text-success hover:bg-success/15",
                          s.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                          s.status === "refunded" && "bg-muted text-muted-foreground hover:bg-muted",
                        )}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="number px-4 py-3 text-right font-semibold">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="View details" onClick={() => setViewSale(s)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Reprint receipt" onClick={() => printReceipt(s)}>
                            <Printer className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </DataPage>

      {/* Sale Detail Dialog */}
      <Dialog open={!!viewSale} onOpenChange={open => !open && setViewSale(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice #{viewSale?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <strong>{viewSale.customerName || "Walk-in"}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDateTime(viewSale.date)}</div>
                <div><span className="text-muted-foreground">Payment:</span> <strong className="capitalize">{viewSale.paymentMethod}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className="bg-success/10 text-success">{viewSale.status}</Badge></div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewSale.saleItems?.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                {viewSale.subtotal !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(viewSale.subtotal)}</span></div>}
                {viewSale.discountAmt !== undefined && viewSale.discountAmt > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-{formatCurrency(viewSale.discountAmt)}</span></div>}
                {viewSale.taxAmt !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(viewSale.taxAmt)}</span></div>}
                <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Total</span><span>{formatCurrency(viewSale.total)}</span></div>
              </div>
              <Button className="w-full" onClick={() => { setViewSale(null); printReceipt(viewSale); }}>
                <Printer className="size-4 mr-2" /> Reprint Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print receipt */}
      {viewSale && (
        <div className="hidden print:block fixed inset-0 z-[200] bg-white text-black text-[12px] font-mono leading-tight p-4">
          <div className="max-w-[300px] mx-auto">
            <div className="text-center mb-3">
              <h1 className="text-xl font-bold">{storeName}</h1>
              <p>{storeAddress}</p>
              <p>Tel: {storePhone}</p>
            </div>
            <div className="border-t border-black pt-2 mb-2 text-[11px]">
              <div className="flex justify-between"><span>Receipt #:</span><span>{viewSale.id.slice(0, 8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{formatDateTime(viewSale.date)}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span>{viewSale.customerName || "Walk-in"}</span></div>
            </div>
            <div className="border-t border-b border-black py-2 mb-2">
              {viewSale.saleItems?.map((item, i) => (
                <div key={i} className="flex justify-between"><span className="truncate max-w-[160px]">{item.productName} x{item.quantity}</span><span>{formatCurrency(item.total)}</span></div>
              ))}
            </div>
            <div className="flex justify-between font-bold"><span>TOTAL:</span><span>{formatCurrency(viewSale.total)}</span></div>
            <p className="mt-3 text-center text-[10px]">Thank you for your business!</p>
          </div>
        </div>
      )}
    </div>
  );
}
