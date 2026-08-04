import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  Package,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Users,
  Sparkles,
  Bot,
  Printer,
  ArrowRight,
  BarChart3,
  Calendar,
  Receipt,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { getProductsFn } from "@/api/products";
import { getSalesFn } from "@/api/sales";
import { getCustomersFn } from "@/api/customers";
import { getExpensesFn } from "@/api/expenses";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Grocer.Pro" },
      {
        name: "description",
        content: "Real-time sales, revenue, low-stock alerts and operational KPIs for your store.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { currencySymbol, formatCurrency } = useCurrency();
  const { user, saasPlan, saasOrg } = useAuth();
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [chartView, setChartView] = useState<"revenue" | "profit">("revenue");
  const isSuperAdminUser = user?.email?.toLowerCase().includes("superadmin");
  const canAccessPos =
    !isSuperAdminUser &&
    (!saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("/pos"));
  const canAccessReports =
    !isSuperAdminUser &&
    (!saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("/reports"));
  const fmt = (n: number | string) =>
    `${currencySymbol}${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const orgId = PersistStore.getOrgId() || "default";

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: { pageSize: 1000 } })) as any)?.data || [],
  });
  const products = productsData || [];

  const {
    data: salesData,
    isLoading: isSalesLoading,
    isError: isSalesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => ((await getSalesFn({ data: { pageSize: 500 } })) as any)?.data || [],
  });
  const sales = salesData || [];

  const {
    data: customersData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => ((await getExpensesFn({ data: {} })) as any)?.data || [],
  });
  const expenses = expensesData || [];

  const isLoading = isProductsLoading || isSalesLoading || isCustomersLoading || isExpensesLoading;
  const isError = isProductsError || isSalesError || isCustomersError || isExpensesError;

  const handleRefetchAll = () => {
    refetchProducts();
    refetchSales();
    refetchCustomers();
    refetchExpenses();
  };

  const userName = user?.name || "Admin";

  const healthAnalysis = useMemo(() => {
    const totalSalesRev = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    let totalCogs = 0;
    sales.forEach((s) => {
      s.saleItems?.forEach((i) => {
        const prod = products.find((p) => p.id === i.productId);
        if (prod) totalCogs += (prod.cost || 0) * i.quantity;
      });
    });
    const netProfit = totalSalesRev - totalCogs - totalExp;
    const profitMargin = totalSalesRev > 0 ? (netProfit / totalSalesRev) * 100 : 0;

    // Dead Stock Calculation
    const soldProductIds = new Set(
      sales.flatMap((s) => s.saleItems?.map((i) => i.productId) || []),
    );
    const deadStockItems = products.filter((p) => (p.stock || 0) > 0 && !soldProductIds.has(p.id));
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.cost || 0), 0);
    const deadStockValue = deadStockItems.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.cost || 0),
      0,
    );

    // Due Collection Health
    const totalDue = customers.reduce((sum, c) => sum + (c.credit || 0), 0);
    const overDueRatio = totalSalesRev > 0 ? (totalDue / totalSalesRev) * 100 : 0;

    // Score Calculation out of 100
    let score = products.length > 0 || sales.length > 0 ? 50 : 30;
    if (sales.length >= 5) score += 15;
    else if (sales.length > 0) score += 10;

    if (netProfit > 0) score += 10;
    if (profitMargin >= 15) score += 10;
    else if (profitMargin > 0) score += 5;

    if (totalStockValue > 0 && deadStockValue < totalStockValue * 0.25) score += 10;
    if (overDueRatio < 30) score += 5;

    score = Math.min(100, Math.max(0, Math.round(score)));

    let grade = "Grade: A+ (Excellent)";
    let badgeClass = "bg-success/20 text-success border-success/30 font-bold";

    if (score >= 85) {
      grade = "Grade: A+ (Excellent)";
      badgeClass = "bg-success/20 text-success border-success/30 font-bold";
    } else if (score >= 70) {
      grade = "Grade: A (Strong)";
      badgeClass =
        "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 font-bold dark:text-emerald-400";
    } else if (score >= 55) {
      grade = "Grade: B (Average)";
      badgeClass = "bg-info/20 text-info border-info/30 font-bold";
    } else if (score >= 40) {
      grade = "Grade: C (Needs Attention)";
      badgeClass = "bg-warning/20 text-warning-foreground border-warning/30 font-bold";
    } else {
      grade = "Grade: D (Critical)";
      badgeClass = "bg-destructive/20 text-destructive border-destructive/30 font-bold";
    }

    return { score, grade, badgeClass };
  }, [sales, products, customers, expenses]);

  const lowStock = products.filter((p) => p.stock <= p.reorderLevel).slice(0, 5);

  const productSalesMap = new Map<string, number>();
  sales.forEach((sale) => {
    if (sale.saleItems) {
      sale.saleItems.forEach((item) => {
        productSalesMap.set(
          item.productId,
          (productSalesMap.get(item.productId) || 0) + item.quantity,
        );
      });
    }
  });

  const topSelling = [...products]
    .map((p) => ({ ...p, sold: productSalesMap.get(p.id) || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const recentSales = [...sales].reverse().slice(0, 5);

  const todayDateStr = new Date().toDateString();
  const todaySales = sales.filter(
    (s: any) => s.date && new Date(s.date).toDateString() === todayDateStr,
  );
  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
  const todayOrders = todaySales.length;

  let todayProfit = 0;
  todaySales.forEach((s: any) => {
    let cogs = 0;
    if (Array.isArray(s.saleItems)) {
      s.saleItems.forEach((i: any) => {
        const prod = products.find((p: any) => p.id === i.productId);
        if (prod) cogs += (Number(prod.cost) || 0) * (i.quantity || 1);
      });
    }
    const saleTotal = Number(s.total) || 0;
    const saleSubtotal = Number(s.subtotal) || saleTotal;
    const profit = cogs > 0 ? saleSubtotal - cogs : saleTotal * 0.25;
    todayProfit += Math.max(0, profit);
  });

  const displayRevenue = todayRevenue;
  const displayOrders = todayOrders;
  const displayProfit = todayProfit;

  // Day-over-Day (DoD) Calculations
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateStr = yesterdayDate.toDateString();

  const yesterdaySales = sales.filter(
    (s: any) => s.date && new Date(s.date).toDateString() === yesterdayDateStr,
  );
  const yesterdayRevenue = yesterdaySales.reduce(
    (sum: number, s: any) => sum + (Number(s.total) || 0),
    0,
  );
  const yesterdayOrders = yesterdaySales.length;

  let yesterdayProfit = 0;
  yesterdaySales.forEach((s: any) => {
    let cogs = 0;
    if (Array.isArray(s.saleItems)) {
      s.saleItems.forEach((i: any) => {
        const prod = products.find((p: any) => p.id === i.productId);
        if (prod) cogs += (Number(prod.cost) || 0) * (i.quantity || 1);
      });
    }
    const saleTotal = Number(s.total) || 0;
    const saleSubtotal = Number(s.subtotal) || saleTotal;
    const profit = cogs > 0 ? saleSubtotal - cogs : saleTotal * 0.25;
    yesterdayProfit += Math.max(0, profit);
  });

  const calculateDelta = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const revenueDelta = calculateDelta(displayRevenue, yesterdayRevenue);
  const ordersDelta = calculateDelta(displayOrders, yesterdayOrders);
  const profitDelta = calculateDelta(displayProfit, yesterdayProfit);

  const salesByDay = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toLocaleDateString("default", { weekday: "short" });
    const daySales = sales.filter(
      (s: any) => s.date && new Date(s.date).toDateString() === d.toDateString(),
    );
    return {
      day,
      sales: daySales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0),
    };
  });

  const categoryTotalsMap = new Map<string, number>();
  sales.forEach((s: any) => {
    if (Array.isArray(s.saleItems)) {
      s.saleItems.forEach((i: any) => {
        const prod = products.find((p: any) => p.id === i.productId);
        const cat = prod?.category || "General";
        const itemTotal = Number(i.total) || (Number(i.price) || 0) * (i.quantity || 1);
        categoryTotalsMap.set(cat, (categoryTotalsMap.get(cat) || 0) + itemTotal);
      });
    }
  });

  const totalCategoryRev = Array.from(categoryTotalsMap.values()).reduce((a, b) => a + b, 0);
  const colors = [
    "var(--color-primary)",
    "var(--color-info)",
    "var(--color-warning)",
    "var(--color-success)",
    "var(--color-accent)",
  ];

  const categoryShare =
    categoryTotalsMap.size > 0
      ? Array.from(categoryTotalsMap.entries()).map(([name, val], i) => ({
          name,
          value: totalCategoryRev > 0 ? Math.round((val / totalCategoryRev) * 100) : 0,
          color: colors[i % colors.length],
        }))
      : [{ name: "General Catalog", value: 100, color: "var(--color-primary)" }];

  const monthly = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.toLocaleString("default", { month: "short" });
    const monthSales = sales.filter(
      (s: any) =>
        s.date &&
        new Date(s.date).getMonth() === d.getMonth() &&
        new Date(s.date).getFullYear() === d.getFullYear(),
    );
    const revenue = monthSales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);

    let monthCogs = 0;
    monthSales.forEach((s: any) => {
      if (Array.isArray(s.saleItems)) {
        s.saleItems.forEach((item: any) => {
          const prod = products.find((p: any) => p.id === item.productId);
          if (prod) monthCogs += (Number(prod.cost) || 0) * (item.quantity || 1);
        });
      }
    });
    const profit = monthCogs > 0 ? Math.max(0, revenue - monthCogs) : revenue * 0.25;
    return { m, revenue, profit };
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError && !products.length && !sales.length) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <ErrorState onRetry={handleRefetchAll} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title={`Welcome back, ${userName} 👋`}
        description={`Here's what's happening at ${saasOrg?.name || "your store"} today.`}
        actions={
          <>
            {canAccessReports && (
              <Button variant="outline" size="sm" onClick={() => setIsDailyReportOpen(true)}>
                <Receipt className="size-4" /> Daily report
              </Button>
            )}
            {canAccessPos && (
              <Button size="sm" asChild>
                <Link to="/pos">
                  <ShoppingBag className="size-4" /> Open POS
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* Quick Setup Checklist for Store Owners */}
      {sales.length < 5 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                🚀
              </span>
              <div>
                <h3 className="font-semibold text-sm">Quick Store Setup Guide</h3>
                <p className="text-xs text-muted-foreground">
                  Complete these steps to launch your store like a pro!
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary text-primary text-[10px]">
              {[products.length > 0, customers.length > 0, sales.length > 0].filter(Boolean).length}{" "}
              / 3 Tasks Done
            </Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-primary/10">
            <Link
              to="/products"
              className={cn(
                "flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors",
                products.length > 0
                  ? "bg-success/10 border-success/30 text-success font-semibold"
                  : "bg-card border-border hover:border-primary",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  products.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {products.length > 0 ? "✓" : "1"}
              </span>
              <span>Add Products & Stock ({products.length})</span>
            </Link>
            <Link
              to="/customers"
              className={cn(
                "flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors",
                customers.length > 0
                  ? "bg-success/10 border-success/30 text-success font-semibold"
                  : "bg-card border-border hover:border-primary",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  customers.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {customers.length > 0 ? "✓" : "2"}
              </span>
              <span>Add Customers ({customers.length})</span>
            </Link>
            <Link
              to="/pos"
              className={cn(
                "flex items-center gap-2 rounded-lg p-2.5 text-xs border transition-colors",
                sales.length > 0
                  ? "bg-success/10 border-success/30 text-success font-semibold"
                  : "bg-card border-border hover:border-primary",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  sales.length > 0 ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {sales.length > 0 ? "✓" : "3"}
              </span>
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
              {healthAnalysis.score}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">Business Health Score</h3>
                <Badge className={healthAnalysis.badgeClass}>{healthAnalysis.grade}</Badge>
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
          value={fmt(displayRevenue)}
          delta={revenueDelta}
          hint="vs yesterday"
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Today's Orders"
          value={displayOrders.toString()}
          delta={ordersDelta}
          hint="vs yesterday"
          icon={ShoppingCart}
          accent="info"
        />
        <StatCard
          label="Net Profit"
          value={fmt(displayProfit)}
          delta={profitDelta}
          hint="vs yesterday"
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStock.length.toString()}
          hint={lowStock.length > 0 ? "Action required" : "Stock is healthy"}
          icon={AlertTriangle}
          accent={lowStock.length > 0 ? "warning" : "success"}
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
              <Button
                variant={chartView === "revenue" ? "outline" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setChartView("revenue")}
              >
                Revenue
              </Button>
              <Button
                variant={chartView === "profit" ? "outline" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setChartView("profit")}
              >
                Profit
              </Button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={
                        chartView === "revenue" ? "var(--color-primary)" : "var(--color-success)"
                      }
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        chartView === "revenue" ? "var(--color-primary)" : "var(--color-success)"
                      }
                      stopOpacity={0}
                    />
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
                  dataKey={chartView}
                  stroke={chartView === "revenue" ? "var(--color-primary)" : "var(--color-success)"}
                  strokeWidth={2.5}
                  fill="url(#chartGradient)"
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
            {/* Real WoW calculation using last 7 days vs prior 7 days */}
            {(() => {
              const now = new Date();
              const thisWeekStart = new Date(now);
              thisWeekStart.setDate(now.getDate() - 6);
              thisWeekStart.setHours(0, 0, 0, 0);
              const lastWeekStart = new Date(now);
              lastWeekStart.setDate(now.getDate() - 13);
              lastWeekStart.setHours(0, 0, 0, 0);
              const lastWeekEnd = new Date(thisWeekStart);
              lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
              lastWeekEnd.setHours(23, 59, 59, 999);
              const thisWeekRev = sales
                .filter((s: any) => s.date && new Date(s.date) >= thisWeekStart)
                .reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
              const lastWeekRev = sales
                .filter(
                  (s: any) =>
                    s.date && new Date(s.date) >= lastWeekStart && new Date(s.date) <= lastWeekEnd,
                )
                .reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
              const wow =
                lastWeekRev === 0
                  ? thisWeekRev > 0
                    ? 100
                    : 0
                  : Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100);
              return (
                <Badge variant={wow >= 0 ? "secondary" : "destructive"}>
                  {wow >= 0 ? "+" : ""}
                  {wow}% WoW
                </Badge>
              );
            })()}
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
                      p.stock <= p.reorderLevel / 2
                        ? "text-destructive"
                        : "text-warning-foreground",
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
                  <th className="px-5 py-2.5 whitespace-nowrap">Invoice</th>
                  <th className="px-5 py-2.5 whitespace-nowrap">Customer</th>
                  <th className="px-5 py-2.5 whitespace-nowrap">Payment</th>
                  <th className="px-5 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-2.5 whitespace-nowrap text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSales.slice(0, 7).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium whitespace-nowrap">
                      {s.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{s.customerName || "Walk-in"}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize whitespace-nowrap">
                      {s.paymentMethod || "cash"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="number px-5 py-3 text-right font-semibold whitespace-nowrap">
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
                    {p.sold} sold · {formatCurrency(p.sold * (Number(p.price) || 0))}
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

      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
              <Calendar className="size-4" />
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="size-5 text-primary" /> Today's Sales & Performance Summary
            </DialogTitle>
            <DialogDescription>
              Real-time snapshot of your store operations and financial metrics for today.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <DollarSign className="size-3.5 text-primary" /> Total Revenue
              </div>
              <div className="text-xl font-extrabold text-primary">{fmt(displayRevenue)}</div>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <TrendingUp className="size-3.5 text-success" /> Est. Net Profit
              </div>
              <div className="text-xl font-extrabold text-success">{fmt(displayProfit)}</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <ShoppingBag className="size-3.5 text-purple-600" /> Transactions
              </div>
              <div className="text-xl font-extrabold text-purple-600">{displayOrders} Orders</div>
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl p-3.5 border border-border space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Top Performing Product Today
            </h4>
            {topSelling.length > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded bg-primary/10 text-xs font-bold text-primary">
                    1
                  </span>
                  <span className="text-sm font-semibold">{topSelling[0].name}</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {topSelling[0].sold} sold
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No product sales recorded yet today.</p>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
              <Printer className="size-4 mr-2" /> Print Summary
            </Button>
            {canAccessReports && (
              <Button
                asChild
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link to="/reports" onClick={() => setIsDailyReportOpen(false)}>
                  <BarChart3 className="size-4 mr-2" /> Detailed Reports{" "}
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
