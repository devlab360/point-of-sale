import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/purchases/returns")({
  head: () => ({ meta: [{ title: "Purchase Returns · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Purchase Returns" description="Damaged or excess stock returned to suppliers." primaryAction={{ label: "New Return" }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Refund</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { id: "PR-204", sup: "Sunrise Wholesale Co.", reason: "Damaged on arrival", items: 6, status: "refunded", amt: 142 },
                { id: "PR-203", sup: "Heritage Bakery Supply", reason: "Quality issue", items: 4, status: "pending", amt: 32 },
                { id: "PR-202", sup: "Green Valley Farms", reason: "Excess delivery", items: 12, status: "refunded", amt: 84 },
              ].map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-semibold">{r.sup}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                  <td className="px-4 py-3 text-right">{r.items}</td>
                  <td className="px-4 py-3"><Badge className={r.status === "refunded" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{r.status}</Badge></td>
                  <td className="number px-4 py-3 text-right font-semibold">${r.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  ),
});
