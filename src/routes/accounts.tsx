import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";
import { localDb, type LocalAccount, type LocalVoucher } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Wallet, Plus, ArrowRightLeft, BookOpen, Layers, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Chart of Accounts & Vouchers · Grocer.Pro" }] }),
  component: AccountsPage,
});

const DEFAULT_ACCOUNTS: Omit<LocalAccount, "id">[] = [
  { code: "1001", name: "Cash in Hand", type: "asset", balance: 15000, isSystem: true },
  { code: "1002", name: "Bank Account (Main)", type: "asset", balance: 45000, isSystem: true },
  { code: "1003", name: "Accounts Receivable (Customer Due)", type: "asset", balance: 8500, isSystem: true },
  { code: "1004", name: "Merchandise Inventory", type: "asset", balance: 32000, isSystem: true },
  { code: "2001", name: "Accounts Payable (Supplier Due)", type: "liability", balance: 6200, isSystem: true },
  { code: "2002", name: "VAT / Sales Tax Payable", type: "liability", balance: 1400, isSystem: true },
  { code: "3001", name: "Owner Capital Account", type: "equity", balance: 80000, isSystem: true },
  { code: "4001", name: "Sales Revenue", type: "income", balance: 94000, isSystem: true },
  { code: "5001", name: "Rent & Utilities Expense", type: "expense", balance: 4200, isSystem: true },
  { code: "5002", name: "Employee Salaries Expense", type: "expense", balance: 6500, isSystem: true },
];

function AccountsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const rawAccounts = useLiveQuery(() => localDb.accounts.toArray()) || [];
  const rawVouchers = useLiveQuery(() => localDb.vouchers.toArray()) || [];

  const [activeTab, setActiveTab] = useState<"accounts" | "vouchers">("accounts");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isPostingVoucher, setIsPostingVoucher] = useState(false);
  const [accountType, setAccountType] = useState("asset");

  // Pagination state
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
    let filtered = rawVouchers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        v => v.voucherNo.toLowerCase().includes(lower) || 
             v.narration?.toLowerCase().includes(lower) ||
             v.debitAccountName.toLowerCase().includes(lower) ||
             v.creditAccountName.toLowerCase().includes(lower)
      );
    }
    if (filters.type) {
      filtered = filtered.filter(v => v.type === filters.type);
    }
    return [...filtered].reverse();
  }, [rawVouchers, debouncedSearch, filters.type]);

  const totalPages = Math.ceil(filteredVouchers.length / pageSize);
  const paginatedVouchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // Initialize default Chart of Accounts if empty
  useEffect(() => {
    const seedAccounts = async () => {
      const count = await localDb.accounts.count();
      if (count === 0) {
        for (const acc of DEFAULT_ACCOUNTS) {
          await localDb.accounts.add({ id: uuidv4(), ...acc });
        }
      }
    };
    seedAccounts();
  }, []);

  // Voucher Form State
  const [voucherType, setVoucherType] = useState<"payment" | "receipt" | "journal" | "contra">("payment");
  const [debitAccId, setDebitAccId] = useState("");
  const [creditAccId, setCreditAccId] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [narration, setNarration] = useState("");

  const accountsByType = useMemo(() => {
    return {
      asset: rawAccounts.filter((a) => a.type === "asset"),
      liability: rawAccounts.filter((a) => a.type === "liability"),
      equity: rawAccounts.filter((a) => a.type === "equity"),
      income: rawAccounts.filter((a) => a.type === "income"),
      expense: rawAccounts.filter((a) => a.type === "expense"),
    };
  }, [rawAccounts]);

  const totalAssets = accountsByType.asset.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accountsByType.liability.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = accountsByType.equity.reduce((sum, a) => sum + a.balance, 0) + (totalAssets - totalLiabilities - accountsByType.equity.reduce((sum, a) => sum + a.balance, 0));

  const { errors: accErrors, validate: validateAcc, clearError: clearAccError, clearAll: clearAccAll } = useFormValidation({
    code: { required: "Account code is required" },
    name: { required: "Account name is required" },
  });

  const { errors: vchErrors, validate: validateVch, clearError: clearVchError, clearAll: clearVchAll } = useFormValidation({
    debitAccId: { required: "Debit account is required" },
    creditAccId: { required: "Credit account is required" },
    voucherAmount: { required: "Voucher amount is required", positive: "Amount must be a positive number" },
  });

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string || "").trim();
    const name = (formData.get("name") as string || "").trim();
    const type = (formData.get("type") as any) || "asset";
    const balance = parseFloat(formData.get("balance") as string) || 0;

    const isValid = validateAcc({ code, name });
    if (!isValid) return;

    setIsSubmittingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await localDb.accounts.add({
        id: uuidv4(),
        code,
        name,
        type,
        balance,
        isSystem: false,
      });
      toast.success(`Account "${name}" added to Chart of Accounts!`);
      setIsAddAccountOpen(false);
      clearAccAll();
    } catch (err) {
      toast.error("Failed to add account");
    } finally {
      setIsSubmittingAccount(false);
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
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const vNo = `VCH-${Date.now().toString().slice(-6)}`;
      await localDb.vouchers.add({
        id: uuidv4(),
        voucherNo: vNo,
        date: new Date().toISOString(),
        type: voucherType,
        debitAccountId: debitAcc.id,
        creditAccountId: creditAcc.id,
        debitAccountName: debitAcc.name,
        creditAccountName: creditAcc.name,
        amount: amt,
        narration,
      });

      // Update Ledger Account Balances (Double-Entry Principle)
      await localDb.accounts.update(debitAcc.id, { balance: debitAcc.balance + amt });
      await localDb.accounts.update(creditAcc.id, { balance: Math.max(0, creditAcc.balance - amt) });

      toast.success(`Voucher ${vNo} posted successfully!`);
      setIsAddVoucherOpen(false);
      setVoucherAmount("");
      setNarration("");
      clearVchAll();
    } catch (err) {
      toast.error("Failed to post voucher");
    } finally {
      setIsPostingVoucher(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="Double-Entry Financial Accounting"
        description="Manage Chart of Accounts, Journal Vouchers, and Ledger balances."
        primaryAction={{
          label: activeTab === "accounts" ? "Add Ledger Account" : "Post New Voucher",
          onClick: () => (activeTab === "accounts" ? setIsAddAccountOpen(true) : setIsAddVoucherOpen(true)),
        }}
        searchPlaceholder={activeTab === "vouchers" ? "Search vouchers..." : ""}
        searchValue={activeTab === "vouchers" ? search : ""}
        onSearchChange={activeTab === "vouchers" ? setSearch : () => {}}
        hideToolbar={activeTab === "accounts" || rawVouchers.length === 0}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={activeTab === "vouchers" ? ({ close }) => (
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
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, type: val }))}
                  placeholder="Filter by Type"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button className="w-full" onClick={() => { setFilters(draftFilters); close(); }}>
                Apply Filters
              </Button>
            </div>
          </div>
        ) : undefined}
      >
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={activeTab === "accounts" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("accounts")}
            className="gap-1.5"
          >
            <Layers className="size-4" /> Chart of Accounts
          </Button>
          <Button
            variant={activeTab === "vouchers" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("vouchers")}
            className="gap-1.5"
          >
            <BookOpen className="size-4" /> Journal & Payment Vouchers ({rawVouchers.length})
          </Button>
        </div>

        {activeTab === "accounts" ? (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Total Assets</div>
                <div className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalAssets)}</div>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Total Liabilities</div>
                <div className="text-2xl font-bold text-destructive mt-1">{formatCurrency(totalLiabilities)}</div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Owner's Net Equity</div>
                <div className="text-2xl font-bold text-success mt-1">{formatCurrency(totalEquity)}</div>
              </div>
            </div>

            {/* Categorized Accounts List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(["asset", "liability", "equity", "income", "expense"] as const).map((cat) => (
                <div key={cat} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Wallet className="size-4" /> {cat} Accounts
                    </h3>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {accountsByType[cat].length} Accounts
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {accountsByType[cat].map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                        <div>
                          <span className="font-mono text-muted-foreground mr-2 font-semibold">[{acc.code}]</span>
                          <span className="font-semibold text-foreground">{acc.name}</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{formatCurrency(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Debit Account</th>
                    <th className="px-4 py-3">Credit Account</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                        {search || filters.type ? "No vouchers match your search." : "No vouchers posted yet. Click \"Post New Voucher\" to create journal entries."}
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{v.voucherNo}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(v.date)}</td>
                        <td className="px-4 py-3 font-medium uppercase text-xs">
                          <Badge variant="outline" className="capitalize">{v.type}</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-destructive">{v.debitAccountName}</td>
                        <td className="px-4 py-3 font-semibold text-success">{v.creditAccountName}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(v.amount)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">{v.narration || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {rawVouchers.length > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </DataPage>

      {/* Add Account Dialog */}
      <Dialog open={isAddAccountOpen} onOpenChange={(open) => {
        if (!open) { setIsAddAccountOpen(false); clearAccAll(); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ledger Account</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateAccount} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Account Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code" name="code" placeholder="e.g. 5003"
                  className={accErrors.code ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={() => clearAccError("code")}
                />
                <FieldError message={accErrors.code} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Category *</Label>
                <input type="hidden" name="type" value={accountType} />
                <SearchableSelect
                  options={[
                    { value: "asset", label: "Asset (সম্পদ)" },
                    { value: "liability", label: "Liability (দায়)" },
                    { value: "equity", label: "Equity (মূলধন)" },
                    { value: "income", label: "Income (আয়)" },
                    { value: "expense", label: "Expense (ব্যয়)" },
                  ]}
                  value={accountType}
                  onChange={(val) => setAccountType(val as any)}
                  placeholder="Select Category..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Account Name <span className="text-destructive">*</span></Label>
              <Input
                id="name" name="name" placeholder="e.g. Marketing & Ad Expense"
                className={accErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                onChange={() => clearAccError("name")}
              />
              <FieldError message={accErrors.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="balance">Opening Balance</Label>
              <Input id="balance" name="balance" type="number" step="0.01" defaultValue="0" />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddAccountOpen(false); clearAccAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingAccount}>
                {isSubmittingAccount && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post Voucher Dialog */}
      <Dialog open={isAddVoucherOpen} onOpenChange={(open) => {
        if (!open) { setIsAddVoucherOpen(false); clearVchAll(); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" />
              <span>Post Journal / Payment Voucher</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateVoucher} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Voucher Type</Label>
              <SearchableSelect
                options={[
                  { value: "payment", label: "Payment Voucher (Cash Out / Expense Payment)" },
                  { value: "receipt", label: "Receipt Voucher (Cash In / Customer Collection)" },
                  { value: "contra", label: "Contra Voucher (Cash to Bank / Bank Transfer)" },
                  { value: "journal", label: "Journal Voucher (Adjustment Entry)" },
                ]}
                value={voucherType}
                onChange={(val) => setVoucherType(val as any)}
                placeholder="Select Voucher Type"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Debit Account (+) <span className="text-destructive">*</span></Label>
                <div className={vchErrors.debitAccId ? "rounded-md border border-destructive" : ""}>
                  <SearchableSelect
                    options={rawAccounts.map(a => ({ value: a.id, label: `[${a.code}] ${a.name}` }))}
                    value={debitAccId}
                    onChange={(val) => { setDebitAccId(val); clearVchError("debitAccId"); }}
                    placeholder="-- Debit Account --"
                  />
                </div>
                <FieldError message={vchErrors.debitAccId} />
              </div>
              <div className="space-y-1.5">
                <Label>Credit Account (-) <span className="text-destructive">*</span></Label>
                <div className={vchErrors.creditAccId ? "rounded-md border border-destructive" : ""}>
                  <SearchableSelect
                    options={rawAccounts.map(a => ({ value: a.id, label: `[${a.code}] ${a.name}` }))}
                    value={creditAccId}
                    onChange={(val) => { setCreditAccId(val); clearVchError("creditAccId"); }}
                    placeholder="-- Credit Account --"
                  />
                </div>
                <FieldError message={vchErrors.creditAccId} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Voucher Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number" step="0.01"
                value={voucherAmount}
                onChange={(e) => { setVoucherAmount(e.target.value); clearVchError("voucherAmount"); }}
                placeholder="0.00"
                className={vchErrors.voucherAmount ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={vchErrors.voucherAmount} />
            </div>

            <div className="space-y-1.5">
              <Label>Narration / Description</Label>
              <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Paid office rent for current month via bank transfer" />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddVoucherOpen(false); clearVchAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isPostingVoucher}>
                {isPostingVoucher && <Loader2 className="size-4 animate-spin mr-2" />}
                Post Voucher Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
