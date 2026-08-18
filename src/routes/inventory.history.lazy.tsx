import { createLazyFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { PersistStore } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { getInventoryMovementsFn } from "@/api/inventory";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { History, Search } from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useDebounce } from "@/hooks/useDebounce";

export const Route = createLazyFileRoute("/inventory/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";
  const { data: movementsData } = useQuery({
    queryKey: ["inventoryMovements", orgId],
    queryFn: async () => ((await getInventoryMovementsFn({ data: {} })) as any)?.data || [],
  });
  const rawMovements = movementsData || [];
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredMovements = useMemo(() => {
    return rawMovements.filter((m) =>
      m.productName.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [rawMovements, debouncedSearch]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const movements = filteredMovements.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
            Stock History
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Complete audit trail of all stock changes across the store.
          </p>
        </div>
      </div>
      {rawMovements.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search movements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      )}
      {filteredMovements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No stock history yet"
          description={
            search
              ? "Try adjusting your search."
              : "Stock changes will appear here after purchases, sales, and adjustments."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Date &amp; Time</th>
                      <th className="px-4 py-3 whitespace-nowrap">Product</th>
                      <th className="px-4 py-3 whitespace-nowrap">Action</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold min-w-[150px]">{m.productName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="capitalize">
                            {m.action.replace("_", " ")}
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            "number px-4 py-3 text-right font-semibold whitespace-nowrap",
                            m.quantity < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
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
                totalItems={filteredMovements.length}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
