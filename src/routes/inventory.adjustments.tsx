import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/inventory/adjustments")({
  component: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manual stock changes from audits, damage, or shrinkage.</p>
        <Button size="sm">New Adjustment</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Net change</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { ref: "ADJ-1042", reason: "Damage in transit", items: 4, net: -12, status: "approved" },
              { ref: "ADJ-1041", reason: "Stock count audit", items: 28, net: 4, status: "approved" },
              { ref: "ADJ-1040", reason: "Expired produce", items: 8, net: -24, status: "approved" },
              { ref: "ADJ-1039", reason: "Display sample", items: 2, net: -2, status: "pending" },
              { ref: "ADJ-1038", reason: "Recovery from back room", items: 6, net: 18, status: "approved" },
            ].map((r) => (
              <tr key={r.ref} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-3 text-muted-foreground">Jun 2{Math.floor(Math.random() * 9)}, 2026</td>
                <td className="px-4 py-3">{r.reason}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.items}</td>
                <td className={`number px-4 py-3 text-right font-semibold ${r.net < 0 ? "text-destructive" : "text-success"}`}>
                  {r.net > 0 ? "+" : ""}{r.net}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      r.status === "approved"
                        ? "bg-success/10 text-success hover:bg-success/15"
                        : "bg-warning/15 text-warning-foreground hover:bg-warning/20"
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
});
