import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { recentSales } from "@/lib/dummy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Sales History" description="Every transaction across all your registers." primaryAction={{ label: "New Sale" }} searchPlaceholder="Search by invoice or customer...">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentSales.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-3 font-semibold">{s.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{s.items}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.payment}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        s.status === "completed" && "bg-success/10 text-success hover:bg-success/15",
                        s.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                        s.status === "refunded" && "bg-muted text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="number px-4 py-3 text-right font-semibold">${s.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  ),
});
