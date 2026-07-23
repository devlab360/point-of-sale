import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Eye, Plus, ShoppingCart } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { LocalPurchase } from "@/lib/db";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases · Grocer.Pro" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const rawPurchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [statusFilter, setStatusFilter] = useState("");
  
  const [viewPurchase, setViewPurchase] = useState<LocalPurchase | null>(null);

  const filtered = useMemo(() => {
    let list = rawPurchases;
    if (debouncedQuery) {
      const lower = debouncedQuery.toLowerCase();
      list = list.filter(p =>
        p.supplier.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower)
      );
    }
    if (statusFilter) {
      list = list.filter(p => p.status === statusFilter);
    }
    return list;
  }, [rawPurchases, debouncedQuery, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("purchases") || "Purchases"}
        description={t("managePurchases") || "Inbound inventory from suppliers and purchase orders."}
        primaryAction={{ label: t("newPurchase") || "New Purchase", onClick: () => navigate({ to: "/purchases/new" }), icon: Plus }}
        searchPlaceholder={t("searchPurchases") || "Search by PO or supplier..."}
        searchValue={query}
        onSearchChange={setQuery}
        hideToolbar={rawPurchases.length === 0}
        filtersContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect 
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "received", label: "Received" },
                  { value: "partial", label: "Partial" },
                  { value: "pending", label: "Pending" }
                ]} 
                value={statusFilter} 
                onChange={setStatusFilter} 
                placeholder="Filter by Status"
              />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setStatusFilter("")}>
              Reset Filters
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t("noPurchasesFound") || "No purchases found"}
            description={query ? (t("adjustSearch") || "Try adjusting your search.") : (t("noPurchasesYet") || "No purchase orders have been created yet.")}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("po") || "PO"}</th>
                    <th className="px-4 py-3">{t("supplier") || "Supplier"}</th>
                    <th className="px-4 py-3">{t("date") || "Date"}</th>
                    <th className="px-4 py-3 text-right">{t("items") || "Items"}</th>
                    <th className="px-4 py-3">{t("status") || "Status"}</th>
                    <th className="px-4 py-3 text-right">{t("total") || "Total"}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{p.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 font-semibold">{p.supplier}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">{p.items}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          p.status === "received" && "bg-success/10 text-success hover:bg-success/15",
                          p.status === "partial" && "bg-info/10 text-info hover:bg-info/15",
                          p.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                        )}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="number px-4 py-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" title="View details" onClick={() => setViewPurchase(p)}>
                          <Eye className="size-4" />
                        </Button>
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

      {/* Purchase Detail Dialog */}
      <Dialog open={!!viewPurchase} onOpenChange={open => !open && setViewPurchase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase #{viewPurchase?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {viewPurchase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Supplier:</span> <strong>{viewPurchase.supplier}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewPurchase.date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Items:</span> {viewPurchase.items}</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge className={cn(viewPurchase.status === "received" && "bg-success/10 text-success")}>{viewPurchase.status}</Badge>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>{formatCurrency(viewPurchase.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
