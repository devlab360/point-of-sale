import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3, DollarSign, FileText, Package, Percent, TrendingUp, ShoppingCart, Calendar, ChevronRight,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · Grocer.Pro" }] }),
  component: ReportsPage,
});

const reports = [
  { icon: DollarSign, name: "Sales Report", desc: "Daily, weekly and monthly sales trends" },
  { icon: TrendingUp, name: "Profit Report", desc: "Gross and net margin by category" },
  { icon: ShoppingCart, name: "Purchase Report", desc: "Supplier purchases and outstanding payables" },
  { icon: Package, name: "Inventory Report", desc: "Stock valuation, dead stock, shrinkage" },
  { icon: Percent, name: "Tax Report", desc: "Output, input and net tax payable" },
  { icon: FileText, name: "Expense Report", desc: "Operating costs by category" },
  { icon: Calendar, name: "Daily Report", desc: "End-of-day cashier reconciliation" },
  { icon: BarChart3, name: "Monthly Report", desc: "Period comparison with prior month" },
];

function ReportsPage() {
  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];
  
  // Calculate dynamic stats
  const mtdRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  // Assume a fixed 30% margin for profit calculation for now
  const mtdProfit = mtdRevenue * 0.3;
  const mtdOrders = sales.length;
  const taxPayable = mtdRevenue * 0.08; // 8% average tax assumption
  
  // Generate a basic 12-month chart data
  const monthly = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.toLocaleString('default', { month: 'short' });
    // Find sales for this month
    const monthSales = sales.filter(s => new Date(s.date).getMonth() === d.getMonth());
    const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    return { m, revenue, profit: revenue * 0.3 };
  });

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reports" description="Insights across sales, inventory, tax and operations." actions={<Button size="sm">Export Pack</Button>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MTD Revenue" value={`$${(mtdRevenue / 1000).toFixed(1)}k`} delta={0} icon={DollarSign} accent="primary" />
        <StatCard label="MTD Profit" value={`$${(mtdProfit / 1000).toFixed(1)}k`} delta={0} icon={TrendingUp} accent="success" />
        <StatCard label="MTD Orders" value={mtdOrders.toString()} delta={0} icon={ShoppingCart} accent="info" />
        <StatCard label="Tax Payable" value={`$${taxPayable.toFixed(0)}`} delta={0} icon={Percent} accent="warning" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
          <h2 className="text-base font-semibold">Revenue vs Profit</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-info)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">Orders this year</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <button key={r.name} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-elevated">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{r.name}</h3>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
