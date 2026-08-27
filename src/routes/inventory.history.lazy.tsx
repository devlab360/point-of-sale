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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="page-container space-y-5">
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
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            {/* Desktop Table */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Product SKU</TableHead>
                    <TableHead>Inventory Event</TableHead>
                    <TableHead className="text-right">Quantity Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <EmptyState
                          icon={History}
                          title="No stock history yet"
                          description={
                            search
                              ? "Try adjusting your search."
                              : "Stock changes will appear here after purchases, sales, and adjustments."
                          }
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((m, i) => (
                      <TableRow key={m.id || i}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground min-w-[150px]">
                          {m.productName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="capitalize text-[10px] font-bold bg-muted/50 border-border/80"
                          >
                            {m.action.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "number text-right font-black whitespace-nowrap text-sm",
                            m.quantity < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Feed (< 768px) */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {movements.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No stock history yet"
                  description={
                    search
                      ? "Try adjusting your search."
                      : "Stock changes will appear here after purchases, sales, and adjustments."
                  }
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                movements.map((m, i) => (
                  <div
                    key={m.id || i}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5">
                        {m.productName}
                      </div>
                      <Badge
                        variant="outline"
                        className="capitalize text-[9px] font-bold mt-1 bg-muted/50"
                      >
                        {m.action.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div
                        className={cn(
                          "number text-sm font-black",
                          m.quantity < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">
                        delta
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredMovements.length > 0 && (
              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredMovements.length}
                />
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
