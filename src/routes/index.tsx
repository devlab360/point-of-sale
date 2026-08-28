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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getCategoriesFn } from "@/api/categories";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { sendAutomatedReport } from "@/lib/automation/report-bot";
import { MessageCircle } from "lucide-react";
import { useAppFormatter } from "@/hooks/useAppFormatter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · OneDesk360" },
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
  const { formatAppDate, timeZone } = useAppFormatter();
  const { user, saasPlan, saasOrg } = useAuth();
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [chartView, setChartView] = useState<"revenue" | "profit">("revenue");
  const canAccessPos =
    !saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("/pos");
  const canAccessReports =
    !saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("/reports");
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

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = categoriesData || [];

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data,
  });
  const settings: any = settingsData;

  const isLoading = isProductsLoading || isSalesLoading || isCustomersLoading || isExpensesLoading;
  const isError = isProductsError || isSalesError || isCustomersError || isExpensesError;

  const handleRefetchAll = () => {
    refetchProducts();
    refetchSales();
    refetchCustomers();
    refetchExpenses();
  };

  const activeSales = useMemo(
    () =>
      sales.filter(
        (s: any) =>
          s &&
          s.status !== "void" &&
          s.status !== "cancelled" &&
          s.status !== "quotation" &&
          s.status !== "draft",
      ),
    [sales],
  );

  const productsMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [products]);

  const healthAnalysis = useMemo(() => {
    const totalSalesRev = activeSales.reduce((sum, s: any) => sum + (Number(s.total) || 0), 0);
    const totalExp = expenses.reduce((sum, e: any) => sum + (Number(e.amount) || 0), 0);

    let totalCogs = 0;
    activeSales.forEach((s: any) => {
      const items = s.saleItems || s.items || [];
      if (Array.isArray(items)) {
        items.forEach((i: any) => {
          const prod = productsMap.get(i.productId || i.id);
          const unitCost = Number(i.cost ?? prod?.cost) || 0;
          const qty = Number(i.quantity ?? i.qty) || 1;
          totalCogs += unitCost * qty;
        });
      }
    });
    const netProfit = totalSalesRev - totalCogs - totalExp;
    const profitMargin = totalSalesRev > 0 ? (netProfit / totalSalesRev) * 100 : 0;

    // Dead Stock Calculation
    const soldProductIds = new Set(
      activeSales.flatMap((s: any) => (s.saleItems || s.items || []).map((i: any) => i.productId || i.id).filter(Boolean)),
    );
    const deadStockItems = products.filter((p: any) => (Number(p.stock) || 0) > 0 && !soldProductIds.has(p.id));
    const totalStockValue = products.reduce((sum: number, p: any) => sum + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
    const deadStockValue = deadStockItems.reduce(
      (sum: number, p: any) => sum + (Number(p.stock) || 0) * (Number(p.cost) || 0),
      0,
    );

    // Due Collection Health
    const totalDue = customers.reduce((sum: number, c: any) => sum + (Number(c.credit || c.due || c.balance) || 0), 0);
    const overDueRatio = totalSalesRev > 0 ? (totalDue / totalSalesRev) * 100 : 0;

    // Score Calculation out of 100
    let score = products.length > 0 || activeSales.length > 0 ? 50 : 30;
    if (activeSales.length >= 5) score += 15;
    else if (activeSales.length > 0) score += 10;

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
      badgeClass = "bg-success/20 text-success border-success/30 font-bold";
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
  }, [activeSales, products, customers, expenses, productsMap]);

  const lowStock = products.filter((p: any) => Number(p.stock) <= Number(p.reorderLevel)).slice(0, 5);

  const productSalesMap = new Map<string, number>();
  activeSales.forEach((sale: any) => {
    const items = sale.saleItems || sale.items || [];
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        const pId = item.productId || item.id;
        if (pId) {
          productSalesMap.set(
            pId,
            (productSalesMap.get(pId) || 0) + Number(item.quantity || item.qty || 1),
          );
        }
      });
    }
  });

  const topSelling = [...products]
    .map((p: any) => ({ ...p, sold: productSalesMap.get(p.id) || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const recentSales = [...activeSales].reverse().slice(0, 5);

  const todayDateStr = formatAppDate(new Date(), "date", "yyyy-MM-dd");
  const todaySales = activeSales.filter(
    (s: any) => s.date && formatAppDate(s.date, "date", "yyyy-MM-dd") === todayDateStr,
  );
  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
  const todayOrders = todaySales.length;

  let todayProfit = 0;
  todaySales.forEach((s: any) => {
    let cogs = 0;
    const items = s.saleItems || s.items || [];
    if (Array.isArray(items)) {
      items.forEach((i: any) => {
        const prod = productsMap.get(i.productId || i.id);
        const unitCost = Number(i.cost ?? prod?.cost) || 0;
        const qty = Number(i.quantity ?? i.qty) || 1;
        cogs += unitCost * qty;
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
  const yesterdayDateStr = formatAppDate(yesterdayDate, "date", "yyyy-MM-dd");
  const yesterdaySales = activeSales.filter(
    (s: any) => s.date && formatAppDate(s.date, "date", "yyyy-MM-dd") === yesterdayDateStr,
  );
  const yesterdayRevenue = yesterdaySales.reduce(
    (sum: number, s: any) => sum + (Number(s.total) || 0),
    0,
  );
  const yesterdayOrders = yesterdaySales.length;

  let yesterdayProfit = 0;
  yesterdaySales.forEach((s: any) => {
    let cogs = 0;
    const items = s.saleItems || s.items || [];
    if (Array.isArray(items)) {
      items.forEach((i: any) => {
        const prod = productsMap.get(i.productId || i.id);
        const unitCost = Number(i.cost ?? prod?.cost) || 0;
        const qty = Number(i.quantity ?? i.qty) || 1;
        cogs += unitCost * qty;
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
    const day = formatAppDate(d, "date", "EEE");
    const dayStr = formatAppDate(d, "date", "yyyy-MM-dd");
    const daySales = sales.filter(
      (s: any) => s.date && formatAppDate(s.date, "date", "yyyy-MM-dd") === dayStr,
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
        let catName = "General";
        if (prod?.category) {
          const cat = categories.find(
            (c: any) => c.id === prod.category || c.name === prod.category,
          );
          if (cat) {
            catName = cat.name;
          } else if (prod.category.length < 20) {
            catName = prod.category; // fallback if it's already a short name
          }
        }
        const itemTotal = Number(i.total) || (Number(i.price) || 0) * (i.quantity || 1);
        categoryTotalsMap.set(catName, (categoryTotalsMap.get(catName) || 0) + itemTotal);
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

  const [showOnboarding, setShowOnboarding] = useState(true);

  if (isLoading) {
    return (
      <div className="page-container">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError && !products.length && !sales.length) {
    return (
      <div className="page-container">
        <ErrorState onRetry={handleRefetchAll} />
      </div>
    );
  }

  const completedSetupSteps = [products.length > 0, customers.length > 0, sales.length > 0].filter(
    Boolean,
  ).length;

  return (
    <div className="page-container space-y-8 page-enter">
      {/* Clean Human-Crafted Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-display">
              Overview
            </h1>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary font-display">
              {saasOrg?.name || "Main Store"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time sales, revenue, and inventory performance for today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canAccessReports && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDailyReportOpen(true)}
              className="text-xs font-bold gap-2 h-10 px-4 rounded-xl border-border/80 shadow-xs"
            >
              <Receipt className="size-4" /> Daily Summary
            </Button>
          )}
          {canAccessPos && (
            <Button
              size="sm"
              variant="gradient"
              asChild
              className="gap-2 font-extrabold h-10 px-5 rounded-xl shadow-md"
            >
              <Link to="/pos">
                <ShoppingBag className="size-4" /> Open POS Terminal
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Revenue"
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
          label="Est. Net Profit"
          value={fmt(displayProfit)}
          delta={profitDelta}
          hint="vs yesterday"
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock.length.toString()}
          hint={lowStock.length > 0 ? "Requires restock" : "Inventory healthy"}
          icon={AlertTriangle}
          accent={lowStock.length > 0 ? "warning" : "success"}
        />
      </div>

      {/* Main Charts Row: Revenue Area Chart + Category Donut */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-card xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Revenue & Profit Performance
              </h2>
              <p className="text-xs text-muted-foreground">Rolling 12-month trajectory</p>
            </div>
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50">
              <button
                type="button"
                onClick={() => setChartView("revenue")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                  chartView === "revenue"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setChartView("profit")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                  chartView === "profit"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Net Profit
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
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
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.6}
                />
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
                    boxShadow: "var(--shadow-card-hover)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [
                    fmt(v),
                    chartView === "revenue" ? "Revenue" : "Net Profit",
                  ]}
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

        {/* Category Share Donut */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Category Mix</h2>
                <p className="text-xs text-muted-foreground">Product share by volume</p>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryShare}
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
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
                    formatter={(v: number) => [`${v}%`, "Share"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ul className="mt-2 space-y-2 max-h-36 overflow-y-auto pr-1">
            {categoryShare.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="truncate text-foreground font-medium">{c.name}</span>
                </div>
                <span className="number font-bold text-foreground shrink-0">{c.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Secondary Row: Sales this week + Low stock alerts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Sales This Week</h2>
              <p className="text-xs text-muted-foreground">Daily volume breakdown</p>
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
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold px-2 py-0.5",
                    wow >= 0
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {wow >= 0 ? "+" : ""}
                  {wow}% WoW
                </Badge>
              );
            })()}
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.6}
                />
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
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmt(v), "Sales"]}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--color-primary)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert Box */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-warning" /> Low Stock Items
                </h2>
                <p className="text-xs text-muted-foreground">Inventory below reorder thresholds</p>
              </div>
              <Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>

            {lowStock.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <div className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                  ✓
                </div>
                <span>All product inventory levels healthy</span>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {lowStock.map((p) => {
                  const stockPct = Math.min(
                    100,
                    Math.round(((p.stock || 0) / (p.reorderLevel || 5)) * 100),
                  );
                  const isCritical = Number(p.stock) <= Number(p.reorderLevel) / 2;
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                        {p.image ? (
                          <img src={p.image} alt="" className="size-full object-cover" />
                        ) : (
                          <Package className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {p.sku || "No SKU"}
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                isCritical ? "bg-destructive" : "bg-warning",
                              )}
                              style={{ width: `${Math.max(10, stockPct)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={cn(
                            "number text-xs sm:text-sm font-extrabold",
                            isCritical ? "text-destructive" : "text-warning",
                          )}
                        >
                          {p.stock} left
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Reorder at {p.reorderLevel}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold gap-1"
            >
              <Link to="/inventory">Manage Stock Adjustments</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tertiary Row: Recent Transactions (Responsive Desktop Table + Mobile Cards) + Top Sellers */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card shadow-card xl:col-span-2 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Recent Transactions
                </h2>
                <p className="text-xs text-muted-foreground">Latest invoices generated</p>
              </div>
              <Link to="/sales" className="text-xs font-semibold text-primary hover:underline">
                View All Sales History →
              </Link>
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="table-desktop overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No sales transactions recorded yet today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSales.slice(0, 6).map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">
                          #{s.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium text-foreground">
                          {s.customerName || "Walk-in Customer"}
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize whitespace-nowrap text-xs">
                          {s.paymentMethod || "cash"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="number text-right font-extrabold text-foreground whitespace-nowrap">
                          {formatCurrency(s.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No sales transactions recorded yet today.
                </div>
              ) : (
                recentSales.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          #{s.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {s.customerName || "Walk-in"} ·{" "}
                        <span className="capitalize">{s.paymentMethod || "Cash"}</span>
                      </p>
                    </div>
                    <div className="number text-right font-extrabold text-foreground text-sm">
                      {formatCurrency(s.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Sellers Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Top Sellers</h2>
                <p className="text-xs text-muted-foreground">Best performing items</p>
              </div>
              <Link to="/products" className="text-xs font-semibold text-primary hover:underline">
                Catalog →
              </Link>
            </div>

            <ul className="space-y-3">
              {topSelling.length === 0 ? (
                <li className="py-8 text-center text-xs text-muted-foreground">
                  No sales data yet.
                </li>
              ) : (
                topSelling.map((p, i) => {
                  const medalColors = [
                    "bg-amber-500/15 text-amber-600 font-black",
                    "bg-slate-400/15 text-slate-600 font-bold",
                    "bg-amber-700/15 text-amber-800 font-bold",
                  ];
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-md text-[11px]",
                          medalColors[i] || "bg-muted text-muted-foreground font-semibold",
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                        {p.image ? (
                          <img src={p.image} alt="" className="size-full object-cover" />
                        ) : (
                          <Package className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.sold} units · {formatCurrency(p.sold * (Number(p.price) || 0))}
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 text-success shrink-0" />
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-border/60 pt-4">
            <Quick icon={Users} label="Total Customers" value={customers.length.toString()} />
            <Quick icon={Package} label="Active SKUs" value={products.length.toString()} />
          </div>
        </div>
      </div>

      {/* Daily Summary Modal */}
      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Calendar className="size-4" />
              {formatAppDate(new Date(), "date", "EEEE, MMMM d, yyyy")}
            </div>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Receipt className="size-5 text-primary" /> Today's Performance Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Real-time summary of sales, profit and volume metrics generated for this shift.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
            <div className="bg-primary/8 border border-primary/20 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <DollarSign className="size-3.5 text-primary" /> Total Revenue
              </div>
              <div className="text-xl font-black text-primary">{fmt(displayRevenue)}</div>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <TrendingUp className="size-3.5 text-success" /> Est. Net Profit
              </div>
              <div className="text-xl font-black text-success">{fmt(displayProfit)}</div>
            </div>
            <div className="bg-primary/8 border border-primary/20 rounded-xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <ShoppingBag className="size-3.5 text-primary" /> Transactions
              </div>
              <div className="text-xl font-black text-primary">{displayOrders} Orders</div>
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/80 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Top Selling Product Today
            </h4>
            {topSelling.length > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-6 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    1
                  </span>
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {topSelling[0].name}
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {topSelling[0].sold} sold
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No product sales recorded yet today.</p>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              <Printer className="size-4 mr-2" /> Print Summary
            </Button>
            {canAccessReports && (
              <Button
                asChild
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
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
    completed: "bg-success/12 text-success border-success/20",
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    refunded: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[status] ?? map.completed,
      )}
    >
      {status}
    </span>
  );
}

function Quick({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="number mt-1 text-base sm:text-lg font-black text-foreground">{value}</div>
    </div>
  );
}
