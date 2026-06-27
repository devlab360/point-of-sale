import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export const Route = createFileRoute("/inventory/history")({
  component: InventoryHistory,
});

function InventoryHistory() {
  const movements = useLiveQuery(() => localDb.inventoryMovements.reverse().toArray()) || [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <ul className="divide-y divide-border">
        {movements.map((r) => (
          <li key={r.id} className="flex items-center gap-4 py-3">
            <div
              className={`grid size-9 place-items-center rounded-lg ${r.quantity > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
            >
              {r.quantity > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{r.productName}</div>
              <div className="text-xs text-muted-foreground">{r.action}</div>
            </div>
            <div className={`number font-semibold ${r.quantity > 0 ? "text-success" : "text-destructive"}`}>
              {r.quantity > 0 ? "+" : ""}
              {r.quantity}
            </div>
            <div className="w-32 text-right text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
        {movements.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No inventory history yet</div>
        )}
      </ul>
    </div>
  );
}
