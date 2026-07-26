import { createLazyFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { useState } from "react";
import {
  BarChart3, DollarSign, FileText, Package, Percent, TrendingUp, ShoppingCart, Calendar, BookOpen, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/reports")({
  component: ReportsPage,
});

type ReportType = "sales" | "profit" | "purchase" | "inventory" | "tax" | "expense" | "daily" | "monthly" | "pnl" | "salesman" | "gstr1" | "gstr2" | "gstr3b" | null;

function ReportsPage() {
  const { currencySymbol, formatCurrency } = useCurrency();
  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const expenses = useLiveQuery(() => localDb.expenses.toArray()) || [];
  const purchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.toArray()) || [];

  const [activeReport, setActiveReport] = useState<ReportType>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const mtdRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  
  let mtdCost = 0;
  sales.forEach(sale => {
    sale.saleItems?.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) mtdCost += prod.cost * item.quantity;
    });
  });
  const mtdProfit = mtdRevenue - mtdCost;
  
  const mtdOrders = sales.length;
  const taxPayable = mtdRevenue * 0.08;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const stockValue = products.reduce((s, p) => s + p.stock * p.cost, 0);

  const monthly = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.toLocaleString("default", { month: "short" });
    const monthSales = sales.filter(s => new Date(s.date).getMonth() === d.getMonth() && new Date(s.date).getFullYear() === d.getFullYear());
    const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const expense = expenses.filter(e => new Date(e.date).getMonth() === d.getMonth()).reduce((s, e) => s + e.amount, 0);
    
    let cogs = 0;
    monthSales.forEach(sale => {
      sale.saleItems?.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) cogs += prod.cost * item.quantity;
      });
    });
    const profit = revenue - cogs - expense;
    return { m, revenue, profit, expense };
  });

  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toLocaleDateString("default", { weekday: "short" });
    const daySales = sales.filter(s => new Date(s.date).toDateString() === d.toDateString());
    return { day, sales: daySales.reduce((sum, s) => sum + s.total, 0), orders: daySales.length };
  });

  // Category share from real sales data
  const catSalesMap: Record<string, number> = {};
  sales.forEach(sale => {
    sale.saleItems?.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) catSalesMap[prod.category] = (catSalesMap[prod.category] || 0) + item.total;
    });
  });
  const COLORS = ["var(--color-primary)", "var(--color-info)", "var(--color-warning)", "var(--color-success)", "var(--color-destructive)"];
  const catData = Object.entries(catSalesMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  const pieData = catData.length > 0 ? catData : categories.slice(0, 5).map((c, i) => ({ name: c.name, value: 20, color: COLORS[i % COLORS.length] }));

  const exportCSV = (type: string) => {
    let csv = "";
    let filename = "";
    const getCustomers = () => localDb.customers.toArray();
    
    if (type === "sales") {
      csv = ["Invoice,Customer,Date,Payment,Items,Total"].join("\n") + "\n" +
        sales.map(s => `${s.id.slice(0, 8)},${s.customerName || "Walk-in"},${new Date(s.date).toLocaleDateString()},${s.paymentMethod},${s.items},$${s.total.toFixed(2)}`).join("\n");
      filename = "sales-report.csv";
    } else if (type === "inventory") {
      csv = ["Product,SKU,Stock,Reorder Level,Value"].join("\n") + "\n" +
        products.map(p => `${p.name},${p.sku},${p.stock},${p.reorderLevel},$${(p.stock * p.cost).toFixed(2)}`).join("\n");
      filename = "inventory-report.csv";
    } else if (type === "expense") {
      csv = ["Date,Category,Description,Amount,Status"].join("\n") + "\n" +
        expenses.map(e => `${e.date},${e.category},${e.description},$${e.amount.toFixed(2)},${e.status}`).join("\n");
      filename = "expense-report.csv";
    } else if (type === "gstr1") {
      // Outward Supplies (Sales)
      csv = ["Invoice No,Date,Customer Name,GSTIN,State,Taxable Value,CGST,SGST,IGST,Total Value"].join("\n") + "\n" +
        sales.map(s => {
          const taxable = (s.subtotal || 0) - (s.discountAmt || 0);
          return `${s.id.substring(0,8)},${new Date(s.date).toLocaleDateString()},${s.customerName || "Walk-in"},-,0,${taxable.toFixed(2)},${(s.cgstAmt||0).toFixed(2)},${(s.sgstAmt||0).toFixed(2)},${(s.igstAmt||0).toFixed(2)},${s.total.toFixed(2)}`;
        }).join("\n");
      filename = "GSTR-1.csv";
    } else if (type === "gstr2") {
      // Inward Supplies (Purchases)
      csv = ["Invoice No,Date,Supplier Name,GSTIN,Taxable Value,CGST,SGST,IGST,Total Value"].join("\n") + "\n" +
        purchases.map(p => {
          const taxable = (p.subtotal || 0) - (p.discountAmt || 0);
          return `${p.invoiceNo || p.id.substring(0,8)},${new Date(p.date).toLocaleDateString()},${p.supplier},-,${taxable.toFixed(2)},${(p.cgstAmt||0).toFixed(2)},${(p.sgstAmt||0).toFixed(2)},${(p.igstAmt||0).toFixed(2)},${p.total.toFixed(2)}`;
        }).join("\n");
      filename = "GSTR-2.csv";
    } else if (type === "gstr3b") {
      // Summary
      let outTaxable = 0; let outCGST = 0; let outSGST = 0; let outIGST = 0;
      sales.forEach(s => { outTaxable += (s.subtotal||0)-(s.discountAmt||0); outCGST += (s.cgstAmt||0); outSGST += (s.sgstAmt||0); outIGST += (s.igstAmt||0); });
      let inTaxable = 0; let inCGST = 0; let inSGST = 0; let inIGST = 0;
      purchases.forEach(p => { inTaxable += (p.subtotal||0)-(p.discountAmt||0); inCGST += (p.cgstAmt||0); inSGST += (p.sgstAmt||0); inIGST += (p.igstAmt||0); });

      csv = ["Description,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess"].join("\n") + "\n" +
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
    { type: "sales" as ReportType, icon: DollarSign, name: "Sales Report", desc: "Daily, weekly and monthly sales trends" },
    { type: "gstr1" as ReportType, icon: FileText, name: "GSTR-1 (Outward Supplies)", desc: "B2B and B2C sales for GST return filing" },
    { type: "gstr2" as ReportType, icon: FileText, name: "GSTR-2 (Inward Supplies)", desc: "Purchase records for Input Tax Credit (ITC)" },
    { type: "gstr3b" as ReportType, icon: FileText, name: "GSTR-3B (Summary)", desc: "Monthly summary of outward supplies and ITC" },
    { type: "profit" as ReportType, icon: TrendingUp, name: "Profit Report", desc: "Gross and net margin by category" },
    { type: "pnl" as ReportType, icon: BookOpen, name: "Profit & Loss Statement (P&L)", desc: "Formal income statement, COGS, and Net Income" },
    { type: "salesman" as ReportType, icon: Users, name: "Salesman Commission Leaderboard", desc: "Sales target vs achievement and earned commissions" },
    { type: "purchase" as ReportType, icon: ShoppingCart, name: "Purchase Report", desc: "Supplier purchases and outstanding payables" },
    { type: "inventory" as ReportType, icon: Package, name: "Inventory Report", desc: "Stock valuation, dead stock, shrinkage" },
    { type: "tax" as ReportType, icon: Percent, name: "Tax Report", desc: "Output, input and net tax payable" },
    { type: "expense" as ReportType, icon: FileText, name: "Expense Report", desc: "Operating costs by category" },
    { type: "daily" as ReportType, icon: Calendar, name: "Daily Report", desc: "End-of-day cashier reconciliation" },
    { type: "monthly" as ReportType, icon: BarChart3, name: "Monthly Report", desc: "Period comparison with prior month" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Reports"
        description="Insights across sales, inventory, tax and operations."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCSV("sales")}>Export Sales CSV</Button>
            <Button size="sm" variant="outline" onClick={() => exportCSV("inventory")}>Export Stock CSV</Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MTD Revenue" value={formatCurrency(mtdRevenue)} delta={0} icon={DollarSign} accent="primary" />
        <StatCard label="MTD Profit" value={formatCurrency(mtdProfit)} delta={0} icon={TrendingUp} accent="success" />
        <StatCard label="MTD Orders" value={mtdOrders.toString()} delta={0} icon={ShoppingCart} accent="info" />
        <StatCard label="Tax Payable" value={formatCurrency(taxPayable)} delta={0} icon={Percent} accent="warning" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
          <h2 className="mb-1 text-base font-semibold">Revenue vs Profit (12 months)</h2>
          <p className="mb-3 text-xs text-muted-foreground">Based on local sales data</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={v => `${currencySymbol}${v}`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="var(--color-success)" strokeWidth={2.5} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-1 text-base font-semibold">Sales by Category</h2>
          <p className="mb-3 text-xs text-muted-foreground">{catData.length > 0 ? "From actual sales" : "No sales data yet"}</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="var(--color-card)" strokeWidth={3}>
                  {pieData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {pieData.slice(0, 4).map(c => (
              <li key={c.name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                <span className="number font-semibold">${typeof c.value === 'number' && catData.length > 0 ? c.value.toFixed(0) : c.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weekly */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 text-base font-semibold">Sales This Week</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={v => `${currencySymbol}${v}`} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="sales" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportCards.map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.name}
              onClick={() => setActiveReport(r.type)}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-elevated"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">{r.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Modal */}
      <Dialog open={!!activeReport} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center justify-between pr-6">
              <span>{activeReport === "pnl" ? "Profit & Loss Statement (লাভ-ক্ষতি বিবরণী)" : `${activeReport} Report`}</span>
              <Button size="sm" variant="outline" onClick={() => window.print()}>Print Report</Button>
            </DialogTitle>
          </DialogHeader>

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
              <Button variant="outline" size="sm" className="h-10" onClick={() => exportCSV(activeReport || "sales")}>
                Export CSV
              </Button>
            </div>

            {activeReport === "sales" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{mtdOrders}</div><div className="text-xs text-muted-foreground">Total Orders</div></div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{formatCurrency(mtdRevenue)}</div><div className="text-xs text-muted-foreground">Revenue</div></div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{formatCurrency(mtdRevenue / Math.max(mtdOrders, 1))}</div><div className="text-xs text-muted-foreground">Avg Order</div></div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                      <tr><th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.slice(0, 20).map(s => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{s.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-2">{s.customerName || "Walk-in"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeReport === "salesman" && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Sales Representative</th>
                        <th className="px-3 py-2 text-center">Comm. Rate</th>
                        <th className="px-3 py-2 text-right">Target</th>
                        <th className="px-3 py-2 text-right">Achieved Sales</th>
                        <th className="px-3 py-2 text-right">Earned Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sales.reduce((reps, sale) => {
                        if (sale.salesmanName) {
                          const existing = reps.find((r) => r.name === sale.salesmanName);
                          if (existing) {
                            existing.sales += sale.total;
                            existing.commission += sale.commissionAmt || 0;
                          } else {
                            reps.push({ name: sale.salesmanName, sales: sale.total, commission: sale.commissionAmt || 0 });
                          }
                        }
                        return reps;
                      }, [] as { name: string; sales: number; commission: number }[]).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                            No salesman sales recorded yet. Select a Sales Rep at POS checkout to track commissions.
                          </td>
                        </tr>
                      ) : (
                        sales.reduce((reps, sale) => {
                          if (sale.salesmanName) {
                            const existing = reps.find((r) => r.name === sale.salesmanName);
                            if (existing) {
                              existing.sales += sale.total;
                              existing.commission += sale.commissionAmt || 0;
                            } else {
                              reps.push({ name: sale.salesmanName, sales: sale.total, commission: sale.commissionAmt || 0 });
                            }
                          }
                          return reps;
                        }, [] as { name: string; sales: number; commission: number }[]).map((r, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-semibold text-primary">{r.name}</td>
                            <td className="px-3 py-2 text-center text-xs font-mono">2.5%</td>
                            <td className="px-3 py-2 text-right text-xs font-mono">{formatCurrency(10000)}</td>
                            <td className="px-3 py-2 text-right font-bold">{formatCurrency(r.sales)}</td>
                            <td className="px-3 py-2 text-right font-bold text-success">{formatCurrency(r.commission)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === "inventory" && (
              <div className="overflow-hidden rounded-lg border border-border max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                    <tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2 text-right">Reorder</th><th className="px-3 py-2 text-right">Value</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-right">{p.stock}</td>
                        <td className="px-3 py-2 text-right">{p.reorderLevel}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(p.stock * p.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/30">
                    <tr><td className="px-3 py-2 font-bold">Total</td><td colSpan={2}></td><td className="px-3 py-2 text-right font-bold">{formatCurrency(stockValue)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activeReport === "expense" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 flex justify-between">
                  <span className="font-semibold">Total Expenses</span>
                  <span className="font-bold text-destructive">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                      <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2">{e.date}</td>
                          <td className="px-3 py-2">{e.category}</td>
                          <td className="px-3 py-2 text-muted-foreground">{e.description}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === "tax" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Gross Revenue</div><div className="text-xl font-bold">{formatCurrency(mtdRevenue)}</div></div>
                  <div className="rounded-lg bg-destructive/10 p-3"><div className="text-xs text-muted-foreground">Tax Payable (8%)</div><div className="text-xl font-bold text-destructive">{formatCurrency(taxPayable)}</div></div>
                  <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Input Tax (Est.)</div><div className="text-xl font-bold">{formatCurrency(purchases.reduce((s, p) => s + p.total, 0) * 0.08)}</div></div>
                  <div className="rounded-lg bg-success/10 p-3"><div className="text-xs text-muted-foreground">Net Tax Due</div><div className="text-xl font-bold text-success">{formatCurrency(taxPayable - purchases.reduce((s, p) => s + p.total, 0) * 0.08)}</div></div>
                </div>
              </div>
            )}

            {(activeReport === "profit" || activeReport === "monthly") && (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="profit" fill="var(--color-success)" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {(activeReport === "purchase") && (
              <div className="overflow-hidden rounded-lg border border-border max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                    <tr><th className="px-3 py-2 text-left">PO</th><th className="px-3 py-2 text-left">Supplier</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{p.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-3 py-2">{p.supplier}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(p.total)}</td>
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
                  const today = new Date().toDateString();
                  const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
                  const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{todaySales.length}</div><div className="text-xs text-muted-foreground">Orders</div></div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div><div className="text-xs text-muted-foreground">Revenue</div></div>
                      <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-2xl font-bold">{formatCurrency(todayRevenue * 0.3)}</div><div className="text-xs text-muted-foreground">Est. Profit</div></div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
