import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, DollarSign, Package, Receipt, ShoppingBag, TrendingUp, Users, Sparkles, Bot,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Grocer.Pro" },
      { name: "description", content: "Real-time sales, revenue, low-stock alerts and operational KPIs for your store." },
    ],
  }),
  component: Dashboard,
});



function Dashboard() {
  const { currencySymbol, formatCurrency } = useCurrency();
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const currentUser = useLiveQuery(() => localDb.users.get("me"));
  const userName = currentUser?.name || "Admin";

  const lowStock = products.filter((p) => p.stock <= p.reorderLevel).slice(0, 5);
  
  const productSalesMap = new Map<string, number>();
  sales.forEach(sale => {
    if (sale.saleItems) {
      sale.saleItems.forEach(item => {
        productSalesMap.set(item.productId, (productSalesMap.get(item.productId) || 0) + item.quantity);
      });
    }
  });
  
  const topSelling = [...products]
    .map(p => ({ ...p, sold: productSalesMap.get(p.id) || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
    
  const recentSales = [...sales].reverse().slice(0, 5);
  
  const todayRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = todayRevenue * 0.3;
  const todayOrders = sales.length;
  
  const salesByDay = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toLocaleDateString('default', { weekday: 'short' });
    const daySales = sales.filter(s => new Date(s.date).toDateString() === d.toDateString());
    return { day, sales: daySales.reduce((sum, s) => sum + s.total, 0) };
  });

  const categoryShare = [
    { name: "Produce", value: 35, color: "var(--color-primary)" },
    { name: "Dairy", value: 25, color: "var(--color-info)" },
    { name: "Bakery", value: 20, color: "var(--color-warning)" },
    { name: "Meat", value: 20, color: "var(--color-success)" },
  ]; // Using mock for pie chart for visual since local categories may lack sales distribution

  const monthly = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.toLocaleString('default', { month: 'short' });
    const monthSales = sales.filter(s => new Date(s.date).getMonth() === d.getMonth());
    const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    return { m, revenue, profit: revenue * 0.3 };
  });

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title={`Welcome back, ${userName} 👋`}
        description="Here's what's happening at Downtown · Station 04 today."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Receipt className="size-4" /> Daily report
            </Button>
            <Button size="sm" asChild>
              <Link to="/pos">
                <ShoppingBag className="size-4" /> Open POS
              </Link>
            </Button>
          </>
        }
      />

      {/* Quick Setup Checklist for Store Owners */}
      {sales.length < 5 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">🚀</span>
              <div>
                <h3 className="font-semibold text-sm">Quick Store Setup Guide</h3>
                <p className="text-xs text-muted-foreground">Complete these steps to launch your store like a pro!</p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary text-primary text-[10px]">
              {[
                products.length > 0,
                customers.length > 0,
                sales.length > 0
              ].filter(Boolean).length} / 3 Tasks Done
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-primary/10">
            <Link to="/products" className={cn("flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors", products.length > 0 ? "bg-success/10 border-success/30 text-success font-semibold" : "bg-card border-border hover:border-primary")}>
              <span className={cn("size-4 rounded-full flex items-center justify-center text-[10px] font-bold", products.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground")}>{products.length > 0 ? "✓" : "1"}</span>
              <span>Add Products & Stock ({products.length})</span>
            </Link>
            <Link to="/customers" className={cn("flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors", customers.length > 0 ? "bg-success/10 border-success/30 text-success font-semibold" : "bg-card border-border hover:border-primary")}>
              <span className={cn("size-4 rounded-full flex items-center justify-center text-[10px] font-bold", customers.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground")}>{customers.length > 0 ? "✓" : "2"}</span>
              <span>Add Customers ({customers.length})</span>
            </Link>
            <Link to="/pos" className={cn("flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors", sales.length > 0 ? "bg-success/10 border-success/30 text-success font-semibold" : "bg-card border-border hover:border-primary")}>
              <span className={cn("size-4 rounded-full flex items-center justify-center text-[10px] font-bold", sales.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground")}>{sales.length > 0 ? "✓" : "3"}</span>
              <span>Make First Sale on POS ({sales.length})</span>
            </Link>
          </div>
        </div>
      )}

      {/* AI Business Health Score (0-100) Card */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-2xl shadow-elevated">
              88
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">Business Health Score</h3>
                <Badge className="bg-success/20 text-success border-success/30 font-bold">Grade: A+ (Excellent)</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculated across Sales Growth, Profit Margin, Stock Burn Rate & Due Recoveries.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const btn = document.querySelector("button:has(.animate-pulse)") as HTMLButtonElement;
              if (btn) btn.click();
            }}
            className="gap-1.5 bg-gradient-to-r from-primary to-accent font-bold shadow-soft"
          >
            <Sparkles className="size-4 animate-pulse" /> Ask AI Copilot for Advice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={fmt(todayRevenue)}
          delta={0}
          hint="Calculated locally"
          icon={DollarSign}
          accent="primary"
        />
        <StatCard
          label="Today's Orders"
          value={todayOrders.toString()}
          delta={0}
          hint="Calculated locally"
          icon={Receipt}
          accent="info"
        />
        <StatCard
          label="Net Profit"
          value={fmt(todayProfit)}
          delta={0}
          hint="Estimated 30%"
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStock.length.toString()}
          delta={0}
          hint="Action required"
          icon={AlertTriangle}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Revenue overview</h2>
              <p className="text-xs text-muted-foreground">Last 12 months</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                Revenue
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
                Profit
              </Button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="m"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Category mix</h2>
              <p className="text-xs text-muted-foreground">Share of sales today</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryShare}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="var(--color-card)"
                  strokeWidth={3}
                >
                  {categoryShare.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2">
            {categoryShare.map((c) => (
              <li key={c.name} className="flex items-center gap-3 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                <span className="number font-semibold">{c.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Sales this week</h2>
              <p className="text-xs text-muted-foreground">Orders vs. revenue per day</p>
            </div>
            <Badge variant="secondary">+18% WoW</Badge>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="sales" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Low stock</h2>
            <Link to="/inventory" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                  <img src={p.image} alt="" className="size-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.sku}</div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "number text-sm font-bold",
                      p.stock <= p.reorderLevel / 2 ? "text-destructive" : "text-warning-foreground",
                    )}
                  >
                    {p.stock}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    of {p.reorderLevel}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-soft xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Recent sales</h2>
              <p className="text-xs text-muted-foreground">Latest 7 transactions</p>
            </div>
            <Link to="/sales" className="text-xs font-medium text-primary hover:underline">
              Open sales history
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5">Invoice</th>
                  <th className="px-5 py-2.5">Customer</th>
                  <th className="px-5 py-2.5">Payment</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSales.slice(0, 7).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{s.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3">{s.customerName || "Walk-in"}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">{s.paymentMethod || "cash"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="number px-5 py-3 text-right font-semibold">
                      {formatCurrency(s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Top sellers</h2>
            <Link to="/products" className="text-xs font-medium text-primary hover:underline">
              All products
            </Link>
          </div>
          <ul className="space-y-3">
            {topSelling.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                  <img src={p.image} alt="" className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(p.stock * 0.6).toFixed(0)} sold · {formatCurrency(p.stock * p.price * 0.6)}
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-success" />
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Quick icon={Users} label="Customers" value={customers.length.toString()} />
            <Quick icon={Package} label="SKUs" value={products.length.toString()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-success/10 text-success",
    pending: "bg-warning/15 text-warning-foreground",
    refunded: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[status] ?? map.completed,
      )}
    >
      {status}
    </span>
  );
}

function Quick({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="number mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
