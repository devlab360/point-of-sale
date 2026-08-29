import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/useDebounce";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAccountsFn,
  createAccountFn,
  updateAccountFn,
  deleteAccountFn,
  seedDefaultAccountsFn,
  getVouchersFn,
  createVoucherFn,
} from "@/api/finance";
import { useCurrency } from "@/lib/currency";
import {
  Wallet,
  Plus,
  ArrowRightLeft,
  BookOpen,
  Layers,
  Loader2,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  History,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Chart of Accounts & Vouchers · OneDesk360" }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const { formatDateTime, formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawAccountsData, isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounts", orgId],
    queryFn: async () => {
      const res = (await getAccountsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const rawAccounts: any[] = Array.isArray(rawAccountsData) ? rawAccountsData : [];

  const { data: vouchersData, isLoading: isVouchersLoading } = useQuery({
    queryKey: ["vouchers", orgId],
    queryFn: async () => {
      const res = (await getVouchersFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const rawVouchers: any[] = Array.isArray(vouchersData) ? vouchersData : [];

  const [activeTab, setActiveTab] = useState<"accounts" | "vouchers">("accounts");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);

  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isPostingVoucher, setIsPostingVoucher] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [accountType, setAccountType] = useState("asset");

  // Pagination & Filter State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ type: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "" });
  const activeFilterCount = filters.type ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ type: "" });
    setDraftFilters({ type: "" });
  };

  const filteredVouchers = useMemo(() => {
    let filtered = Array.isArray(rawVouchers) ? rawVouchers : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.voucherNo?.toLowerCase().includes(lower) ||
          v.narration?.toLowerCase().includes(lower) ||
          v.debitAccountName?.toLowerCase().includes(lower) ||
          v.creditAccountName?.toLowerCase().includes(lower),
      );
    }
    if (filters.type) {
      filtered = filtered.filter((v) => v.type === filters.type);
    }
    return Array.isArray(filtered) ? [...filtered].reverse() : [];
  }, [rawVouchers, debouncedSearch, filters.type]);

  const totalPages = Math.ceil((filteredVouchers?.length || 0) / pageSize) || 1;
  const paginatedVouchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (filteredVouchers || []).slice(start, start + pageSize);
  }, [filteredVouchers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // Voucher Form State
  const [voucherType, setVoucherType] = useState<"payment" | "receipt" | "journal" | "contra">(
    "payment",
  );
  const [debitAccId, setDebitAccId] = useState("");
  const [creditAccId, setCreditAccId] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [narration, setNarration] = useState("");

  const accountsByType = useMemo(() => {
    const list = Array.isArray(rawAccounts) ? rawAccounts : [];
    return {
      asset: list.filter((a) => a.type?.toLowerCase() === "asset"),
      liability: list.filter((a) => a.type?.toLowerCase() === "liability"),
      equity: list.filter((a) => a.type?.toLowerCase() === "equity"),
      income: list.filter((a) => a.type?.toLowerCase() === "income"),
      expense: list.filter((a) => a.type?.toLowerCase() === "expense"),
    };
  }, [rawAccounts]);

  const totalAssets = accountsByType.asset.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilities = accountsByType.liability.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0,
  );
  const totalEquity = accountsByType.equity.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0,
  );

  const {
    errors: accErrors,
    validate: validateAcc,
    clearError: clearAccError,
    clearAll: clearAccAll,
  } = useFormValidation({
    code: { required: "Account code is required" },
    name: { required: "Account name is required" },
  });

  const {
    errors: vchErrors,
    validate: validateVch,
    clearError: clearVchError,
    clearAll: clearVchAll,
  } = useFormValidation({
    debitAccId: { required: "Debit account is required" },
    creditAccId: { required: "Credit account is required" },
    voucherAmount: {
      required: "Voucher amount is required",
      positive: "Amount must be a positive number",
    },
  });

  const handleSeedAccounts = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDefaultAccountsFn({ data: {} });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        toast.success(`Seeded Standard Chart of Accounts successfully!`);
      } else {
        toast.error("Failed to seed standard accounts: " + res.error);
      }
    } catch (err: any) {
      toast.error("Error seeding accounts");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = ((formData.get("code") as string) || "").trim();
    const name = ((formData.get("name") as string) || "").trim();
    const type = (formData.get("type") as any) || accountType || "asset";
    const balance = parseFloat(formData.get("balance") as string) || 0;

    const isValid = validateAcc({ code, name });
    if (!isValid) return;

    setIsSubmittingAccount(true);
    try {
      if (editingAccount) {
        await updateAccountFn({
          data: {
            id: editingAccount.id,
            code,
            name,
            type,
            balance,
          },
        });
        toast.success(`Account "${name}" updated!`);
      } else {
        await createAccountFn({
          data: {
            code,
            name,
            type,
            balance,
            isSystem: false,
          },
        });
        toast.success(`Account "${name}" added to Chart of Accounts!`);
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsAddAccountOpen(false);
      setEditingAccount(null);
      clearAccAll();
    } catch (err) {
      toast.error("Failed to save account");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      const res = await deleteAccountFn({ data: { id: deletingAccount.id } });
      if (res.success) {
        toast.success(`Account "${deletingAccount.name}" deleted.`);
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      } else {
        toast.error("Failed to delete account: " + res.error);
      }
    } catch (err) {
      toast.error("Error deleting account");
    } finally {
      setDeletingAccount(null);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateVch({ debitAccId, creditAccId, voucherAmount });
    if (!isValid) return;

    const amt = parseFloat(voucherAmount);

    if (debitAccId === creditAccId) {
      toast.error("Debit and Credit accounts cannot be the same");
      return;
    }

    const debitAcc = rawAccounts.find((a) => a.id === debitAccId);
    const creditAcc = rawAccounts.find((a) => a.id === creditAccId);
    if (!debitAcc || !creditAcc) return;

    setIsPostingVoucher(true);
    try {
      const vNo = `VCH-${Date.now().toString().slice(-6)}`;
      const res = await createVoucherFn({
        data: {
          voucherNo: vNo,
          date: new Date().toISOString(),
          type: voucherType,
          amount: amt,
          debitAccountId: debitAcc.id,
          debitAccountName: `[${debitAcc.code}] ${debitAcc.name}`,
          creditAccountId: creditAcc.id,
          creditAccountName: `[${creditAcc.code}] ${creditAcc.name}`,
          narration,
        },
      });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["vouchers"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        toast.success(`Voucher ${vNo} posted successfully!`);
        setIsAddVoucherOpen(false);
        setVoucherAmount("");
        setNarration("");
        clearVchAll();
      } else {
        toast.error("Error: " + res.error);
      }
    } catch (err) {
      toast.error("Failed to post voucher");
    } finally {
      setIsPostingVoucher(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawAccounts,
      [
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "type", label: "Category" },
        { key: "balance", label: "Balance" },
      ],
      "chart-of-accounts",
    );
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      let count = 0;
      for (const row of data) {
        const name = row["Name"] || row["name"];
        const code = row["Code"] || row["code"] || `ACC-${1000 + count}`;
        const type = (row["Category"] || row["type"] || "asset").toLowerCase();
        const balance = parseFloat(row["Balance"] || row["balance"] || "0");

        if (name) {
          await createAccountFn({
            data: {
              code,
              name,
              type,
              balance,
              isSystem: false,
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(`Successfully imported ${count} accounts`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  // Account Ledger Transactions
  const ledgerTransactions = useMemo(() => {
    if (!selectedLedgerAccount) return [];
    const accId = selectedLedgerAccount.id;
    return rawVouchers
      .filter((v) => v.debitAccountId === accId || v.creditAccountId === accId)
      .map((v) => {
        const isDebit = v.debitAccountId === accId;
        return {
          ...v,
          isDebit,
          debitAmt: isDebit ? Number(v.amount) : 0,
          creditAmt: !isDebit ? Number(v.amount) : 0,
        };
      });
  }, [selectedLedgerAccount, rawVouchers]);

  const categoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "asset":
        return "bg-primary/10 text-primary border-primary/20";
      case "liability":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "equity":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "income":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "expense":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Double-Entry Financial Accounting"
        description="Manage Chart of Accounts, General Ledgers, and Double-Entry Journal Vouchers."
        primaryAction={{
          label: activeTab === "accounts" ? "Add Ledger Account" : "Post New Voucher",
          onClick: () => {
            if (activeTab === "accounts") {
              setEditingAccount(null);
              setAccountType("asset");
              setIsAddAccountOpen(true);
            } else {
              setIsAddVoucherOpen(true);
            }
          },
        }}
        searchPlaceholder={
          activeTab === "vouchers" ? "Search vouchers..." : "Search accounts by name or code..."
        }
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={activeTab === "accounts" ? rawAccounts.length === 0 : rawVouchers.length === 0}
        onExport={activeTab === "accounts" ? handleExport : undefined}
        onImport={activeTab === "accounts" ? handleImport : undefined}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={
          activeTab === "vouchers"
            ? ({ close }) => (
                <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label>Voucher Type</Label>
                      <SearchableSelect
                        options={[
                          { value: "", label: "All Types" },
                          { value: "payment", label: "Payment" },
                          { value: "receipt", label: "Receipt" },
                          { value: "journal", label: "Journal" },
                          { value: "contra", label: "Contra" },
                        ]}
                        value={draftFilters.type}
                        onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                        placeholder="Filter by Type"
                      />
                    </div>
                  </div>
                  <div className="pt-4 mt-auto">
                    <Button
                      className="w-full font-bold shadow-soft"
                      onClick={() => {
                        setFilters(draftFilters);
                        close();
                      }}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )
            : undefined
        }
      >
        {/* Navigation Tabs and Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "accounts" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("accounts")}
              className="gap-1.5 font-bold shadow-soft rounded-xl text-xs h-9"
            >
              <Layers className="size-4" /> Chart of Accounts ({rawAccounts.length})
            </Button>
            <Button
              variant={activeTab === "vouchers" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("vouchers")}
              className="gap-1.5 font-bold shadow-soft rounded-xl text-xs h-9"
            >
              <BookOpen className="size-4" /> Journal & Vouchers ({rawVouchers.length})
            </Button>
          </div>

          {activeTab === "accounts" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedAccounts}
              disabled={isSeeding}
              className="font-bold text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5 h-9"
            >
              {isSeeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Seed Standard Accounts
            </Button>
          )}
        </div>

        {activeTab === "accounts" ? (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5 text-left card-interactive shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                    Total Enterprise Assets
                  </span>
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-primary mt-2">
                  {formatCurrency(totalAssets)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cash, Bank Accounts, Receivables & Stock
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card p-5 text-left card-interactive shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Total Liabilities
                  </span>
                  <TrendingDown className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {formatCurrency(totalLiabilities)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Accounts Payable, Supplier Dues & Taxes
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-card p-5 text-left card-interactive shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Owner's Equity
                  </span>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {formatCurrency(totalEquity || totalAssets - totalLiabilities)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Net Capital Investment & Retained Earnings
                </p>
              </div>
            </div>

            {/* Empty State with Fast Seed CTA */}
            {rawAccounts.length === 0 && !isAccountsLoading ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-soft flex flex-col items-center justify-center space-y-4">
                <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-soft">
                  <Layers className="size-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-lg font-black text-foreground">No Chart of Accounts Set Up</h3>
                  <p className="text-xs text-muted-foreground">
                    Set up double-entry ledger accounts for Cash, Bank, Sales, Payables, and Expenses, or initialize the standard predefined chart in one click.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={handleSeedAccounts} disabled={isSeeding} className="font-bold text-xs shadow-soft">
                    {isSeeding ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                    Initialize Standard Chart of Accounts
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingAccount(null);
                      setIsAddAccountOpen(true);
                    }}
                    className="font-bold text-xs"
                  >
                    <Plus className="size-4 mr-1.5" /> Create Custom Account
                  </Button>
                </div>
              </div>
            ) : (
              /* Categorized Accounts Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {(["asset", "liability", "equity", "income", "expense"] as const).map((cat) => {
                  const items = accountsByType[cat] || [];
                  const catTotal = items.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
                  return (
                    <div
                      key={cat}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-card space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2.5">
                          <Badge variant="outline" className={`capitalize font-black text-xs px-2.5 py-0.5 ${categoryColor(cat)}`}>
                            {cat} Accounts
                          </Badge>
                          <span className="text-xs text-muted-foreground font-semibold">
                            ({items.length})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-black text-foreground">
                          Total: {formatCurrency(catTotal)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {items.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 p-3 text-xs transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <span className="font-mono text-muted-foreground font-bold text-xs bg-muted px-2 py-0.5 rounded-md shrink-0">
                                {acc.code}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-foreground block truncate">{acc.name}</span>
                                {acc.isSystem && (
                                  <span className="text-[10px] text-muted-foreground">Standard System Head</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-black text-sm text-foreground">
                                {formatCurrency(acc.balance)}
                              </span>
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                  title="View Account Ledger"
                                  onClick={() => setSelectedLedgerAccount(acc)}
                                >
                                  <History className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Account"
                                  onClick={() => {
                                    setEditingAccount(acc);
                                    setAccountType(acc.type);
                                    setIsAddAccountOpen(true);
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                {!acc.isSystem && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Delete Account"
                                    onClick={() => setDeletingAccount(acc)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Vouchers List Tab */
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Debit Account (+)</TableHead>
                      <TableHead>Credit Account (-)</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Narration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                          {search || filters.type
                            ? "No vouchers match your search query."
                            : 'No journal vouchers posted yet. Click "Post New Voucher" to record transactions.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVouchers.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                            {v.voucherNo}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(v.date)}
                          </TableCell>
                          <TableCell className="font-medium uppercase text-xs whitespace-nowrap">
                            <Badge variant="outline" className="capitalize text-[10px] font-bold">
                              {v.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary whitespace-nowrap text-xs">
                            {v.debitAccountName}
                          </TableCell>
                          <TableCell className="font-bold text-muted-foreground whitespace-nowrap text-xs">
                            {v.creditAccountName}
                          </TableCell>
                          <TableCell className="number text-right font-black text-foreground whitespace-nowrap text-sm">
                            {formatCurrency(v.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] whitespace-nowrap">
                            {v.narration || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Feed */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {filteredVouchers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    No vouchers found
                  </p>
                ) : (
                  paginatedVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-primary">
                          {v.voucherNo}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold capitalize">
                          {v.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Debit (+):</span>
                          <span className="font-bold text-primary">{v.debitAccountName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Credit (-):</span>
                          <span className="font-bold text-muted-foreground">{v.creditAccountName}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(v.date)}
                        </span>
                        <span className="number text-sm font-black text-foreground">
                          {formatCurrency(v.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {rawVouchers.length > 0 && (
                <div className="border-t border-border/60 p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    totalItems={filteredVouchers.length}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      {/* Account Ledger Drawer */}
      <Sheet
        open={!!selectedLedgerAccount}
        onOpenChange={(open) => !open && setSelectedLedgerAccount(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <History className="size-5 text-primary" />
                <span>Account Ledger Statement</span>
              </SheetTitle>
              <Badge variant="outline" className={`capitalize font-black text-xs ${categoryColor(selectedLedgerAccount?.type || "asset")}`}>
                {selectedLedgerAccount?.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
              <div>
                <span className="text-sm font-bold text-foreground block">
                  [{selectedLedgerAccount?.code}] {selectedLedgerAccount?.name}
                </span>
                <span className="text-xs text-muted-foreground">Detailed double-entry ledger history</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Balance</span>
                <span className="text-lg font-black text-primary">
                  {formatCurrency(selectedLedgerAccount?.balance || 0)}
                </span>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {ledgerTransactions.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <FileSpreadsheet className="size-8 mx-auto text-muted-foreground/50" />
                <p>No journal vouchers recorded against this account yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date / Voucher</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead className="text-right text-primary">Debit (+)</TableHead>
                      <TableHead className="text-right text-muted-foreground">Credit (-)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <span className="font-mono font-bold text-primary block">{tx.voucherNo}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.narration || `${tx.type.toUpperCase()} Entry`}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {tx.debitAmt > 0 ? formatCurrency(tx.debitAmt) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {tx.creditAmt > 0 ? formatCurrency(tx.creditAmt) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add / Edit Account Drawer */}
      <Sheet
        open={isAddAccountOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddAccountOpen(false);
            setEditingAccount(null);
            clearAccAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Wallet className="size-5 text-primary" />
              <span>{editingAccount ? "Edit Ledger Account" : "Add Ledger Account"}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingAccount
                ? "Update general ledger head code, title, and initial balance."
                : "Create a new general ledger head in your Chart of Accounts."}
            </p>
          </SheetHeader>
          <form noValidate onSubmit={handleSaveAccount} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">
                    Account Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editingAccount?.code || ""}
                    placeholder="e.g. 5003"
                    className={
                      accErrors.code ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    onChange={() => clearAccError("code")}
                  />
                  <FieldError message={accErrors.code} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Account Category *</Label>
                  <input type="hidden" name="type" value={accountType} />
                  <SearchableSelect
                    options={[
                      { value: "asset", label: "Asset (Cash, Bank, Receivables)" },
                      { value: "liability", label: "Liability (Payables, Taxes Due)" },
                      { value: "equity", label: "Equity (Capital, Retained Earnings)" },
                      { value: "income", label: "Income (Sales, Fees, Services)" },
                      { value: "expense", label: "Expense (Rent, Wages, Utilities)" },
                    ]}
                    value={accountType}
                    onChange={(val) => setAccountType(val as any)}
                    placeholder="Select Category..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Account Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingAccount?.name || ""}
                  placeholder="e.g. Marketing & Advertising Expense"
                  className={
                    accErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearAccError("name")}
                />
                <FieldError message={accErrors.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balance">Opening Balance ({currencySymbol})</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue={editingAccount?.balance || "0"}
                />
              </div>
            </div>
            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddAccountOpen(false);
                  setEditingAccount(null);
                  clearAccAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAccount} className="min-w-[140px] font-bold">
                {isSubmittingAccount && <Loader2 className="size-4 animate-spin mr-2" />}
                {editingAccount ? "Update Account" : "Save Account"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Post Voucher Drawer */}
      <Sheet
        open={isAddVoucherOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddVoucherOpen(false);
            clearVchAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ArrowRightLeft className="size-5 text-primary" />
              <span>Post Journal / Payment Voucher</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record double-entry debit and credit transactions with automatic ledger balance updating.
            </p>
          </SheetHeader>
          <form noValidate onSubmit={handleCreateVoucher} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label>Voucher Type</Label>
                <SearchableSelect
                  options={[
                    { value: "payment", label: "Payment Voucher (Cash Out / Expense Payment)" },
                    { value: "receipt", label: "Receipt Voucher (Cash In / Customer Collection)" },
                    { value: "contra", label: "Contra Voucher (Cash to Bank / Inter-Bank Transfer)" },
                    { value: "journal", label: "Journal Voucher (Adjustment / Adjustment Entry)" },
                  ]}
                  value={voucherType}
                  onChange={(val) => setVoucherType(val as any)}
                  placeholder="Select Voucher Type"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Debit Account (+) <span className="text-destructive">*</span>
                  </Label>
                  <div className={vchErrors.debitAccId ? "rounded-md border border-destructive" : ""}>
                    <SearchableSelect
                      options={rawAccounts.map((a: any) => ({
                        value: a.id,
                        label: `[${a.code}] ${a.name}`,
                      }))}
                      value={debitAccId}
                      onChange={(val) => {
                        setDebitAccId(val);
                        clearVchError("debitAccId");
                      }}
                      placeholder="-- Select Debit Head --"
                    />
                  </div>
                  <FieldError message={vchErrors.debitAccId} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Credit Account (-) <span className="text-destructive">*</span>
                  </Label>
                  <div className={vchErrors.creditAccId ? "rounded-md border border-destructive" : ""}>
                    <SearchableSelect
                      options={rawAccounts.map((a: any) => ({
                        value: a.id,
                        label: `[${a.code}] ${a.name}`,
                      }))}
                      value={creditAccId}
                      onChange={(val) => {
                        setCreditAccId(val);
                        clearVchError("creditAccId");
                      }}
                      placeholder="-- Select Credit Head --"
                    />
                  </div>
                  <FieldError message={vchErrors.creditAccId} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Voucher Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={voucherAmount}
                  onChange={(e) => {
                    setVoucherAmount(e.target.value);
                    clearVchError("voucherAmount");
                  }}
                  placeholder="0.00"
                  className={
                    vchErrors.voucherAmount ? "border-destructive focus-visible:ring-destructive font-bold text-base" : "font-bold text-base"
                  }
                />
                <FieldError message={vchErrors.voucherAmount} />
              </div>

              <div className="space-y-1.5">
                <Label>Narration / Journal Reference</Label>
                <Input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. Monthly facility rent paid via primary bank transfer"
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddVoucherOpen(false);
                  clearVchAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPostingVoucher} className="min-w-[160px] font-bold">
                {isPostingVoucher && <Loader2 className="size-4 animate-spin mr-2" />}
                Post Voucher Entry
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ledger Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete account <strong>[{deletingAccount?.code}] {deletingAccount?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
