import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Calendar,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Loader2,
  MoreVertical,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGiftCardsFn,
  createGiftCardFn,
  updateGiftCardFn,
  updateGiftCardStatusFn,
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

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: "Gift Cards · OneDesk360" }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: giftCardsData,
    isLoading: isGiftCardsLoading,
    isError: isGiftCardsError,
    refetch: refetchGiftCards,
  } = useQuery({
    queryKey: ["giftCards", orgId],
    queryFn: async () => ((await getGiftCardsFn({ data: {} })) as any)?.data || [],
  });
  const giftCards = giftCardsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [topUpItem, setTopUpItem] = useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [expiresDate, setExpiresDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredCards = useMemo(() => {
    let list = giftCards;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (c) => c.code?.toLowerCase().includes(lower) || c.customer?.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    return list;
  }, [giftCards, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCards.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [filteredCards.length, page, pageSize]);

  const totalPages = Math.ceil(filteredCards.length / pageSize);
  const paginatedCards = filteredCards.slice((page - 1) * pageSize, page * pageSize);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = giftCards.length;
    const activeCount = giftCards.filter((c) => c.status === "active").length;
    const totalIssued = giftCards.reduce(
      (acc, c) => acc + (Number(c.initialBalance) || Number(c.balance) || 0),
      0,
    );
    const totalBalance = giftCards.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    return { totalCount, activeCount, totalIssued, totalBalance };
  }, [giftCards]);

  const {
    errors: giftErrors,
    validate: validateGift,
    clearError: clearGiftError,
    clearAll: clearGiftAll,
  } = useFormValidation({
    code: { required: "Card code is required" },
    initialBalance: {
      required: "Initial balance is required",
      positive: "Balance must be positive",
    },
    expires: { required: "Expiry date is required" },
  });

  const generateCardCode = () => {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    return `GC-${p1}-${p2}`;
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setSelectedCustomerId("");
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    setExpiresDate(oneYearLater.toISOString().split("T")[0]);
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);
    try {
      const code = (formData.get("code") as string)?.trim();
      const customer =
        selectedCustomerId || (formData.get("customer") as string) || "Walk-in Customer";
      const initialBalanceStr = (formData.get("initialBalance") as string)?.trim();
      const status = (formData.get("status") as string) || "active";

      const isValid = validateGift({
        code,
        initialBalance: initialBalanceStr,
        expires: expiresDate,
      });
      if (!isValid) {
        setIsSaving(false);
        return;
      }

      const initialBalance = parseFloat(initialBalanceStr);

      if (editItem) {
        await updateGiftCardFn({
          data: {
            card: {
              id: editItem.id,
              code,
              customer,
              balance: initialBalance.toFixed(2),
              initialBalance: initialBalance.toFixed(2),
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
              customer,
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
    } catch (error) {
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
        { key: "Code", label: "Card Code" },
        { key: "Customer", label: "Customer" },
        { key: "Initial Balance", label: "Initial Balance" },
        { key: "Current Balance", label: "Current Balance" },
        { key: "Status", label: "Status" },
        { key: "Issued", label: "Issued Date" },
        { key: "Expires", label: "Expiry Date" },
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
    } catch (error) {
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
      } catch (error) {
        toast.error("Failed to delete gift card");
      }
    }
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Gift Cards & Vouchers"
        description="Issue stored-value customer gift cards, track live balances, top-ups, and expirations."
        primaryAction={{ label: "Issue Gift Card", onClick: handleOpenAdd }}
        searchPlaceholder="Search by card code or recipient..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[40vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Card Status
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    ...GIFT_CARD_STATUSES.map((g) => ({ value: g.value, label: g.label })),
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
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
        )}
        topContent={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Issued
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Gift className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">
                {metrics.totalCount}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-success/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Cards
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-success">
                {metrics.activeCount}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-blue-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Issued Value
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CreditCard className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">
                {formatCurrency(metrics.totalIssued)}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Available Balance
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-primary">
                {formatCurrency(metrics.totalBalance)}
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Table / Card Container */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {isGiftCardsLoading ? (
              <TableSkeleton columns={7} rows={5} />
            ) : isGiftCardsError ? (
              <ErrorState onRetry={refetchGiftCards} />
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Card Code
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Recipient / Customer
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Issued Date
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          Expiry Date
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Initial Value
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Current Balance
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {paginatedCards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-64 text-center">
                            <EmptyState
                              icon={Gift}
                              title="No gift cards found"
                              description={
                                search
                                  ? "No gift cards matched your search query."
                                  : "You haven't issued any gift cards yet."
                              }
                              actionLabel="Issue Gift Card"
                              onAction={handleOpenAdd}
                              className="border-none bg-transparent my-0 py-8 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedCards.map((g) => (
                          <TableRow key={g.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-mono font-bold text-sm text-foreground whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                                  <Gift className="size-4" />
                                </div>
                                <span>{g.code}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground whitespace-nowrap">
                              {g.customer || "Walk-in Customer"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                              {g.issued ? formatDate(g.issued) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                              {g.expires ? formatDate(g.expires) : "Never"}
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
                                  title="Add Balance"
                                >
                                  <RefreshCw className="mr-1 size-3.5" /> Top-up
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
                                      <Edit2 className="mr-2 size-3.5" /> Edit Card
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive text-xs font-semibold cursor-pointer"
                                      onClick={() => setDeleteId(g.id)}
                                    >
                                      <Trash2 className="mr-2 size-3.5" /> Delete
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

                {/* Mobile Cards View (< 768px) */}
                <div className="block md:hidden p-3 space-y-3">
                  {paginatedCards.length === 0 ? (
                    <EmptyState
                      icon={Gift}
                      title="No gift cards found"
                      description="You haven't issued any gift cards yet."
                      actionLabel="Issue Gift Card"
                      onAction={handleOpenAdd}
                      className="border-none bg-transparent my-0 py-6 shadow-none"
                    />
                  ) : (
                    paginatedCards.map((g) => (
                      <div
                        key={g.id}
                        className="relative rounded-xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
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
                                {g.customer || "Walk-in Customer"}
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
                              Balance
                            </span>
                            <span className="text-base font-black text-primary">
                              {formatCurrency(Number(g.balance) || 0)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Expires
                            </span>
                            <span className="font-medium text-foreground">
                              {g.expires ? formatDate(g.expires) : "Never"}
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
                            <RefreshCw className="mr-1 size-3.5" /> Top-up
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold"
                            onClick={() => handleOpenEdit(g)}
                          >
                            <Edit2 className="mr-1 size-3.5" /> Edit
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

                {/* Pagination Controls */}
                {filteredCards.length > 0 && (
                  <div className="border-t border-border p-3 sm:p-4">
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
        </div>
      </DataPage>

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
              <span>{editItem ? "Edit Gift Card Profile" : "Issue New Gift Card"}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issue stored-value customer gift cards or vouchers for store purchases.
            </p>
          </SheetHeader>
          <form noValidate onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="code">
                    Card Code / Voucher Number <span className="text-destructive">*</span>
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
                      <Sparkles className="size-3" /> Auto-generate
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
                <Label htmlFor="customer">Customer / Recipient</Label>
                <SearchableSelect
                  options={customers.map((c) => ({ value: c.name, label: c.name }))}
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  placeholder="Select customer or leave blank for Walk-in..."
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
                    Initial Balance ({currencySymbol}) <span className="text-destructive">*</span>
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
                  <Label htmlFor="status">Card Status</Label>
                  <SearchableSelect
                    options={GIFT_CARD_STATUSES.map((g) => ({ value: g.value, label: g.label }))}
                    value={editItem?.status || "active"}
                    onChange={() => {}}
                    placeholder="Select Status"
                  />
                  <input type="hidden" name="status" value={editItem?.status || "active"} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expires">
                  Expiry Date <span className="text-destructive">*</span>
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
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[150px]">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                {editItem ? "Save Changes" : "Issue Gift Card"}
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
              <span>Top-up Gift Card Balance</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add credit to <strong>{topUpItem?.code}</strong> ({topUpItem?.customer || "Walk-in"}).
            </p>
          </SheetHeader>
          <form onSubmit={handleTopUpSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="rounded-xl bg-muted/40 border border-border/80 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-black text-foreground">
                    {formatCurrency(Number(topUpItem?.balance) || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-semibold text-foreground">
                    {topUpItem?.customer || "Walk-in Customer"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topUpAmount">
                  Recharge Amount ({currencySymbol}) <span className="text-destructive">*</span>
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
                Cancel
              </Button>
              <Button type="submit" disabled={isTopUpLoading} className="min-w-[140px]">
                {isTopUpLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                Add Balance
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gift Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the gift card record and
              its balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
