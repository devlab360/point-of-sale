import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PersistStore } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { getProductsFn } from "@/api/products";
import { getSalesFn } from "@/api/sales";
import { getUnitsFn } from "@/api/units";
import { cn } from "@/lib/utils";
import { Download, Filter, Brain, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV } from "@/lib/csv";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/lib/currency";

export const Route = createLazyFileRoute("/inventory/")({
  component: StockList,
});

function StockList() {
  const router = useRouter();
  const orgId = PersistStore.getOrgId() || "default";

  const { data: productsResponse } = useQuery({
    queryKey: ["products", orgId, "inventory"],
    queryFn: async () => ((await getProductsFn({ data: { page: 1, pageSize: 10 } })) as any) || {},
  });
  const products = productsResponse?.data || [];
  const inventorySummary = productsResponse?.summary || null;

  const { data: salesData } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => ((await getSalesFn({ data: {} })) as any)?.data || [],
  });
  const sales = salesData || [];

  const { data: unitsData } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => ((await getUnitsFn({ data: {} })) as any)?.data || [],
  });
  const units = unitsData || [];
  const lowCount = products.filter((p) => Number(p.stock) <= Number(p.reorderLevel)).length;
  const outCount = products.filter((p) => p.stock <= 0).length;

  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
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
    const recentSales = sales.filter((s) => new Date(s.date) >= thirtyDaysAgo);

    const salesMap: Record<string, number> = {};
    recentSales.forEach((sale) => {
      sale.saleItems?.forEach((item) => {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + Number(item.quantity || 1);
      });
    });

    return products
      .map((p) => {
        const qtySold30d = salesMap[p.id] || 0;
        const dailyVelocity = qtySold30d / 30;
        const daysRemaining = dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : 999;
        return { ...p, dailyVelocity, daysRemaining };
      })
      .filter((p) => p.daysRemaining <= 14)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [sales, products, showForecast]);

  const isExpired = (date?: string) => (date ? new Date(date) < new Date() : false);
  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff > 0 && diff <= 30;
  };

  const filteredProducts = useMemo(() => {
    let list = products;

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower),
      );
    }

    if (filters.status === "in-stock") {
      list = list.filter((p) => Number(p.stock) > Number(p.reorderLevel));
    } else if (filters.status === "low") {
      list = list.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.reorderLevel));
    } else if (filters.status === "out") {
      list = list.filter((p) => p.stock <= 0);
    } else if (filters.status === "expiring") {
      list = list.filter((p) => isExpiringSoon(p.expiryDate) || isExpired(p.expiryDate));
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

  const expiringCount = products.filter(
    (p) => isExpiringSoon(p.expiryDate) || isExpired(p.expiryDate),
  ).length;

  return (
    <div>
      <DataPage
        title="Stock Inventory"
        description="Monitor your current stock levels and AI forecasts."
        searchPlaceholder="Search inventory by name or SKU..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        onExport={() => {
          const exportData = filteredProducts.map((p) => ({
            name: p.name,
            sku: p.sku,
            stock: p.stock,
            reorderLevel: p.reorderLevel,
            value: p.stock * p.cost,
          }));
          exportToCSV(
            exportData,
            [
              { key: "name", label: "Product" },
              { key: "sku", label: "SKU" },
              { key: "stock", label: "Stock" },
              { key: "reorderLevel", label: "Reorder" },
              { key: "value", label: "Value" },
            ],
            "inventory",
          );
        }}
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
        toolbar={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20"
              onClick={() => setShowForecast(true)}
            >
              <Brain className="size-4 mr-1.5" /> AI Forecast
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between card-interactive">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Stock Count
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {inventorySummary?.totalStock || 0}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">units</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {products.length} catalog SKUs
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between card-interactive">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Inventory Value (Cost)
            </p>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
              {formatCurrency(inventorySummary?.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Cost valuation invested
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between card-interactive">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Retail Valuation
            </p>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-primary">
              {formatCurrency(inventorySummary?.totalRetailValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Expected sales revenue</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between card-interactive">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Stock Alerts
            </p>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-destructive">
              {inventorySummary?.lowStockCount || lowCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex gap-2 font-medium">
              <span>{outCount} out</span>
              {expiringCount > 0 && <span>· {expiringCount} expiring</span>}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          {/* Desktop Table (>= 768px) */}
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock on Hand</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead>Health Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <EmptyState
                        icon={PackageSearch}
                        title="No inventory records"
                        description={
                          search || filters.status
                            ? "Try adjusting your search or active filters."
                            : "You don't have any products in your inventory yet."
                        }
                        actionLabel="Add Product"
                        onAction={() => router.navigate({ to: "/products" })}
                        className="border-none bg-transparent my-0 py-8 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((p) => {
                    const low = Number(p.stock) <= Number(p.reorderLevel);
                    const out = p.stock <= 0;
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => router.navigate({ to: "/products", search: { edit: p.id } })}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                              {p.image ? (
                                <img src={p.image} alt="" className="size-full object-cover" />
                              ) : (
                                <PackageSearch className="size-5 text-muted-foreground/50" />
                              )}
                            </div>
                            <span className="font-bold text-foreground hover:text-primary transition-colors">
                              {p.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {p.sku}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "number text-right font-bold whitespace-nowrap text-sm",
                            low ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {p.stock}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {units.find((u) => u.id === p.unit)?.name || p.unit || "units"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground whitespace-nowrap font-medium text-xs">
                          {p.reorderLevel}
                        </TableCell>
                        <TableCell className="number text-right whitespace-nowrap font-bold text-foreground">
                          {formatCurrency(p.stock * p.cost)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            {isExpired(p.expiryDate) && (
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                Expired
                              </Badge>
                            )}
                            {isExpiringSoon(p.expiryDate) && (
                              <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20 text-[10px] font-bold">
                                Expiring
                              </Badge>
                            )}
                            {out ? (
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                Out of stock
                              </Badge>
                            ) : low ? (
                              <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20 text-[10px] font-bold">
                                Low stock
                              </Badge>
                            ) : (
                              <Badge className="bg-success/12 text-success hover:bg-success/20 border-success/20 text-[10px] font-bold">
                                Healthy
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Feed (< 768px) */}
          <div className="table-mobile-cards p-3 space-y-2.5">
            {paginatedProducts.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="No inventory records"
                description={
                  search || filters.status
                    ? "Try adjusting your search or active filters."
                    : "You don't have any products in your inventory yet."
                }
                actionLabel="Add Product"
                onAction={() => router.navigate({ to: "/products" })}
                className="border-none bg-transparent my-0 py-6 shadow-none"
              />
            ) : (
              paginatedProducts.map((p) => {
                const low = Number(p.stock) <= Number(p.reorderLevel);
                const out = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => router.navigate({ to: "/products", search: { edit: p.id } })}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                        {p.image ? (
                          <img src={p.image} alt="" className="size-full object-cover" />
                        ) : (
                          <PackageSearch className="size-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {p.name}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {out ? (
                            <span className="text-[9px] font-black text-destructive bg-destructive/10 px-1.5 py-0.2 rounded-md">
                              Out of stock
                            </span>
                          ) : low ? (
                            <span className="text-[9px] font-extrabold text-destructive bg-destructive/10 px-1.5 py-0.2 rounded-md">
                              {p.stock} left (Reorder: {p.reorderLevel})
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.2 rounded-md">
                              {p.stock} in stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-xs font-bold text-foreground">
                        {formatCurrency(p.stock * p.cost)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Valuation</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredProducts.length > 0 && (
            <div className="border-t border-border/60 p-2 sm:p-3">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                totalItems={filteredProducts.length}
              />
            </div>
          )}
        </div>
      </DataPage>

      <Dialog open={showForecast} onOpenChange={setShowForecast}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Brain className="size-5 text-primary" /> AI Inventory Run-out Forecast
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-xs text-muted-foreground">
              Based on historical sales velocity over the last 30 days, these items are projected to
              run out soon.
            </p>
            {forecasts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No immediate stockout risks detected within the next 14 days!
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-muted/20 overflow-hidden">
                {forecasts.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-foreground">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Velocity: {f.dailyVelocity.toFixed(1)} units/day · Stock: {f.stock}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge
                        variant={f.daysRemaining <= 3 ? "destructive" : "outline"}
                        className={cn(f.daysRemaining <= 3 ? "text-destructive" : "text-warning")}
                      >
                        {f.daysRemaining === 0
                          ? "Runs out today"
                          : `Runs out in ${f.daysRemaining} days`}
                      </Badge>
                      <Button
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          setShowForecast(false);
                        }}
                      >
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
