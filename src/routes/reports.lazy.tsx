import { createLazyFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { PersistStore } from "@/lib/session-store";
import { useQuery } from "@tanstack/react-query";
import { getSalesFn } from "@/api/sales";
import { getProfitabilityReportFn } from "@/api/reports";
import { getProductsFn } from "@/api/products";
import { getExpensesFn } from "@/api/expenses";
import { getPurchasesFn } from "@/api/purchases";
import { getInventoryBatchesFn } from "@/api/inventory";
import { getCategoriesFn } from "@/api/categories";
import { useCurrency } from "@/lib/currency";
import { useState, useMemo } from "react";
import {
  BarChart3,
  DollarSign,
  FileText,
  Package,
  Percent,
  TrendingUp,
  ShoppingCart,
  Calendar,
  BookOpen,
  Users,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { ReportSkeleton } from "@/components/skeletons/ReportSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createLazyFileRoute("/reports")({
  component: ReportsPage,
});

type ReportType =
  | "sales"
  | "profit"
  | "purchase"
  | "inventory"
  | "tax"
  | "expense"
  | "daily"
  | "monthly"
  | "pnl"
  | "salesman"
  | "gstr1"
  | "gstr2"
  | "gstr3b"
  | "near-expiry"
  | "expired"
  | null;

function ReportsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatAppDate } = useAppFormatter();
  const { currencySymbol, formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";

  const {
    data: salesData,
    isLoading: isSalesLoading,
    isError: isSalesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => ((await getSalesFn({ data: {} })) as any)?.data || [],
  });
  const sales = salesData || [];

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => ((await getExpensesFn({ data: {} })) as any)?.data || [],
  });
  const expenses = expensesData || [];

  const { data: purchasesData, isLoading: isPurchasesLoading } = useQuery({
    queryKey: ["purchases", orgId],
    queryFn: async () => ((await getPurchasesFn({ data: {} })) as any)?.data || [],
  });
  const purchases = purchasesData || [];

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = categoriesData || [];

  const { data: batchesData, isLoading: isBatchesLoading } = useQuery({
    queryKey: ["inventoryBatches", orgId],
    queryFn: async () => ((await getInventoryBatchesFn({ data: {} })) as any)?.data || [],
  });
  const batches = batchesData || [];

  const isReportsLoading =
    isSalesLoading ||
    isProductsLoading ||
    isExpensesLoading ||
    isPurchasesLoading ||
    isCategoriesLoading ||
    isBatchesLoading;

  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: profitReportData, isLoading: isProfitLoading } = useQuery({
    queryKey: ["profitability", orgId, dateFrom, dateTo],
    queryFn: async () =>
      ((await getProfitabilityReportFn({ data: { startDate: dateFrom, endDate: dateTo } })) as any)
        ?.data || null,
  });

  const mtdRevenue = profitReportData?.netRevenue || 0;
  const mtdCost = profitReportData?.totalCogs || 0;
  const mtdProfit = profitReportData?.grossProfit || 0;
  const marginPct = profitReportData?.marginPct || 0;

  const mtdOrders = sales.length;
  const taxPayable = sales.reduce((sum, s) => sum + (Number(s.taxAmt) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const stockValue = products.reduce(
    (s, p) => s + (Number(p.stock) || 0) * (Number(p.cost) || 0),
    0,
  );

  const monthly = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.toLocaleString("default", { month: "short" });
    const monthSales = sales.filter(
      (s) =>
        new Date(s.date).getMonth() === d.getMonth() &&
        new Date(s.date).getFullYear() === d.getFullYear(),
    );
    const revenue = monthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const expense = expenses
      .filter((e) => new Date(e.date).getMonth() === d.getMonth())
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    let cogs = 0;
    monthSales.forEach((sale) => {
      sale.saleItems?.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) cogs += prod.cost * item.quantity;
      });
    });
    const profit = revenue - cogs - expense;
    return { m, revenue, profit, expense };
  });

  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = formatAppDate(d, "date", "EEE");
    const dayStr = formatAppDate(d, "date", "yyyy-MM-dd");
    const daySales = sales.filter((s) => formatAppDate(s.date, "date", "yyyy-MM-dd") === dayStr);
    return {
      day,
      sales: daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      orders: daySales.length,
    };
  });

  // Category share from real sales data
  const catSalesMap: Record<string, number> = {};
  sales.forEach((sale) => {
    sale.saleItems?.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const catName = categories.find((c) => c.id === prod.category)?.name || prod.category;
        catSalesMap[catName] = (catSalesMap[catName] || 0) + (Number(item.total) || 0);
      }
    });
  });
  const COLORS = [
    "var(--color-primary)",
    "var(--color-info)",
    "var(--color-warning)",
    "var(--color-success)",
    "var(--color-destructive)",
  ];
  const catData = Object.entries(catSalesMap).map(([name, value], i) => ({
    name,
    value,
    color: COLORS[i % COLORS.length],
  }));
  const pieData =
    catData.length > 0
      ? catData
      : categories
          .slice(0, 5)
          .map((c, i) => ({ name: c.name, value: 20, color: COLORS[i % COLORS.length] }));

  const exportCSV = (type: string) => {
    let csv = "";
    let filename = "";

    if (type === "sales") {
      csv =
        ["Invoice,Customer,Date,Payment,Items,Total"].join("\n") +
        "\n" +
        sales
          .map(
            (s) =>
              `${s.id.slice(0, 8)},${s.customerName || "Walk-in"},${formatDate(s.date)},${s.paymentMethod},${s.items},${currencySymbol}${Number(s.total).toFixed(2)}`,
          )
          .join("\n");
      filename = "sales-report.csv";
    } else if (type === "inventory") {
      csv =
        ["Product,SKU,Stock,Reorder Level,Value"].join("\n") +
        "\n" +
        products
          .map(
            (p) =>
              `${p.name},${p.sku},${p.stock},${p.reorderLevel},${currencySymbol}${(Number(p.stock) * Number(p.cost)).toFixed(2)}`,
          )
          .join("\n");
      filename = "inventory-report.csv";
    } else if (type === "expense") {
      csv =
        ["Date,Category,Description,Amount,Status"].join("\n") +
        "\n" +
        expenses
          .map(
            (e) =>
              `${e.date},${e.category},${e.description},${currencySymbol}${Number(e.amount).toFixed(2)},${e.status}`,
          )
          .join("\n");
      filename = "expense-report.csv";
    } else if (type === "gstr1") {
      // Outward Supplies (Sales)
      csv =
        ["Invoice No,Date,Customer Name,GSTIN,State,Taxable Value,CGST,SGST,IGST,Total Value"].join(
          "\n",
        ) +
        "\n" +
        sales
          .map((s) => {
            const taxable = (s.subtotal || 0) - (s.discountAmt || 0);
            return `${s.id.substring(0, 8)},${formatDate(s.date)},${s.customerName || "Walk-in"},-,0,${taxable.toFixed(2)},${(s.cgstAmt || 0).toFixed(2)},${(s.sgstAmt || 0).toFixed(2)},${(s.igstAmt || 0).toFixed(2)},${s.total.toFixed(2)}`;
          })
          .join("\n");
      filename = "GSTR-1.csv";
    } else if (type === "gstr2") {
      // Inward Supplies (Purchases)
      csv =
        ["Invoice No,Date,Supplier Name,GSTIN,Taxable Value,CGST,SGST,IGST,Total Value"].join(
          "\n",
        ) +
        "\n" +
        purchases
          .map((p) => {
            const taxable = (p.subtotal || 0) - (p.discountAmt || 0);
            return `${p.invoiceNo || p.id.substring(0, 8)},${formatDate(p.date)},${p.supplier},-,${taxable.toFixed(2)},${(p.cgstAmt || 0).toFixed(2)},${(p.sgstAmt || 0).toFixed(2)},${(p.igstAmt || 0).toFixed(2)},${p.total.toFixed(2)}`;
          })
          .join("\n");
      filename = "GSTR-2.csv";
    } else if (type === "gstr3b") {
      // Summary
      let outTaxable = 0;
      let outCGST = 0;
      let outSGST = 0;
      let outIGST = 0;
      sales.forEach((s) => {
        outTaxable += (s.subtotal || 0) - (s.discountAmt || 0);
        outCGST += s.cgstAmt || 0;
        outSGST += s.sgstAmt || 0;
        outIGST += s.igstAmt || 0;
      });
      let inTaxable = 0;
      let inCGST = 0;
      let inSGST = 0;
      let inIGST = 0;
      purchases.forEach((p) => {
        inTaxable += (p.subtotal || 0) - (p.discountAmt || 0);
        inCGST += p.cgstAmt || 0;
        inSGST += p.sgstAmt || 0;
        inIGST += p.igstAmt || 0;
      });

      csv =
        ["Description,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess"].join(
          "\n",
        ) +
        "\n" +
        `3.1 Outward Taxable Supplies,${outTaxable.toFixed(2)},${outIGST.toFixed(2)},${outCGST.toFixed(2)},${outSGST.toFixed(2)},0.00\n` +
        `4(A) ITC Available (Inward Supplies),${inTaxable.toFixed(2)},${inIGST.toFixed(2)},${inCGST.toFixed(2)},${inSGST.toFixed(2)},0.00`;
      filename = "GSTR-3B.csv";
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    toast.success(`${filename} exported`);
  };

  const reportCards = [
    {
      type: "sales" as ReportType,
      icon: DollarSign,
      name: "Sales Report",
      desc: "Daily, weekly and monthly sales trends",
    },
    {
      type: "gstr1" as ReportType,
      icon: FileText,
      name: "GSTR-1 (Outward Supplies)",
      desc: "B2B and B2C sales for GST return filing",
    },
    {
      type: "gstr2" as ReportType,
      icon: FileText,
      name: "GSTR-2 (Inward Supplies)",
      desc: "Purchase records for Input Tax Credit (ITC)",
    },
    {
      type: "gstr3b" as ReportType,
      icon: FileText,
      name: "GSTR-3B (Summary)",
      desc: "Monthly summary of outward supplies and ITC",
    },
    {
      type: "profit" as ReportType,
      icon: TrendingUp,
      name: "Profit Report",
      desc: "Gross and net margin by category",
    },
    {
      type: "pnl" as ReportType,
      icon: BookOpen,
      name: "Profit & Loss Statement (P&L)",
      desc: "Formal income statement, COGS, and Net Income",
    },
    {
      type: "salesman" as ReportType,
      icon: Users,
      name: "Salesman Commission Leaderboard",
      desc: "Sales target vs achievement and earned commissions",
    },
    {
      type: "purchase" as ReportType,
      icon: ShoppingCart,
      name: "Purchase Report",
      desc: "Supplier purchases and outstanding payables",
    },
    {
      type: "inventory" as ReportType,
      icon: Package,
      name: "Inventory Report",
      desc: "Stock valuation, dead stock, shrinkage",
    },
    {
      type: "tax" as ReportType,
      icon: Percent,
      name: "Tax Report",
      desc: "Output, input and net tax payable",
    },
    {
      type: "expense" as ReportType,
      icon: FileText,
      name: "Expense Report",
      desc: "Operating costs by category",
    },
    {
      type: "daily" as ReportType,
      icon: Calendar,
      name: "Daily Report",
      desc: "End-of-day cashier reconciliation",
    },
    {
      type: "monthly" as ReportType,
      icon: BarChart3,
      name: "Monthly Report",
      desc: "Period comparison with prior month",
    },
    {
      type: "near-expiry" as ReportType,
      icon: AlertTriangle,
      name: "Near-Expiry Report",
      desc: "Batches expiring within 90 days",
    },
    {
      type: "expired" as ReportType,
      icon: AlertCircle,
      name: "Expired Stock Report",
      desc: "Items that have already expired",
    },
  ];

  if (isReportsLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <ReportSkeleton />
      </div>
    );
  }

  if (isSalesError && !sales.length) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <ErrorState onRetry={refetchSales} />
      </div>
    );
  }

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Reports"
        description="Insights across sales, inventory, tax and operations."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCSV("sales")}>
              Export Sales CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportCSV("inventory")}>
              Export Stock CSV
            </Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Sales (MTD)"
          value={formatCurrency(mtdRevenue)}
          icon={DollarSign}
          accent="success"
          delta={0}
        />
        <StatCard
          label="Cost of Goods (COGS)"
          value={formatCurrency(mtdCost)}
          icon={Package}
          accent="warning"
          delta={0}
        />
        <StatCard
          label="Gross Profit"
          value={formatCurrency(mtdProfit)}
          icon={TrendingUp}
          accent="primary"
          delta={0}
        />
        <StatCard
          label="Gross Margin %"
          value={`${marginPct.toFixed(1)}%`}
          icon={Percent}
          accent="info"
          delta={0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Revenue vs Profit (12 Months)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Historical trajectory and profitability trends
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="size-2.5 rounded-full bg-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="size-2.5 rounded-full bg-emerald-500" /> Profit
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.5}
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
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 14,
                    boxShadow: "var(--shadow-card)",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={false}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-success)"
                  strokeWidth={3}
                  dot={false}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Sales by Category</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {catData.length > 0 ? "Actual category volume share" : "No sales data yet"}
            </p>
          </div>
          <div className="h-48 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="var(--color-card)"
                  strokeWidth={3}
                >
                  {pieData.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-card)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5 border-t border-border/60 pt-3">
            {pieData.slice(0, 4).map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="flex-1 truncate text-muted-foreground font-medium">{c.name}</span>
                <span className="number font-black text-foreground">
                  {catData.length > 0 ? formatCurrency(c.value) : `${c.value}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mt-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-base font-bold text-foreground">
            Top Products by Profit Margin
          </h2>
          <div className="space-y-3">
            {profitReportData?.topProducts?.slice(0, 5).map((p: any) => (
              <div
                key={p.productId}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.quantitySold} sold • Margin: {p.margin.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className="text-xs font-black text-success">{formatCurrency(p.profit)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    COGS: {formatCurrency(p.cogs)}
                  </p>
                </div>
              </div>
            ))}
            {(!profitReportData?.topProducts || profitReportData.topProducts.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No product profitability data for this period.
              </p>
            )}
          </div>
        </div>

        {/* Weekly */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
          <h2 className="mb-3 text-base font-bold text-foreground">Sales Velocity This Week</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.5}
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
                  tickFormatter={(v) => `${currencySymbol}${v}`}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--color-primary)"
                  radius={[8, 8, 0, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.name}
              onClick={() => setActiveReport(r.type)}
              className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-card card-interactive transition-all cursor-pointer"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                  {r.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{r.desc}</p>
              </div>
              <div className="flex items-center self-center justify-center">
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Drawer */}
      <Sheet open={!!activeReport} onOpenChange={(open) => !open && setActiveReport(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-5xl overflow-y-auto sm:p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="capitalize flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pr-6">
              <span>
                {activeReport === "pnl" ? "Profit & Loss Statement" : `${activeReport} Report`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="font-semibold bg-primary/10 border-primary/20 text-primary hover:text-primary hover:bg-primary/20 hover:border-primary/30 w-full sm:w-auto"
              >
                {" "}
                Print Report
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pt-2">
            {/* Date Filter Bar */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-xs">From</Label>
                <div className="mt-1">
                  <DatePicker
                    date={dateFrom}
                    onDateChange={(d) => setDateFrom(d ? d.toISOString().split("T")[0] : "")}
                    placeholder="From Date"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">To</Label>
                <div className="mt-1">
                  <DatePicker
                    date={dateTo}
                    onDateChange={(d) => setDateTo(d ? d.toISOString().split("T")[0] : "")}
                    placeholder="To Date"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                onClick={() => exportCSV(activeReport || "sales")}
              >
                Export CSV
              </Button>
            </div>

            {activeReport === "sales" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <div className="text-2xl font-bold">{mtdOrders}</div>
                    <div className="text-xs text-muted-foreground">Total Orders</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <div className="text-2xl font-bold">{formatCurrency(mtdRevenue)}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(mtdRevenue / Math.max(mtdOrders, 1))}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Order</div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border max-h-64 shadow-soft">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-muted z-10 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Invoice</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Customer</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.slice(0, 20).map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {s.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {s.customerName || "Walk-in"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {formatDate(s.date)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                            {formatCurrency(s.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeReport === "salesman" && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border shadow-soft">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-muted z-10 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-3 py-2 text-left whitespace-nowrap">
                          Sales Representative
                        </th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Comm. Rate</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Target</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Achieved Sales</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">
                          Earned Commission
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.reduce(
                        (reps, sale) => {
                          if (sale.salesmanName) {
                            const existing = reps.find((r) => r.name === sale.salesmanName);
                            if (existing) {
                              existing.sales += sale.total;
                              existing.commission += sale.commissionAmt || 0;
                            } else {
                              reps.push({
                                name: sale.salesmanName,
                                sales: sale.total,
                                commission: sale.commissionAmt || 0,
                              });
                            }
                          }
                          return reps;
                        },
                        [] as { name: string; sales: number; commission: number }[],
                      ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-xs text-muted-foreground"
                          >
                            No salesman sales recorded yet. Select a Sales Rep at POS checkout to
                            track commissions.
                          </td>
                        </tr>
                      ) : (
                        sales
                          .reduce(
                            (reps, sale) => {
                              if (sale.salesmanName) {
                                const existing = reps.find((r) => r.name === sale.salesmanName);
                                if (existing) {
                                  existing.sales += sale.total;
                                  existing.commission += sale.commissionAmt || 0;
                                } else {
                                  reps.push({
                                    name: sale.salesmanName,
                                    sales: sale.total,
                                    commission: sale.commissionAmt || 0,
                                  });
                                }
                              }
                              return reps;
                            },
                            [] as { name: string; sales: number; commission: number }[],
                          )
                          .map((r, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-semibold text-primary whitespace-nowrap">
                                {r.name}
                              </td>
                              <td className="px-3 py-2 text-center text-xs font-mono whitespace-nowrap">
                                2.5%
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-mono whitespace-nowrap">
                                {formatCurrency(10000)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold whitespace-nowrap">
                                {formatCurrency(r.sales)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-success whitespace-nowrap">
                                {formatCurrency(r.commission)}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === "inventory" && (
              <div className="overflow-x-auto rounded-lg border border-border max-h-72 shadow-soft">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-muted z-10 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Product</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Stock</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Reorder</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{p.stock}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{p.reorderLevel}</td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(p.stock * p.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/30">
                    <tr>
                      <td className="px-3 py-2 font-bold">Total</td>
                      <td colSpan={2}></td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatCurrency(stockValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeReport === "expense" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 flex justify-between">
                  <span className="font-semibold">Total Expenses</span>
                  <span className="font-bold text-destructive">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border max-h-64 shadow-soft">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-muted z-10 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Description</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{e.category}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {e.description}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                            {formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === "tax" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">Gross Revenue</div>
                    <div className="text-xl font-bold">{formatCurrency(mtdRevenue)}</div>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <div className="text-xs text-muted-foreground">Tax Payable (8%)</div>
                    <div className="text-xl font-bold text-destructive">
                      {formatCurrency(taxPayable)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">Input Tax (Est.)</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(purchases.reduce((s, p) => s + p.total, 0) * 0.08)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-success/10 p-3">
                    <div className="text-xs text-muted-foreground">Net Tax Due</div>
                    <div className="text-xl font-bold text-success">
                      {formatCurrency(
                        taxPayable - purchases.reduce((s, p) => s + p.total, 0) * 0.08,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeReport === "profit" || activeReport === "monthly") && (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
                      tickFormatter={(v) => `${currencySymbol}${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]}
                      name="Revenue"
                    />
                    <Bar
                      dataKey="profit"
                      fill="var(--color-success)"
                      radius={[4, 4, 0, 0]}
                      name="Profit"
                    />
                    <Bar
                      dataKey="expense"
                      fill="var(--color-destructive)"
                      radius={[4, 4, 0, 0]}
                      name="Expense"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {(activeReport === "near-expiry" || activeReport === "expired") && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 flex justify-between">
                  <span className="font-semibold">
                    {activeReport === "near-expiry"
                      ? "Batches Expiring Soon (Next 90 days)"
                      : "Expired Stock"}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border max-h-96 shadow-soft">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-muted z-10 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Product</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Batch No</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Expiry Date</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Qty Left</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">Value</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batches
                        .filter((b) => b.quantityRemaining > 0 && b.expiryDate)
                        .map((b) => {
                          const exp = new Date(b.expiryDate);
                          const now = new Date();
                          const diffTime = exp.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          let isTarget = false;
                          if (activeReport === "near-expiry" && diffDays > 0 && diffDays <= 90)
                            isTarget = true;
                          if (activeReport === "expired" && diffDays <= 0) isTarget = true;

                          if (!isTarget) return null;

                          const prod = products.find((p) => p.id === b.productId);
                          const val =
                            (Number(b.purchaseCost) || 0) * (Number(b.quantityRemaining) || 0);

                          return (
                            <tr key={b.id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium">
                                {prod?.name || "Unknown Product"}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                {b.batchNo}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {formatDate(b.expiryDate)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                {b.quantityRemaining}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatCurrency(val)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {diffDays <= 0 ? (
                                  <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    EXPIRED
                                  </span>
                                ) : (
                                  <span className="bg-warning/10 text-warning text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {diffDays} days
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                        .filter(Boolean)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === "purchase" && (
              <div className="overflow-x-auto rounded-lg border border-border max-h-64 shadow-soft">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left whitespace-nowrap">PO</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Supplier</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Date</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{p.supplier}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(p.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === "daily" && (
              <div className="space-y-3">
                <h3 className="font-semibold">Today's Summary</h3>
                {(() => {
                  const today = formatAppDate(new Date(), "date", "yyyy-MM-dd");
                  const todaySales = sales.filter(
                    (s) => formatAppDate(s.date, "date", "yyyy-MM-dd") === today,
                  );
                  const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <div className="text-2xl font-bold">{todaySales.length}</div>
                        <div className="text-xs text-muted-foreground">Orders</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(todayRevenue * 0.3)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. Profit</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
