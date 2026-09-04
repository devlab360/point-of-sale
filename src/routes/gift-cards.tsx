import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GIFT_CARD_STATUSES } from "@/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Gift,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Loader2,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Download,
  Upload,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGiftCardsFn,
  createGiftCardFn,
  updateGiftCardFn,
  addGiftCardBalanceFn,
  deleteGiftCardFn,
} from "@/api/gift-cards";
import { getCustomersFn, createCustomerFn } from "@/api/customers";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: `Gift Cards · ${appName}` }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: giftCardsData,
    isLoading: isGiftCardsLoading,
    isError: isGiftCardsError,
    refetch: refetchGiftCards,
  } = useQuery({
    queryKey: ["giftCards", orgId],
    queryFn: async () => ((await getGiftCardsFn({ data: {} })) as any)?.data || [],
  });
  const giftCards: any[] = giftCardsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: { page: 1, pageSize: 500 } })) as any)?.data || [],
  });
  const customers: any[] = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [topUpItem, setTopUpItem] = useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.status ? 1 : 0;

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [expiresDate, setExpiresDate] = useState<string>("");

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const generateCardCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "GC-";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const {
    errors: giftErrors,
    validate: validateGift,
    clearError: clearGiftError,
    clearAll: clearGiftAll,
  } = useFormValidation({
    code: {
      required: t("cardCodeRequired", "Card code is required"),
      minLength: { value: 4, message: t("cardCodeMinLen", "Code must be at least 4 characters") },
    },
    initialBalance: {
      required: t("initialBalanceRequired", "Initial balance is required"),
      positive: t("balanceMustBePositive", "Balance must be a positive number"),
    },
    expires: {
      required: t("expiryDateRequired", "Expiry date is required"),
    },
  });

  const handleOpenAdd = () => {
    setEditItem(null);
    setSelectedCustomerId("");
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    setExpiresDate(defaultExpiry.toISOString().split("T")[0]);
    clearGiftAll();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setSelectedCustomerId(item.customer || "");
    setExpiresDate(item.expires ? item.expires.split("T")[0] : "");
    clearGiftAll();
    setIsAddOpen(true);
  };

  const filteredCards = useMemo(() => {
    let list = [...giftCards];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.code?.toLowerCase().includes(q) ||
          c.customer?.toLowerCase().includes(q),
      );
    }
    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    return list;
  }, [giftCards, debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const paginatedCards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const metrics = useMemo(() => {
    const totalCount = giftCards.length;
    const activeCount = giftCards.filter((c) => c.status === "active").length;
    const totalBalance = giftCards.reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);
    const totalIssued = giftCards.reduce(
      (sum, c) => sum + (parseFloat(c.initialBalance || c.balance) || 0),
      0,
    );
    return { totalCount, activeCount, totalBalance, totalIssued };
  }, [giftCards]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string)?.trim().toUpperCase();
    const initialBalance = parseFloat(formData.get("initialBalance") as string);
    const status = (formData.get("status") as any) || "active";

    const isValid = validateGift({
      code,
      initialBalance: String(initialBalance || ""),
      expires: expiresDate,
    });
    if (!isValid) {
      const firstError = Object.values(giftErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    setIsSaving(true);
    try {
      if (editItem) {
        await updateGiftCardFn({
          data: {
            id: editItem.id,
            updates: {
              code,
              customer: selectedCustomerId || "Walk-in",
              status,
              expires: expiresDate,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift card updated successfully");
      } else {
        await createGiftCardFn({
          data: {
            card: {
              code,
              customer: selectedCustomerId || "Walk-in",
              balance: initialBalance.toFixed(2),
              initialBalance: initialBalance.toFixed(2),
              status,
              issued: new Date().toISOString(),
              expires: expiresDate,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift card issued successfully");
      }
      setIsAddOpen(false);
      setEditItem(null);
      clearGiftAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpItem || !topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast.error("Please enter a valid recharge amount");
      return;
    }
    setIsTopUpLoading(true);
    try {
      await addGiftCardBalanceFn({
        data: {
          id: topUpItem.id,
          amount: parseFloat(topUpAmount),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
      toast.success(`Successfully added ${formatCurrency(parseFloat(topUpAmount))} to card`);
      setTopUpItem(null);
      setTopUpAmount("");
    } catch {
      toast.error("Failed to add balance");
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      giftCards.map((c) => ({
        Code: c.code,
        Customer: c.customer || "Walk-in",
        "Initial Balance": c.initialBalance || c.balance,
        "Current Balance": c.balance,
        Status: c.status,
        Issued: c.issued ? c.issued.split("T")[0] : "",
        Expires: c.expires ? c.expires.split("T")[0] : "",
      })),
      [
        { key: "Code", label: t("cardCode", "Card Code") },
        { key: "Customer", label: t("customer", "Customer") },
        { key: "Initial Balance", label: t("initialBalance", "Initial Balance") },
        { key: "Current Balance", label: t("currentBalance", "Current Balance") },
        { key: "Status", label: t("status", "Status") },
        { key: "Issued", label: t("issuedDate", "Issued Date") },
        { key: "Expires", label: t("expiryDate", "Expiry Date") },
      ],
      "gift-cards-export",
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
        if (row["Code"] || row["Card Code"]) {
          const code = row["Code"] || row["Card Code"];
          const balance = parseFloat(row["Current Balance"] || row["Initial Balance"] || "0");
          await createGiftCardFn({
            data: {
              card: {
                code,
                customer: row["Customer"] || "Walk-in",
                balance: balance.toFixed(2),
                initialBalance: balance.toFixed(2),
                status: (row["Status"] as any) || "active",
                issued: new Date().toISOString(),
                expires: new Date(Date.now() + 365 * 86400000).toISOString(),
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
      toast.success(`Successfully imported ${count} gift cards`);
    } catch {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteGiftCardFn({ data: { id: deleteId } });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift Card deleted");
        setDeleteId(null);
      } catch {
        toast.error("Failed to delete gift card");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
        accept=".csv"
        className="hidden"
      />

      <PageHeader
        title={t("giftCardsVouchers", "Gift Cards & Vouchers")}
        description={t("giftCardsDesc", "Issue stored-value customer gift cards, track live balances, top-ups, and expirations.")}
        actions={
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
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex"
            >
              <Upload className="size-4 mr-1.5" />
              {t("importCSV", "Import CSV")}
            </Button>
            <Button size="sm" onClick={handleOpenAdd} className="shadow-soft">
              <Plus className="size-4 mr-1.5" />
              {t("issueGiftCard", "Issue Gift Card")}
            </Button>
          </>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalIssued", "Total Issued")}
          value={String(metrics.totalCount)}
          icon={Gift}
          accent="primary"
        />
        <StatCard
          label={t("activeCards", "Active Cards")}
          value={String(metrics.activeCount)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("totalIssuedValue", "Total Issued Value")}
          value={formatCurrency(metrics.totalIssued)}
          icon={CreditCard}
          accent="info"
        />
        <StatCard
          label={t("availableBalance", "Available Balance")}
          value={formatCurrency(metrics.totalBalance)}
          icon={DollarSign}
          accent="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchGiftCardsPlaceholder", "Search by card code or recipient...")}
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
                <SheetTitle className="text-lg font-bold">{t("filterGiftCards", "Filter Gift Cards")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("cardStatus", "Card Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allStatuses", "All Statuses") },
                      ...GIFT_CARD_STATUSES.map((g) => ({ value: g.value, label: g.label })),
                    ]}
                    value={draftFilters.status}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                    placeholder={t("filterByStatus", "Filter by Status")}
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
      </div>

      {/* Main Table / Mobile Card View */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
        {isGiftCardsLoading ? (
          <TableSkeleton columns={8} rows={5} />
        ) : isGiftCardsError ? (
          <ErrorState onRetry={refetchGiftCards} />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("cardCode", "Card Code")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("recipientCustomer", "Recipient / Customer")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("issuedDate", "Issued Date")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("expiryDate", "Expiry Date")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("initialValue", "Initial Value")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("currentBalance", "Current Balance")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                      {t("status", "Status")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("actions", "Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <EmptyState
                          icon={Gift}
                          title={t("noGiftCardsFound", "No gift cards found")}
                          description={
                            search
                              ? t("noGiftCardsMatchQuery", "No gift cards matched your search query.")
                              : t("noGiftCardsYet", "You haven't issued any gift cards yet.")
                          }
                          actionLabel={t("issueGiftCard", "Issue Gift Card")}
                          onAction={handleOpenAdd}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCards.map((g) => (
                      <TableRow key={g.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-sm text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Gift className="size-4" />
                            </div>
                            <span>{g.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">
                          {g.customer || t("walkInCustomer", "Walk-in Customer")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {g.issued ? formatDate(g.issued) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {g.expires ? formatDate(g.expires) : t("never", "Never")}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {formatCurrency(Number(g.initialBalance) || Number(g.balance) || 0)}
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-primary whitespace-nowrap">
                          {formatCurrency(Number(g.balance) || 0)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              g.status === "active"
                                ? "bg-success/15 text-success border-success/25"
                                : g.status === "expired"
                                  ? "bg-destructive/15 text-destructive border-destructive/25"
                                  : "bg-muted text-muted-foreground border-border/60"
                            }`}
                          >
                            {g.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                              onClick={() => {
                                setTopUpItem(g);
                                setTopUpAmount("");
                              }}
                              title={t("topUp", "Top-up")}
                            >
                              <RefreshCw className="mr-1 size-3.5" /> {t("topUp", "Top-up")}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg"
                                >
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(g)}
                                  className="text-xs font-semibold cursor-pointer"
                                >
                                  <Edit2 className="mr-2 size-3.5" /> {t("editCard", "Edit Card")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive text-xs font-semibold cursor-pointer"
                                  onClick={() => setDeleteId(g.id)}
                                >
                                  <Trash2 className="mr-2 size-3.5" /> {t("delete", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {paginatedCards.length === 0 ? (
                <EmptyState
                  icon={Gift}
                  title={t("noGiftCardsFound", "No gift cards found")}
                  description={t("noGiftCardsYet", "You haven't issued any gift cards yet.")}
                  actionLabel={t("issueGiftCard", "Issue Gift Card")}
                  onAction={handleOpenAdd}
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                paginatedCards.map((g) => (
                  <div
                    key={g.id}
                    className="relative rounded-xl border border-border/80 bg-card p-3.5 shadow-soft space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Gift className="size-4" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-sm text-foreground">
                            {g.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.customer || t("walkInCustomer", "Walk-in Customer")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          g.status === "active"
                            ? "bg-success/15 text-success border-success/25"
                            : g.status === "expired"
                              ? "bg-destructive/15 text-destructive border-destructive/25"
                              : "bg-muted text-muted-foreground border-border/60"
                        }`}
                      >
                        {g.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          {t("balance", "Balance")}
                        </span>
                        <span className="text-base font-black text-primary">
                          {formatCurrency(Number(g.balance) || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          {t("expires", "Expires")}
                        </span>
                        <span className="font-medium text-foreground">
                          {g.expires ? formatDate(g.expires) : t("never", "Never")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => {
                          setTopUpItem(g);
                          setTopUpAmount("");
                        }}
                      >
                        <RefreshCw className="mr-1 size-3.5" /> {t("topUp", "Top-up")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => handleOpenEdit(g)}
                      >
                        <Edit2 className="mr-1 size-3.5" /> {t("edit", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(g.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredCards.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredCards.length}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Issue / Edit Gift Card Drawer */}
      <Sheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearGiftAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Gift className="size-5 text-primary" />
              <span>{editItem ? t("editGiftCardProfile", "Edit Gift Card Profile") : t("issueNewGiftCard", "Issue New Gift Card")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("issueGiftCardDesc", "Issue stored-value customer gift cards or vouchers for store purchases.")}
            </p>
          </SheetHeader>
          <form noValidate onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="code">
                    {t("cardCodeVoucherNo", "Card Code / Voucher Number")} <span className="text-destructive">*</span>
                  </Label>
                  {!editItem && (
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = generateCardCode();
                        const el = document.getElementById("code") as HTMLInputElement;
                        if (el) el.value = newCode;
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="size-3" /> {t("autoGenerate", "Auto-generate")}
                    </button>
                  )}
                </div>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editItem?.code || generateCardCode()}
                  className={`uppercase font-mono text-sm tracking-wider font-bold ${
                    giftErrors.code ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  onChange={() => clearGiftError("code")}
                />
                <FieldError message={giftErrors.code} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer">{t("customerRecipient", "Customer / Recipient")}</Label>
                <SearchableSelect
                  options={customers.map((c: any) => ({ value: c.name, label: c.name }))}
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  placeholder={t("selectCustomerWalkIn", "Select customer or leave blank for Walk-in...")}
                  onCreate={async (name) => {
                    const res = await createCustomerFn({ data: { customer: { name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                      return name;
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="initialBalance">
                    {t("initialBalance", "Initial Balance")} ({currencySymbol}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="initialBalance"
                    name="initialBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 100.00"
                    defaultValue={editItem?.initialBalance || editItem?.balance || "50.00"}
                    className={
                      giftErrors.initialBalance
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                    onChange={() => clearGiftError("initialBalance")}
                  />
                  <FieldError message={giftErrors.initialBalance} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">{t("cardStatus", "Card Status")}</Label>
                  <SearchableSelect
                    options={GIFT_CARD_STATUSES.map((g) => ({ value: g.value, label: g.label }))}
                    value={editItem?.status || "active"}
                    onChange={() => {}}
                    placeholder={t("selectStatus", "Select Status")}
                  />
                  <input type="hidden" name="status" value={editItem?.status || "active"} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expires">
                  {t("expiryDate", "Expiry Date")} <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  name="expires"
                  date={expiresDate}
                  onDateChange={(d) => {
                    setExpiresDate(d ? d.toISOString().split("T")[0] : "");
                    clearGiftError("expires");
                  }}
                />
                <FieldError message={giftErrors.expires} />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearGiftAll();
                }}
              >
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[150px]">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                {editItem ? t("saveChanges", "Save Changes") : t("issueGiftCard", "Issue Gift Card")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Top-up Balance Drawer */}
      <Sheet
        open={!!topUpItem}
        onOpenChange={(open) => {
          if (!open) {
            setTopUpItem(null);
            setTopUpAmount("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <RefreshCw className="size-5 text-primary" />
              <span>{t("topUpGiftCardBalance", "Top-up Gift Card Balance")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("addCreditToCard", "Add credit to card.")}
            </p>
          </SheetHeader>
          <form onSubmit={handleTopUpSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="rounded-xl bg-muted/40 border border-border/80 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("currentBalance", "Current Balance")}:</span>
                  <span className="font-black text-foreground">
                    {formatCurrency(Number(topUpItem?.balance) || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("recipient", "Recipient")}:</span>
                  <span className="font-semibold text-foreground">
                    {topUpItem?.customer || t("walkInCustomer", "Walk-in Customer")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topUpAmount">
                  {t("rechargeAmount", "Recharge Amount")} ({currencySymbol}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="topUpAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 50.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTopUpItem(null);
                  setTopUpAmount("");
                }}
              >
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isTopUpLoading} className="min-w-[140px]">
                {isTopUpLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("addBalance", "Add Balance")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGiftCardTitle", "Delete Gift Card?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteGiftCardDesc", "This action cannot be undone. This will permanently delete the gift card record and its balance.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
