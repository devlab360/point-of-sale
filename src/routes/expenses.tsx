import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/layout/StatCard";
import { expenses } from "@/lib/dummy";
import { Wallet, TrendingDown, Receipt } from "lucide-react";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses · Grocer.Pro" }] }),
  component: () => (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This Month" value="$14,148" delta={-4} icon={Wallet} accent="primary" />
        <StatCard label="Largest Category" value="Salaries" hint="$8,420" icon={Receipt} accent="info" />
        <StatCard label="Pending Approval" value="3" hint="$640 total" icon={TrendingDown} accent="warning" />
      </div>
      <DataPage title="Expenses" description="Track operating costs across all categories." primaryAction={{ label: "Add Expense" }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{e.category}</Badge></td>
                  <td className="px-4 py-3 font-semibold">{e.description}</td>
                  <td className="px-4 py-3"><Badge className={e.status === "paid" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{e.status}</Badge></td>
                  <td className="number px-4 py-3 text-right font-semibold">${e.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  ),
});
