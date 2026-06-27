import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases · Grocer.Pro" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const purchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Purchases"
        description="Inbound stock from your suppliers and wholesalers."
        primaryAction={{ label: "New Purchase" }}
      >
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 font-semibold">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">{p.items}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.status === "received"
                          ? "bg-success/10 text-success hover:bg-success/15"
                          : p.status === "partial"
                            ? "bg-info/10 text-info hover:bg-info/15"
                            : "bg-warning/15 text-warning-foreground hover:bg-warning/20"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="number px-4 py-3 text-right font-semibold">${p.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
