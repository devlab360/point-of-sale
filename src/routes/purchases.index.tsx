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
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">{t("po") || "PO"}</th>
                      <th className="px-4 py-3 whitespace-nowrap">{t("supplier") || "Supplier"}</th>
                      <th className="px-4 py-3 whitespace-nowrap">{t("date") || "Date"}</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        {t("items") || "Items"}
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">{t("status") || "Status"}</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        {t("total") || "Total"}
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                          {p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{p.supplier}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{p.items}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            className={cn(
                              p.status === "received" &&
                                "bg-success/10 text-success hover:bg-success/15",
                              p.status === "partial" && "bg-info/10 text-info hover:bg-info/15",
                              p.status === "pending" &&
                                "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                            )}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="number px-4 py-3 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(p.total)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
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
