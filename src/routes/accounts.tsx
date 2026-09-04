import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  History,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  Upload,
  Search,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ACCOUNT_TYPES, VOUCHER_TYPES } from "@/constants";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: `Chart of Accounts & Vouchers · ${appName}` }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const { t } = useLanguage();
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
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<any>(null);

  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<"journal" | "payment" | "receipt" | "contra">("journal");
  const [debitAccId, setDebitAccId] = useState("");
  const [creditAccId, setCreditAccId] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [narration, setNarration] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [accountType, setAccountType] = useState<"asset" | "liability" | "equity" | "income" | "expense">("asset");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isPostingVoucher, setIsPostingVoucher] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ type: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.type ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ type: "" });
    setDraftFilters({ type: "" });
  };

  const {
    errors: accErrors,
    validate: validateAcc,
    clearError: clearAccError,
    clearAll: clearAccAll,
  } = useFormValidation({
    code: { required: t("accountCodeRequired", "Account code is required") },
    name: { required: t("accountNameRequired", "Account name is required") },
  });

  const {
    errors: vchErrors,
    validate: validateVch,
    clearError: clearVchError,
    clearAll: clearVchAll,
  } = useFormValidation({
    debitAccId: { required: t("selectDebitAccount", "Select debit account") },
    creditAccId: { required: t("selectCreditAccount", "Select credit account") },
    voucherAmount: {
      required: t("enterValidAmount", "Enter a valid amount"),
      positive: t("amountMustBePositive", "Amount must be greater than zero"),
    },
  });

  const totalAssets = useMemo(
    () =>
      rawAccounts
        .filter((a) => a.type === "asset")
        .reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [rawAccounts],
  );

  const totalLiabilities = useMemo(
    () =>
      rawAccounts
        .filter((a) => a.type === "liability")
        .reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [rawAccounts],
  );

  const totalEquity = useMemo(
    () =>
      rawAccounts
        .filter((a) => a.type === "equity")
        .reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [rawAccounts],
  );

  const totalVouchersSum = useMemo(
    () => rawVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0),
    [rawVouchers],
  );

  const accountsByType = useMemo(() => {
    const grouped: Record<string, any[]> = {
      asset: [],
      liability: [],
      equity: [],
      income: [],
      expense: [],
    };
    rawAccounts.forEach((acc) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        !debouncedSearch ||
        acc.name.toLowerCase().includes(q) ||
        acc.code.toLowerCase().includes(q);

      if (matchSearch) {
        if (grouped[acc.type]) {
          grouped[acc.type].push(acc);
        } else {
          grouped.asset.push(acc);
        }
      }
    });
    return grouped;
  }, [rawAccounts, debouncedSearch]);

  const filteredVouchers = useMemo(() => {
    let list = [...rawVouchers];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (v) =>
          v.voucherNo?.toLowerCase().includes(q) ||
          v.debitAccountName?.toLowerCase().includes(q) ||
          v.creditAccountName?.toLowerCase().includes(q) ||
          v.narration?.toLowerCase().includes(q),
      );
    }
    if (filters.type) {
      list = list.filter((v) => v.type === filters.type);
    }
    return list.reverse();
  }, [rawVouchers, debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / pageSize));
  const paginatedVouchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeTab]);

  const handleSeedAccounts = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDefaultAccountsFn({ data: {} });
      if (res.success) {
        toast.success(t("chartSeededSuccess", "Standard Chart of Accounts seeded successfully!"));
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      } else {
        toast.error(t("failedToSeedChart", "Failed to seed accounts: ") + res.error);
      }
    } catch {
      toast.error(t("errorSeedingAccounts", "Error seeding accounts"));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string) || accountType;
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
        toast.success(t("accountUpdatedSuccess", `Account "${name}" updated!`));
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
        toast.success(t("accountAddedToChart", `Account "${name}" added to Chart of Accounts!`));
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsAddAccountOpen(false);
      setEditingAccount(null);
      clearAccAll();
    } catch {
      toast.error(t("failedToSaveAccount", "Failed to save account"));
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      const res = await deleteAccountFn({ data: { id: deletingAccount.id } });
      if (res.success) {
        toast.success(t("accountDeletedSuccess", `Account "${deletingAccount.name}" deleted.`));
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      } else {
        toast.error(t("failedToDeleteAccount", "Failed to delete account: ") + res.error);
      }
    } catch {
      toast.error(t("errorDeletingAccount", "Error deleting account"));
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
      toast.error(t("debitCreditCannotBeSame", "Debit and Credit accounts cannot be the same"));
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
        toast.success(t("voucherPostedSuccess", `Voucher ${vNo} posted successfully!`));
        setIsAddVoucherOpen(false);
        setVoucherAmount("");
        setNarration("");
        clearVchAll();
      } else {
        toast.error(t("errorPrefix", "Error: ") + res.error);
      }
    } catch {
      toast.error(t("failedToPostVoucher", "Failed to post voucher"));
    } finally {
      setIsPostingVoucher(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawAccounts,
      [
        { key: "code", label: t("code", "Code") },
        { key: "name", label: t("name", "Name") },
        { key: "type", label: t("category", "Category") },
        { key: "balance", label: t("balance", "Balance") },
      ],
      "chart-of-accounts",
    );
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error(t("noDataInCsv", "No data found in the CSV"));
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
      toast.success(t("importedAccountsSuccess", `Successfully imported ${count} accounts`));
    } catch {
      toast.error(t("failedToParseCsv", "Failed to parse CSV file"));
    }
  };

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
    <div className="page-container space-y-6">
      <PageHeader
        title={t("doubleEntryAccounting", "Double-Entry Financial Accounting")}
        description={t(
          "doubleEntryAccountingDesc",
          "Manage Chart of Accounts, General Ledgers, and Double-Entry Journal Vouchers.",
        )}
        actions={
          <>
            {activeTab === "accounts" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="hidden sm:flex"
                >
                  <Download className="size-4 mr-1.5" />
                  {t("exportCSV", "Export CSV")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedAccounts}
                  disabled={isSeeding}
                  className="hidden sm:flex"
                >
                  {isSeeding ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-4 mr-1.5" />
                  )}
                  {t("seedStandardAccounts", "Seed Accounts")}
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (activeTab === "accounts") {
                  setEditingAccount(null);
                  setAccountType("asset");
                  setIsAddAccountOpen(true);
                } else {
                  setIsAddVoucherOpen(true);
                }
              }}
              className="shadow-soft"
            >
              <Plus className="size-4 mr-1.5" />
              {activeTab === "accounts"
                ? t("addLedgerAccount", "Add Ledger Account")
                : t("postNewVoucher", "Post New Voucher")}
            </Button>
          </>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalEnterpriseAssets", "Total Enterprise Assets")}
          value={formatCurrency(totalAssets)}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label={t("totalLiabilities", "Total Liabilities")}
          value={formatCurrency(totalLiabilities)}
          icon={TrendingDown}
          accent="warning"
        />
        <StatCard
          label={t("ownersEquity", "Owner's Equity")}
          value={formatCurrency(totalEquity || totalAssets - totalLiabilities)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("totalVouchers", "Journal Volume")}
          value={formatCurrency(totalVouchersSum)}
          icon={BookOpen}
          accent="info"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "accounts" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("accounts")}
            className="gap-1.5 font-bold shadow-soft rounded-xl text-xs h-9"
          >
            <Layers className="size-4" /> {t("chartOfAccounts", "Chart of Accounts")} ({rawAccounts.length})
          </Button>
          <Button
            variant={activeTab === "vouchers" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("vouchers")}
            className="gap-1.5 font-bold shadow-soft rounded-xl text-xs h-9"
          >
            <BookOpen className="size-4" /> {t("journalAndVouchers", "Journal & Vouchers")} ({rawVouchers.length})
          </Button>
        </div>

        {activeTab === "accounts" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedAccounts}
            disabled={isSeeding}
            className="font-bold text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5 h-9 sm:hidden"
          >
            {isSeeding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {t("seedStandardAccounts", "Seed Standard Accounts")}
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "vouchers"
                ? t("searchVouchersPlaceholder", "Search vouchers...")
                : t("searchAccountsPlaceholder", "Search accounts by name or code...")
            }
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {activeTab === "vouchers" && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5 mr-1" />
                {t("clearFilters", "Clear")}
              </Button>
            )}

            <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 relative">
                  <Filter className="size-3.5 mr-1.5" />
                  {t("filters", "Filters")}
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
                <SheetHeader className="p-5 border-b pr-12 text-left shrink-0">
                  <SheetTitle className="text-lg font-bold">{t("filterVouchers", "Filter Vouchers")}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>{t("voucherType", "Voucher Type")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allTypes", "All Types") },
                        ...VOUCHER_TYPES.map((v) => ({
                          value: v.value,
                          label: v.label.split(" (")[0],
                        })),
                      ]}
                      value={draftFilters.type}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                      placeholder={t("filterByType", "Filter by Type")}
                    />
                  </div>
                </div>
                <div className="border-t p-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 font-bold text-xs"
                    onClick={handleResetFilters}
                  >
                    {t("reset", "Reset")}
                  </Button>
                  <Button
                    className="flex-1 font-bold text-xs"
                    onClick={() => {
                      setFilters(draftFilters);
                      setFilterDrawerOpen(false);
                    }}
                  >
                    {t("applyFilters", "Apply Filters")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      {activeTab === "accounts" ? (
        <div className="space-y-6">
          {rawAccounts.length === 0 && !isAccountsLoading ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-soft flex flex-col items-center justify-center space-y-4">
              <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-soft">
                <Layers className="size-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-black text-foreground">
                  {t("noChartOfAccountsSetUp", "No Chart of Accounts Set Up")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "accountsEmptyDesc",
                    "Set up double-entry ledger accounts for Cash, Bank, Sales, Payables, and Expenses, or initialize the standard predefined chart in one click.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleSeedAccounts}
                  disabled={isSeeding}
                  className="font-bold text-xs shadow-soft"
                >
                  {isSeeding ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  {t("initStandardAccounts", "Initialize Standard Chart of Accounts")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAccount(null);
                    setIsAddAccountOpen(true);
                  }}
                  className="font-bold text-xs"
                >
                  <Plus className="size-4 mr-1.5" /> {t("createCustomAccount", "Create Custom Account")}
                </Button>
              </div>
            </div>
          ) : (
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
                        <Badge
                          variant="outline"
                          className={`capitalize font-black text-xs px-2.5 py-0.5 ${categoryColor(cat)}`}
                        >
                          {t(`${cat}Accounts`, `${cat} Accounts`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-semibold">
                          ({items.length})
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-foreground">
                        {t("total", "Total")}: {formatCurrency(catTotal)}
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
                              <span className="font-bold text-foreground block truncate">
                                {acc.name}
                              </span>
                              {acc.isSystem && (
                                <span className="text-[10px] text-muted-foreground">
                                  {t("standardSystemHead", "Standard System Head")}
                                </span>
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
                                title={t("viewAccountLedger", "View Account Ledger")}
                                onClick={() => setSelectedLedgerAccount(acc)}
                              >
                                <History className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title={t("editAccount", "Edit Account")}
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
                                  title={t("deleteAccount", "Delete Account")}
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
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("voucherNumber", "Voucher #")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("date", "Date")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("type", "Type")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("debitAccountPlus", "Debit Account (+)")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("creditAccountMinus", "Credit Account (-)")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">{t("amount", "Amount")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("narration", "Narration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {filteredVouchers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      {search || filters.type
                        ? t("noVouchersMatchSearch", "No vouchers match your search query.")
                        : t("noVouchersPostedYet", 'No journal vouchers posted yet. Click "Post New Voucher" to record transactions.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVouchers.map((v) => (
                    <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
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
                {t("noVouchersFound", "No vouchers found")}
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
                      <span className="text-muted-foreground block text-[10px]">
                        {t("debitPlus", "Debit (+):")}
                      </span>
                      <span className="font-bold text-primary">{v.debitAccountName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        {t("creditMinus", "Credit (-):")}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {v.creditAccountName}
                      </span>
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
      )}

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
                <span>{t("accountLedgerStatement", "Account Ledger Statement")}</span>
              </SheetTitle>
              <Badge
                variant="outline"
                className={`capitalize font-black text-xs ${categoryColor(selectedLedgerAccount?.type || "asset")}`}
              >
                {selectedLedgerAccount?.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
              <div>
                <span className="text-sm font-bold text-foreground block">
                  [{selectedLedgerAccount?.code}] {selectedLedgerAccount?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("detailedLedgerHistory", "Detailed double-entry ledger history")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  {t("currentBalance", "Current Balance")}
                </span>
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
                <p>{t("noVouchersForAccount", "No journal vouchers recorded against this account yet.")}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t("dateVoucher", "Date / Voucher")}</TableHead>
                      <TableHead>{t("narration", "Narration")}</TableHead>
                      <TableHead className="text-right text-primary">{t("debitPlus", "Debit (+)")}</TableHead>
                      <TableHead className="text-right text-muted-foreground">{t("creditMinus", "Credit (-)")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <span className="font-mono font-bold text-primary block">
                            {tx.voucherNo}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
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
              <span>{editingAccount ? t("editLedgerAccount", "Edit Ledger Account") : t("addLedgerAccount", "Add Ledger Account")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingAccount
                ? t("editAccountSubtitle", "Update general ledger head code, title, and initial balance.")
                : t("addAccountSubtitle", "Create a new general ledger head in your Chart of Accounts.")}
            </p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleSaveAccount}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">
                    {t("accountCode", "Account Code")} <span className="text-destructive">*</span>
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
                  <Label htmlFor="type">{t("accountCategory", "Account Category")} *</Label>
                  <input type="hidden" name="type" value={accountType} />
                  <SearchableSelect
                    options={ACCOUNT_TYPES.map((a) => ({ value: a.value, label: a.label }))}
                    value={accountType}
                    onChange={(val) => setAccountType(val as any)}
                    placeholder={t("selectCategory", "Select Category...")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  {t("accountName", "Account Name")} <span className="text-destructive">*</span>
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
                <Label htmlFor="balance">{t("openingBalance", "Opening Balance")} ({currencySymbol})</Label>
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
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingAccount}
                className="min-w-[140px] font-bold"
              >
                {isSubmittingAccount && <Loader2 className="size-4 animate-spin mr-2" />}
                {editingAccount ? t("updateAccount", "Update Account") : t("saveAccount", "Save Account")}
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
              <span>{t("postJournalPaymentVoucher", "Post Journal / Payment Voucher")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "postVoucherSubtitle",
                "Record double-entry debit and credit transactions with automatic ledger balance updating.",
              )}
            </p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateVoucher}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label>{t("voucherType", "Voucher Type")}</Label>
                <SearchableSelect
                  options={VOUCHER_TYPES.map((v) => ({ value: v.value, label: v.label }))}
                  value={voucherType}
                  onChange={(val) => setVoucherType(val as any)}
                  placeholder={t("selectVoucherType", "Select Voucher Type")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    {t("debitAccountPlus", "Debit Account (+)")} <span className="text-destructive">*</span>
                  </Label>
                  <div
                    className={vchErrors.debitAccId ? "rounded-md border border-destructive" : ""}
                  >
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
                      placeholder={t("selectDebitHead", "-- Select Debit Head --")}
                    />
                  </div>
                  <FieldError message={vchErrors.debitAccId} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t("creditAccountMinus", "Credit Account (-)")} <span className="text-destructive">*</span>
                  </Label>
                  <div
                    className={vchErrors.creditAccId ? "rounded-md border border-destructive" : ""}
                  >
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
                      placeholder={t("selectCreditHead", "-- Select Credit Head --")}
                    />
                  </div>
                  <FieldError message={vchErrors.creditAccId} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  {t("voucherAmount", "Voucher Amount")} <span className="text-destructive">*</span>
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
                    vchErrors.voucherAmount
                      ? "border-destructive focus-visible:ring-destructive font-bold text-base"
                      : "font-bold text-base"
                  }
                />
                <FieldError message={vchErrors.voucherAmount} />
              </div>

              <div className="space-y-1.5">
                <Label>{t("narrationRef", "Narration / Journal Reference")}</Label>
                <Input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder={t("narrationPlaceholder", "e.g. Monthly facility rent paid via primary bank transfer")}
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
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isPostingVoucher} className="min-w-[160px] font-bold">
                {isPostingVoucher && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("postVoucherEntry", "Post Voucher Entry")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteLedgerAccountQuestion", "Delete Ledger Account?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAccountConfirm", "Are you sure you want to delete account")}{" "}
              <strong>
                [{deletingAccount?.code}] {deletingAccount?.name}
              </strong>
              ? {t("actionCannotBeUndone", "This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {t("deleteAccount", "Delete Account")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
