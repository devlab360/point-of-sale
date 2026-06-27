import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/sales/returns")({
  head: () => ({ meta: [{ title: "Sales Returns · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Sales Returns" description="Refunds and exchanges issued to customers." primaryAction={{ label: "Process Return" }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Refund</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { ref: "SR-1042", inv: "INV-98415", cust: "Sarah Jenkins", reason: "Wrong item", status: "refunded", amt: 24.5 },
                { ref: "SR-1041", inv: "INV-98410", cust: "Marcus Aurelius", reason: "Damaged item", status: "refunded", amt: 12 },
                { ref: "SR-1040", inv: "INV-98402", cust: "Walk-in", reason: "Customer changed mind", status: "pending", amt: 8.99 },
              ].map((r) => (
                <tr key={r.ref} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.inv}</td>
                  <td className="px-4 py-3 font-semibold">{r.cust}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                  <td className="px-4 py-3"><Badge className={r.status === "refunded" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{r.status}</Badge></td>
                  <td className="number px-4 py-3 text-right font-semibold">${r.amt.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  ),
});
