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
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases · Grocer.Pro" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const rawPurchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
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
    return list;
  }, [rawPurchases, debouncedQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, page]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedPurchases = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Purchases"
        description="Inbound stock from your suppliers and wholesalers."
        primaryAction={{ label: "New Purchase", onClick: () => navigate({ to: "/purchases/new" }), icon: Plus }}
        searchPlaceholder="Search by supplier or PO..."
        searchValue={query}
        onSearchChange={setQuery}
        hideToolbar={rawPurchases.length === 0}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No purchases found"
            description={query ? "Try adjusting your search." : "No purchase orders have been created yet."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">PO</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
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
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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
