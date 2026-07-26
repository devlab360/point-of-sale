import { createLazyFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { History } from "lucide-react";

export const Route = createLazyFileRoute("/inventory/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const rawMovements = useLiveQuery(() => localDb.inventoryMovements.reverse().toArray()) || [];
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const totalPages = Math.ceil(rawMovements.length / itemsPerPage);
  const movements = rawMovements.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Complete audit trail of all stock changes across the store.</p>
      </div>
      {rawMovements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No stock history yet"
          description="Stock changes will appear here after purchases, sales, and adjustments."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m, i) => (
                  <tr key={m.id || i} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{m.productName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{m.action.replace('_', ' ')}</Badge>
                    </td>
                    <td className={cn("number px-4 py-3 text-right font-semibold", m.quantity < 0 ? "text-destructive" : "text-success")}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
