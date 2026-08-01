import { createLazyFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { Download, Filter, Brain } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataPage } from "@/components/layout/DataPage";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createLazyFileRoute("/inventory/")({
  component: StockList,
});

function StockList() {
  const products = useLiveQuery(() => localDb.products.filter(p => !p._deleted).toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.filter(s => !s._deleted).toArray()) || [];
  const units = useLiveQuery(() => localDb.units.filter(u => !u._deleted).toArray()) || [];
  const lowCount = products.filter(p => p.stock <= p.reorderLevel).length;
  const outCount = products.filter(p => p.stock <= 0).length;

  const { t } = useLanguage();
  const [showForecast, setShowForecast] = useState(false);
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

  const forecasts = useMemo(() => {
    if (!showForecast) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = sales.filter(s => new Date(s.date) >= thirtyDaysAgo);

    const salesMap: Record<string, number> = {};
    recentSales.forEach(sale => {
      sale.saleItems?.forEach(item => {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
      });
    });

    return products.map(p => {
      const qtySold30d = salesMap[p.id] || 0;
      const dailyVelocity = qtySold30d / 30;
      const daysRemaining = dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : 999;
      return { ...p, dailyVelocity, daysRemaining };
    }).filter(p => p.daysRemaining <= 14).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [sales, products, showForecast]);

  const isExpired = (date?: string) => date ? new Date(date) < new Date() : false;
  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff > 0 && diff <= 30;
  };

  const filteredProducts = useMemo(() => {
    let list = products;

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower)
      );
    }

    if (filters.status === "in-stock") {
      list = list.filter(p => p.stock > p.reorderLevel);
    } else if (filters.status === "low") {
      list = list.filter(p => p.stock > 0 && p.stock <= p.reorderLevel);
    } else if (filters.status === "out") {
      list = list.filter(p => p.stock <= 0);
    } else if (filters.status === "expiring") {
      list = list.filter(p => isExpiringSoon(p.expiryDate) || isExpired(p.expiryDate));
    }

    return list;
  }, [products, debouncedSearch, filters.status]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const expiringCount = products.filter(p => isExpiringSoon(p.expiryDate) || isExpired(p.expiryDate)).length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Stock Inventory"
        description="Monitor your current stock levels and AI forecasts."
        searchPlaceholder="Search inventory by name or SKU..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={products.length === 0}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Stock Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low", label: "Low Stock" },
                    { value: "out", label: "Out of Stock" },
                    { value: "expiring", label: "Expiring Soon" },
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
        toolbar={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20" onClick={() => setShowForecast(true)}>
              <Brain className="size-4 mr-1.5" /> AI Forecast
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const csv = ["Product,SKU,Stock,Reorder,Value"];
              filteredProducts.forEach(p => csv.push(`${p.name},${p.sku},${p.stock},${p.reorderLevel},${p.stock * p.cost}`));
              const blob = new Blob([csv.join("\\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              toast.success("Inventory exported");
            }}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        }
      >
        <div className="mb-4 text-sm text-muted-foreground flex gap-3 flex-wrap">
          <span className="font-semibold text-foreground">{products.length} SKUs</span> <span>· {lowCount} low</span>
          <span className="text-destructive">· {outCount} out of stock</span>
          {expiringCount > 0 && <span className="text-warning">· {expiringCount} expiring</span>}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">On hand</th>
                <th className="px-4 py-3 text-right">Reorder</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedProducts.map((p) => {
                const low = p.stock <= p.reorderLevel;
                const out = p.stock <= 0;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted overflow-hidden">
                          <img src={p.image} alt="" className="size-full object-cover" />
                        </div>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className={cn("number px-4 py-3 text-right font-semibold", low && "text-destructive")}>
                      {p.stock} {units.find((u) => u.id === p.unit)?.name || p.unit || ""}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.reorderLevel}</td>
                    <td className="number px-4 py-3 text-right">${(p.stock * p.cost).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {isExpired(p.expiryDate) && <Badge variant="destructive">Expired</Badge>}
                        {isExpiringSoon(p.expiryDate) && <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20">Expiring</Badge>}
                        {out ? (
                          <Badge variant="destructive">Out</Badge>
                        ) : low ? (
                          <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20">Low</Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success hover:bg-success/15">In stock</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      </DataPage>

      <Dialog open={showForecast} onOpenChange={setShowForecast}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="size-5 text-primary" /> AI Demand Forecast
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 text-sm">
            <p className="text-muted-foreground">
              Based on sales velocity over the last 30 days, these items are predicted to run out of stock soon.
            </p>
            {forecasts.length === 0 ? (
              <div className="rounded-lg bg-muted p-4 text-center text-muted-foreground">
                No items are at risk of running out in the next 14 days.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {forecasts.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.stock} left · sells {f.dailyVelocity.toFixed(1)}/day
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-bold text-sm", f.daysRemaining <= 3 ? "text-destructive" : "text-warning")}>
                        {f.daysRemaining === 0 ? "Runs out today" : `Runs out in ${f.daysRemaining} days`}
                      </div>
                      <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => { setShowForecast(false); /* Add routing if needed */ }}>
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
