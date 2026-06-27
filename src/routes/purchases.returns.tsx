import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/purchases/returns")({
  head: () => ({ meta: [{ title: "Purchase Returns · Grocer.Pro" }] }),
  component: PurchaseReturns,
});

function PurchaseReturns() {
  const returns = useLiveQuery(() => localDb.purchases.filter(p => p.status === "refunded").toArray()) || [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Purchase Returns" 
        description="Damaged or excess stock returned to suppliers." 
        primaryAction={{ label: "New Return", onClick: () => toast.info("Returns processing requires backend API") }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No purchase returns recorded.</td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-semibold">{r.supplier}</td>
                    <td className="px-4 py-3 text-right">{r.items}</td>
                    <td className="px-4 py-3"><Badge className="bg-success/10 text-success hover:bg-success/15">{r.status}</Badge></td>
                    <td className="number px-4 py-3 text-right font-semibold">${r.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
