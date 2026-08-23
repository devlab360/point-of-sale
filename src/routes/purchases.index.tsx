import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { exportToCSV } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersistStore } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { getPurchasesFn } from "@/api/purchases";
import { useCurrency } from "@/lib/currency";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Eye, Plus, ShoppingCart } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/purchases/")({
  head: () => ({ meta: [{ title: "Purchases · NexisPOS" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  // State moved below hooks
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const {
    data: purchasesResponse,
    isLoading: isPurchasesLoading,
    isError: isPurchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ["purchases", orgId, page, pageSize, debouncedQuery, filters.status],
    queryFn: async () =>
      ((await getPurchasesFn({
        data: { page, pageSize, query: debouncedQuery, status: filters.status },
      })) as any) || {},
  });

  const purchases = purchasesResponse?.data || [];
  const totalCount = purchasesResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const [viewPurchase, setViewPurchase] = useState<any | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters]);

  const handleExport = () => {
    exportToCSV(purchases, [
      { key: 'id', label: 'PO ID' },
      { key: 'date', label: 'Date' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'total', label: 'Total' },
      { key: 'status', label: 'Status' }
    ], 'purchases');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("purchases") || "Purchases"}
        description={
          t("managePurchases") || "Inbound inventory from suppliers and purchase orders."
        }
        primaryAction={{
          label: t("newPurchase") || "New Purchase",
          onClick: () => void navigate({ to: "/purchases/new" }),
          icon: Plus,
        }}
        searchPlaceholder={t("searchPurchases") || "Search by PO or supplier..."}
        searchValue={query}
        onSearchChange={setQuery}
        hideToolbar={purchases.length === 0}
        onExport={handleExport}
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
                    { value: "received", label: "Received" },
                    { value: "partial", label: "Partial" },
                    { value: "pending", label: "Pending" },
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
        {isPurchasesLoading ? (
          <TableSkeleton columns={7} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isPurchasesError ? (
          <ErrorState onRetry={refetchPurchases} />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t("noPurchasesFound") || "No purchases found"}
            description={
              query
                ? t("adjustSearch") || "Try adjusting your search."
                : t("noPurchasesYet") || "No purchase orders have been created yet."
            }
            actionLabel="New Purchase"
            onAction={() => void navigate({ to: "/purchases/new" })}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">{t("po") || "PO Number"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("supplier") || "Supplier Name"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("date") || "Order Date"}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">{t("items") || "Items"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("status") || "Status"}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">{t("total") || "Total Cost"}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-bold text-primary whitespace-nowrap cursor-pointer hover:underline" onClick={() => setViewPurchase(p)}>
                          #{p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-5 py-3 font-bold text-foreground whitespace-nowrap">{p.supplier}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">{p.items}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge
                            className={cn(
                              "text-[10px] font-bold",
                              p.status === "received" && "bg-success/12 text-success hover:bg-success/20 border-success/20",
                              p.status === "partial" && "bg-info/12 text-info hover:bg-info/20 border-info/20",
                              p.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20 border-warning/20",
                            )}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="number px-5 py-3 text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(p.total)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            title="View details"
                            onClick={() => setViewPurchase(p)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {purchases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => setViewPurchase(p)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">#{p.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(p.date)}</span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">{p.supplier}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          className={cn(
                            "text-[9px] font-bold py-0",
                            p.status === "received" ? "bg-success/12 text-success" : "bg-warning/15 text-warning-foreground",
                          )}
                        >
                          {p.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{p.items} items</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">{formatCurrency(p.total)}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-semibold text-muted-foreground mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewPurchase(p);
                        }}
                      >
                        <Eye className="size-3 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={purchases.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      {/* Purchase Detail Dialog */}
      <Dialog open={!!viewPurchase} onOpenChange={(open) => !open && setViewPurchase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase #{viewPurchase?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {viewPurchase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>{" "}
                  <strong>{viewPurchase.supplier}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {formatDate(viewPurchase.date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Items:</span> {viewPurchase.items}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant="outline"
                    className={cn(
                      viewPurchase.status === "received" &&
                        "bg-success/10 text-success hover:bg-success/20 border-success/20",
                      viewPurchase.status === "pending" &&
                        "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
                      viewPurchase.status === "cancelled" &&
                        "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
                    )}
                  >
                    {viewPurchase.status}
                  </Badge>
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
