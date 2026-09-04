import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAccountsFn, getVouchersFn } from "@/api/finance";
import { appName } from "@/lib/env";
import { getSalesFn } from "@/api/sales";
import { getExpensesFn } from "@/api/expenses";
import { getPurchasesFn } from "@/api/purchases";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Scale,
  TrendingUp,
  BookOpen,
  ArrowRightLeft,
  DollarSign,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PersistStore } from "@/lib/session-store";
import { usePreferences } from "@/contexts/PreferencesContext";
import { exportToCSV } from "@/lib/csv";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { printAccountingStatement } from "@/lib/accounting-print";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DATE_PERIOD_OPTIONS } from "@/constants";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/accounting-reports")({
  head: () => ({ meta: [{ title: `Accounting Financial Reports · ${appName}` }] }),
  component: AccountingReportsPage,
});

function AccountingReportsPage() {
  const { t } = useLanguage();
  const { formatCurrency, currencySymbol } = useCurrency();
  const { formatDate, formatDateTime } = usePreferences();
  const { saasOrg, settings } = useAuth();
  const orgId = PersistStore.getOrgId() || "default";

  const [activeTab, setActiveTab] = useState<string>("trial-balance");
  const [dateRange, setDateRange] = useState<"all" | "this_month" | "last_month" | "this_year">(
    "all",
  );
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>("all");

  const {
    data: accountsRes,
    isLoading: isAccountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["accounts", orgId],
    queryFn: () => getAccountsFn({ data: {} }),
  });

  const { data: vouchersRes, isLoading: isVouchersLoading } = useQuery({
    queryKey: ["vouchers", orgId],
    queryFn: () => getVouchersFn({ data: {} }),
  });

  const { data: salesRes, isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: () => getSalesFn({ data: {} }),
  });

  const { data: expensesRes, isLoading: isExpensesLoading } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: () => getExpensesFn({ data: {} }),
  });

  const { data: purchasesRes, isLoading: isPurchasesLoading } = useQuery({
    queryKey: ["purchases", orgId],
    queryFn: () => getPurchasesFn({ data: {} }),
  });

  const accounts: any[] = (accountsRes as any)?.data || [];
  const vouchers: any[] = (vouchersRes as any)?.data || [];
  const sales: any[] = (salesRes as any)?.data || [];
  const expenses: any[] = (expensesRes as any)?.data || [];
  const purchases: any[] = (purchasesRes as any)?.data || [];

  const isLoading = isAccountsLoading || isVouchersLoading || isSalesLoading || isExpensesLoading;

  // Filter vouchers by date range
  const filteredVouchers = useMemo(() => {
    if (dateRange === "all") return vouchers;
    const now = new Date();
    return vouchers.filter((v) => {
      const d = new Date(v.date);
      if (dateRange === "this_month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === "last_month") {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear();
      }
      if (dateRange === "this_year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [vouchers, dateRange]);

  // 1. Trial Balance Calculation
  let totalDebit = 0;
  let totalCredit = 0;

  const trialBalanceData = accounts.map((acc: any) => {
    let debit = 0;
    let credit = 0;
    const bal = Number(acc.balance) || 0;
    const typeLower = (acc.type || "").toLowerCase();

    // Standard accounting normal balances
    if (["asset", "expense"].includes(typeLower)) {
      if (bal >= 0) debit = bal;
      else credit = Math.abs(bal);
    } else {
      if (bal >= 0) credit = bal;
      else debit = Math.abs(bal);
    }

    totalDebit += debit;
    totalCredit += credit;

    return { ...acc, debit, credit };
  });

  // 2. Balance Sheet Categorization
  const assets = accounts.filter((a: any) => (a.type || "").toLowerCase() === "asset");
  const liabilities = accounts.filter((a: any) => (a.type || "").toLowerCase() === "liability");
  const equity = accounts.filter((a: any) => (a.type || "").toLowerCase() === "equity");

  const totalAssets = assets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilities = liabilities.reduce(
    (sum: number, a: any) => sum + (Number(a.balance) || 0),
    0,
  );
  const totalEquity = equity.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  // 3. Profit & Loss Statement (Income Statement)
  const incomeAccounts = accounts.filter((a: any) => (a.type || "").toLowerCase() === "income");
  const expenseAccounts = accounts.filter((a: any) => (a.type || "").toLowerCase() === "expense");

  const totalSalesRevenue = sales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
  const accountIncome = incomeAccounts.reduce(
    (sum: number, a: any) => sum + (Number(a.balance) || 0),
    0,
  );
  const grossRevenue = Math.max(totalSalesRevenue, accountIncome);

  const totalPurchasesCost = purchases.reduce(
    (sum: number, p: any) => sum + (Number(p.total) || 0),
    0,
  );
  const cogsAccount = expenseAccounts.find(
    (a: any) =>
      a.code === "5001" ||
      a.name?.toLowerCase().includes("cogs") ||
      a.name?.toLowerCase().includes("cost of goods"),
  );
  const costOfGoodsSold = Number(cogsAccount?.balance) || totalPurchasesCost;

  const grossProfit = grossRevenue - costOfGoodsSold;

  const otherExpenses = expenseAccounts.filter((a: any) => a.id !== cogsAccount?.id);
  const totalOtherExpenses =
    otherExpenses.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0) ||
    expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  const netOperatingProfit = grossProfit - totalOtherExpenses;
  const netMarginPct = grossRevenue > 0 ? (netOperatingProfit / grossRevenue) * 100 : 0;

  // 4. General Ledger Transactions
  const ledgerRows = useMemo(() => {
    let rows = filteredVouchers;
    if (selectedLedgerAccountId !== "all") {
      rows = rows.filter(
        (v) =>
          v.debitAccountId === selectedLedgerAccountId ||
          v.creditAccountId === selectedLedgerAccountId,
      );
    }
    return rows;
  }, [filteredVouchers, selectedLedgerAccountId]);

  const datePeriodLabels: Record<string, string> = {
    all: t("allTime", "All Time"),
    this_month: t("thisMonth", "This Month"),
    last_month: t("lastMonth", "Last Month"),
    this_year: t("thisYear", "This Year"),
  };

  const handleExportTrialBalance = () => {
    exportToCSV(
      trialBalanceData,
      [
        { key: "code", label: t("accountCode", "Account Code") },
        { key: "name", label: t("accountTitle", "Account Title") },
        { key: "type", label: t("accountType", "Account Type") },
        { key: "debit", label: t("debitAmount", "Debit Amount") },
        { key: "credit", label: t("creditAmount", "Credit Amount") },
      ],
      "trial-balance",
    );
  };

  const handlePrint = () => {
    const storeTitle = settings?.storeName || saasOrg?.name || `${appName} Store`;
    const periodStr = datePeriodLabels[dateRange] || t("allTime", "All Time");
    const currSym = currencySymbol || "₹";

    if (activeTab === "trial-balance") {
      printAccountingStatement({
        reportType: "trial-balance",
        storeName: storeTitle,
        periodLabel: periodStr,
        currencySymbol: currSym,
        t,
        data: {
          accounts: trialBalanceData,
          totalDebit,
          totalCredit,
        },
      });
    } else if (activeTab === "balance-sheet") {
      printAccountingStatement({
        reportType: "balance-sheet",
        storeName: storeTitle,
        periodLabel: periodStr,
        currencySymbol: currSym,
        t,
        data: {
          assets,
          liabilities,
          equity,
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalLiabilitiesAndEquity,
          isBalanced,
        },
      });
    } else if (activeTab === "pnl") {
      printAccountingStatement({
        reportType: "pnl",
        storeName: storeTitle,
        periodLabel: periodStr,
        currencySymbol: currSym,
        t,
        data: {
          grossRevenue,
          costOfGoodsSold,
          grossProfit,
          otherExpenses,
          totalOtherExpenses,
          netOperatingProfit,
          netMarginPct,
          incomeAccounts,
        },
      });
    } else if (activeTab === "ledger") {
      printAccountingStatement({
        reportType: "ledger",
        storeName: storeTitle,
        periodLabel: periodStr,
        currencySymbol: currSym,
        t,
        data: {
          ledgerRows,
        },
      });
    }
  };

  if (accountsError) {
    return (
      <div className="page-container space-y-6">
        <PageHeader
          title={t("financialAccountingReports", "Financial Accounting Reports")}
          description={t(
            "financialReportsSubtitle",
            "Generate Trial Balance, Balance Sheet, and Profit & Loss Statements.",
          )}
        />
        <ErrorState
          title={t("failedToLoadAccountingData", "Failed to load accounting data")}
          description={t(
            "couldNotRetrieveAccountingData",
            "Could not retrieve account ledgers and journal vouchers. Please retry.",
          )}
          onRetry={() => refetchAccounts()}
        />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("financialAccountingReports", "Financial Accounting Reports")}
        description={t(
          "financialReportsDescription",
          "Double-entry Trial Balance, Balance Sheet, Income Statement, and General Ledgers.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-bold text-xs h-9"
            >
              <Printer className="size-3.5" /> {t("printStatement", "Print Statement")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTrialBalance}
              className="gap-1.5 font-bold text-xs h-9"
            >
              <FileSpreadsheet className="size-3.5 text-primary" /> {t("exportCsv", "Export CSV")}
            </Button>
          </div>
        }
      />
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Accounting KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 to-card p-4 shadow-card">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-black uppercase">
                <span>{t("totalAssets", "Total Assets")}</span>
                <Scale className="size-4 text-primary" />
              </div>
              <div className="text-xl font-black text-primary mt-1">
                {formatCurrency(totalAssets)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("cashReceivablesStock", "Cash, receivables & stock")}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-amber-500/5 to-card p-4 shadow-card">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-black uppercase">
                <span>{t("totalLiabilities", "Total Liabilities")}</span>
                <ArrowRightLeft className="size-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(totalLiabilities)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("payablesTaxesDue", "Payables & taxes due")}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-emerald-500/5 to-card p-4 shadow-card">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-black uppercase">
                <span>{t("grossTradingRevenue", "Gross Trading Revenue")}</span>
                <DollarSign className="size-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(grossRevenue)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("fromSalesRevenueHeads", "From sales & revenue heads")}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-cyan-500/5 to-card p-4 shadow-card">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-black uppercase">
                <span>{t("netOperatingMargin", "Net Operating Margin")}</span>
                <TrendingUp className="size-4 text-cyan-500" />
              </div>
              <div
                className={`text-xl font-black mt-1 ${netOperatingProfit >= 0 ? "text-cyan-600 dark:text-cyan-400" : "text-destructive"}`}
              >
                {formatCurrency(netOperatingProfit)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t("margin", "Margin")}: {netMarginPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Financial Statements Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <TabsList className="bg-muted/60 p-1 rounded-2xl h-auto flex-wrap">
                <TabsTrigger
                  value="trial-balance"
                  className="font-bold text-xs rounded-xl px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-soft"
                >
                  <Layers className="size-3.5 mr-1.5" /> {t("trialBalance", "Trial Balance")}
                </TabsTrigger>
                <TabsTrigger
                  value="balance-sheet"
                  className="font-bold text-xs rounded-xl px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-soft"
                >
                  <Scale className="size-3.5 mr-1.5" /> {t("balanceSheet", "Balance Sheet")}
                </TabsTrigger>
                <TabsTrigger
                  value="pnl"
                  className="font-bold text-xs rounded-xl px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-soft"
                >
                  <TrendingUp className="size-3.5 mr-1.5" /> {t("incomeStatementPnl", "Income Statement (P&L)")}
                </TabsTrigger>
                <TabsTrigger
                  value="ledger"
                  className="font-bold text-xs rounded-xl px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-soft"
                >
                  <BookOpen className="size-3.5 mr-1.5" /> {t("generalLedger", "General Ledger")}
                </TabsTrigger>
              </TabsList>

              {/* Date Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase hidden sm:inline">
                  {t("period", "Period:")}
                </span>
                <div className="flex bg-muted/60 rounded-xl p-1 border border-border/60">
                  {DATE_PERIOD_OPTIONS.filter((o) =>
                    ["all", "this_month", "last_month", "this_year"].includes(o.value),
                  ).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setDateRange(r.value as any)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${dateRange === r.value ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1. Trial Balance Content */}
            <TabsContent value="trial-balance" className="mt-0 outline-none space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-black text-foreground">
                        {t("trialBalanceStatement", "Trial Balance Statement")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t("trialBalanceDescription", "Double-entry verification ensuring Total Debits equal Total Credits.")}
                      </CardDescription>
                    </div>
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                      <Badge
                        variant="outline"
                        className="bg-success/15 text-success border-success/30 font-bold text-xs py-1 px-3"
                      >
                        <CheckCircle2 className="size-3.5 mr-1.5" /> {t("balanced", "Balanced")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-bold text-xs py-1 px-3">
                        <AlertCircle className="size-3.5 mr-1.5" /> {t("discrepancy", "Discrepancy:")}{" "}
                        {formatCurrency(Math.abs(totalDebit - totalCredit))}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-xl border border-border/80 overflow-x-auto bg-card">
                    <Table className="min-w-[700px] text-xs">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-28 font-bold">{t("code", "Code")}</TableHead>
                          <TableHead className="font-bold">{t("accountTitle", "Account Title")}</TableHead>
                          <TableHead className="font-bold">{t("category", "Category")}</TableHead>
                          <TableHead className="text-right w-44 font-bold text-primary">
                            {t("debitPlus", "Debit (+)")}
                          </TableHead>
                          <TableHead className="text-right w-44 font-bold text-muted-foreground">
                            {t("creditMinus", "Credit (-)")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/60">
                        {trialBalanceData.map((acc: any) => (
                          <TableRow key={acc.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-bold text-muted-foreground">
                              {acc.code}
                            </TableCell>
                            <TableCell className="font-bold text-foreground">{acc.name}</TableCell>
                            <TableCell>
                              <span className="capitalize font-semibold text-muted-foreground">
                                {acc.type}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-primary">
                              {acc.debit > 0 ? formatCurrency(acc.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-foreground">
                              {acc.credit > 0 ? formatCurrency(acc.credit) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {trialBalanceData.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="p-12 text-center text-muted-foreground text-xs"
                            >
                              {t("noLedgerAccountsFound", "No ledger accounts found. Go to Chart of Accounts to add or seed accounts.")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <tfoot className="bg-muted/40 font-black border-t-2 border-border/80 text-sm">
                        <tr>
                          <td
                            colSpan={3}
                            className="p-3.5 text-right uppercase tracking-wider text-xs font-black"
                          >
                            {t("grandStatementTotal", "Grand Statement Total")}
                          </td>
                          <td className="p-3.5 text-right font-mono text-primary font-black">
                            {formatCurrency(totalDebit)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-primary font-black">
                            {formatCurrency(totalCredit)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Balance Sheet Content */}
            <TabsContent value="balance-sheet" className="mt-0 outline-none space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-black text-foreground">
                        {t("balanceSheetStatement", "Balance Sheet Statement")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t("balanceSheetDescription", "Enterprise financial position: Assets = Total Liabilities + Equity Capital.")}
                      </CardDescription>
                    </div>
                    {isBalanced ? (
                      <Badge
                        variant="outline"
                        className="bg-success/15 text-success border-success/30 font-bold text-xs py-1 px-3"
                      >
                        <CheckCircle2 className="size-3.5 mr-1.5" /> {t("equationBalanced", "Equation Balanced")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-bold text-xs py-1 px-3">
                        {t("variance", "Variance:")}{" "}
                        {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6 items-start">
                    {/* Left: Assets Side */}
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-primary/10 p-3.5 border-b border-border/60 font-black uppercase tracking-wider flex justify-between text-xs text-primary">
                          <span>{t("totalEnterpriseAssets", "Total Enterprise Assets")}</span>
                          <span className="font-mono">{formatCurrency(totalAssets)}</span>
                        </div>
                        <Table className="text-xs">
                          <TableBody className="divide-y divide-border/60">
                            {assets.map((acc: any) => (
                              <TableRow key={acc.id} className="hover:bg-muted/20">
                                <TableCell className="p-3 pl-4 font-bold text-foreground">
                                  <span className="font-mono text-muted-foreground mr-2 text-[11px]">
                                    [{acc.code}]
                                  </span>
                                  {acc.name}
                                </TableCell>
                                <TableCell className="p-3 pr-4 text-right font-mono font-black">
                                  {formatCurrency(Number(acc.balance) || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {assets.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  className="p-6 text-center text-muted-foreground text-xs"
                                >
                                  {t("noAssetAccountsRecorded", "No asset accounts recorded")}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Right: Liabilities & Equity Side */}
                    <div className="space-y-4">
                      {/* Liabilities */}
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-amber-500/10 p-3.5 border-b border-border/60 font-black uppercase tracking-wider flex justify-between text-xs text-amber-600 dark:text-amber-400">
                          <span>{t("totalLiabilities", "Total Liabilities")}</span>
                          <span className="font-mono">{formatCurrency(totalLiabilities)}</span>
                        </div>
                        <Table className="text-xs">
                          <TableBody className="divide-y divide-border/60">
                            {liabilities.map((acc: any) => (
                              <TableRow key={acc.id} className="hover:bg-muted/20">
                                <TableCell className="p-3 pl-4 font-bold text-foreground">
                                  <span className="font-mono text-muted-foreground mr-2 text-[11px]">
                                    [{acc.code}]
                                  </span>
                                  {acc.name}
                                </TableCell>
                                <TableCell className="p-3 pr-4 text-right font-mono font-black">
                                  {formatCurrency(Number(acc.balance) || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {liabilities.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  className="p-6 text-center text-muted-foreground text-xs"
                                >
                                  {t("noLiabilityAccountsRecorded", "No liability accounts recorded")}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Equity */}
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-emerald-500/10 p-3.5 border-b border-border/60 font-black uppercase tracking-wider flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                          <span>{t("ownersEquityAndRetainedCapital", "Owner's Equity & Retained Capital")}</span>
                          <span className="font-mono">{formatCurrency(totalEquity)}</span>
                        </div>
                        <Table className="text-xs">
                          <TableBody className="divide-y divide-border/60">
                            {equity.map((acc: any) => (
                              <TableRow key={acc.id} className="hover:bg-muted/20">
                                <TableCell className="p-3 pl-4 font-bold text-foreground">
                                  <span className="font-mono text-muted-foreground mr-2 text-[11px]">
                                    [{acc.code}]
                                  </span>
                                  {acc.name}
                                </TableCell>
                                <TableCell className="p-3 pr-4 text-right font-mono font-black">
                                  {formatCurrency(Number(acc.balance) || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {equity.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  className="p-6 text-center text-muted-foreground text-xs"
                                >
                                  {t("noEquityAccountsRecorded", "No equity accounts recorded")}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Total Liabilities & Equity Summary */}
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center text-xs font-black text-foreground">
                        <span className="uppercase tracking-wider">
                          {t("totalLiabilitiesAndEquity", "Total Liabilities & Equity:")}
                        </span>
                        <span className="font-mono font-black text-base text-primary">
                          {formatCurrency(totalLiabilitiesAndEquity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Profit & Loss Statement Content */}
            <TabsContent value="pnl" className="mt-0 outline-none space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-black text-foreground">
                        {t("profitAndLossStatement", "Profit & Loss Statement (Income Statement)")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t(
                          "pnlDescription",
                          "Trading revenue, Cost of Goods Sold, operating overheads, and Net Operating Income.",
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-black text-xs py-1 px-3 ${netOperatingProfit >= 0 ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                    >
                      {t("netIncome", "Net Income:")} {formatCurrency(netOperatingProfit)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="rounded-xl border border-border/80 overflow-hidden bg-card text-xs">
                    <div className="bg-muted/40 p-3 font-black uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      1. {t("operatingRevenueAndIncome", "Operating Revenue & Income")}
                    </div>
                    <Table>
                      <TableBody className="divide-y divide-border/60">
                        <TableRow>
                          <TableCell className="font-bold pl-5">
                            {t("grossPosTradingRevenue", "Gross Point-of-Sale Trading Revenue")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black pr-5">
                            {formatCurrency(grossRevenue)}
                          </TableCell>
                        </TableRow>
                        {incomeAccounts.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="pl-5 text-muted-foreground">
                              [{a.code}] {a.name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold pr-5">
                              {formatCurrency(a.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-xl border border-border/80 overflow-hidden bg-card text-xs">
                    <div className="bg-muted/40 p-3 font-black uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      2. {t("costOfSalesCogs", "Cost of Sales / COGS")}
                    </div>
                    <Table>
                      <TableBody className="divide-y divide-border/60">
                        <TableRow>
                          <TableCell className="font-bold pl-5">
                            {t("costOfGoodsSoldPurchases", "Cost of Goods Sold (Purchases & Inventories)")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black pr-5 text-destructive">
                            - {formatCurrency(costOfGoodsSold)}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5 font-black">
                          <TableCell className="pl-5 text-primary text-sm">
                            {t("grossTradingProfit", "Gross Trading Profit")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-primary text-sm pr-5">
                            {formatCurrency(grossProfit)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-xl border border-border/80 overflow-hidden bg-card text-xs">
                    <div className="bg-muted/40 p-3 font-black uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      3. {t("operatingExpensesOverheads", "Operating Expenses & Overheads")}
                    </div>
                    <Table>
                      <TableBody className="divide-y divide-border/60">
                        {otherExpenses.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="pl-5 font-bold">
                              [{a.code}] {a.name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold pr-5 text-destructive">
                              - {formatCurrency(a.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {otherExpenses.length === 0 && (
                          <TableRow>
                            <TableCell className="pl-5 font-bold">
                              {t("generalOperatingExpenses", "General Operating Expenses")}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold pr-5 text-destructive">
                              - {formatCurrency(totalOtherExpenses)}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/30 font-black text-sm">
                          <TableCell className="pl-5">{t("netOperatingProfitLoss", "Net Operating Profit / (Loss)")}</TableCell>
                          <TableCell
                            className={`text-right font-mono font-black pr-5 text-sm ${netOperatingProfit >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {formatCurrency(netOperatingProfit)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. General Ledger Tab Content */}
            <TabsContent value="ledger" className="mt-0 outline-none space-y-4">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-black text-foreground">
                        {t("generalLedgerJournalAudit", "General Ledger Journal Audit")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t("generalLedgerDescription", "Chronological record of all double-entry debit and credit vouchers.")}
                      </CardDescription>
                    </div>

                    <div className="w-full sm:w-72">
                      <SearchableSelect
                        options={[
                          { value: "all", label: t("allLedgerAccounts", "All Ledger Accounts") },
                          ...accounts.map((a) => ({
                            value: a.id,
                            label: `[${a.code}] ${a.name}`,
                          })),
                        ]}
                        value={selectedLedgerAccountId}
                        onChange={(val) => setSelectedLedgerAccountId(val)}
                        placeholder={t("filterByAccount", "Filter by Account...")}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-xl border border-border/80 overflow-x-auto bg-card">
                    <Table className="min-w-[800px] text-xs">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead>{t("voucherNumber", "Voucher #")}</TableHead>
                          <TableHead>{t("date", "Date")}</TableHead>
                          <TableHead>{t("type", "Type")}</TableHead>
                          <TableHead>{t("debitAccountPlus", "Debit Account (+)")}</TableHead>
                          <TableHead>{t("creditAccountMinus", "Credit Account (-)")}</TableHead>
                          <TableHead className="text-right">{t("amount", "Amount")}</TableHead>
                          <TableHead>{t("narration", "Narration")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/60">
                        {ledgerRows.map((v: any) => (
                          <TableRow key={v.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                              {v.voucherNo}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {formatDateTime(v.date)}
                            </TableCell>
                            <TableCell className="uppercase font-semibold">
                              <Badge variant="outline" className="text-[10px] font-bold capitalize">
                                {v.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-primary whitespace-nowrap">
                              {v.debitAccountName}
                            </TableCell>
                            <TableCell className="font-bold text-foreground whitespace-nowrap">
                              {v.creditAccountName}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-foreground whitespace-nowrap">
                              {formatCurrency(v.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-[200px]">
                              {v.narration || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {ledgerRows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="p-12 text-center text-muted-foreground text-xs"
                            >
                              {t("noVouchersMatchFilter", "No journal vouchers match the selected period or account.")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
