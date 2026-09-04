import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { DatePicker } from "@/components/ui/date-picker";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet,
  TrendingDown,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Plus,
  DollarSign,
  Receipt,
  Download,
  Search,
  Filter,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpensesFn, createExpenseFn, updateExpenseFn, deleteExpenseFn } from "@/api/expenses";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EXPENSE_CATEGORIES, PAYMENT_METHOD_OPTIONS, PAYMENT_STATUSES } from "@/constants";
import { exportToCSV } from "@/lib/csv";
import { usePreferences } from "@/contexts/PreferencesContext";
import { FieldError } from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/useFormValidation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: `Operating Expenses · ${appName}` }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { formatDate } = usePreferences();
  const { t } = useLanguage();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>("");
  const [expenseStatus, setExpenseStatus] = useState<string>("paid");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");

  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => ((await getExpensesFn({ data: {} })) as any)?.data || [],
  });

  const rawExpenses: any[] = expensesData || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ category: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ category: "", status: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = (filters.category ? 1 : 0) + (filters.status ? 1 : 0);

  const handleResetFilters = () => {
    setFilters({ category: "", status: "" });
    setDraftFilters({ category: "", status: "" });
  };

  const {
    errors: expErrors,
    validate: validateExp,
    clearError: clearExpError,
    clearAll: clearExpAll,
  } = useFormValidation({
    category: { required: "Expense category is required" },
    description: { required: "Description is required" },
    amount: {
      required: "Amount is required",
      positive: "Amount must be a positive number",
    },
    date: { required: "Expense date is required" },
  });

  const uniqueCategories = useMemo(() => {
    const list = rawExpenses.map((e: any) => e.category).filter(Boolean);
    const combined = Array.from(
      new Set([...list, ...EXPENSE_CATEGORIES.map((cat: any) => cat.value || cat)]),
    );
    return combined.sort();
  }, [rawExpenses]);

  const filteredExpenses = useMemo(() => {
    let list = [...rawExpenses];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e: any) =>
          e.category?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q),
      );
    }
    if (filters.category) {
      list = list.filter((e: any) => e.category === filters.category);
    }
    if (filters.status) {
      list = list.filter((e: any) => e.status === filters.status);
    }
    return list.reverse();
  }, [rawExpenses, debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const metrics = useMemo(() => {
    const total = rawExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const paid = rawExpenses
      .filter((e) => e.status === "paid")
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const pending = rawExpenses
      .filter((e) => e.status === "pending" || e.status === "unpaid")
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const catMap: Record<string, number> = {};
    rawExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0);
    });
    let maxCat = "None";
    let maxVal = 0;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > maxVal) {
        maxVal = v;
        maxCat = k;
      }
    });

    return { total, paid, pending, maxCat };
  }, [rawExpenses]);

  const handleOpenAdd = (item?: any) => {
    clearExpAll();
    if (item) {
      setEditItem(item);
      setExpenseDate(item.date ? item.date.split("T")[0] : "");
      setExpenseStatus(item.status || "paid");
      setPaymentMethod(item.paymentMethod || "Cash");
    } else {
      setEditItem(null);
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setExpenseStatus("paid");
      setPaymentMethod("Cash");
    }
    setIsAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const category = (formData.get("category") as string)?.trim();
      const description = (formData.get("description") as string)?.trim();
      const amount = (formData.get("amount") as string)?.trim();
      const finalDate = expenseDate || new Date().toISOString().split("T")[0];

      const isValid = validateExp({ category, description, amount });
      if (!isValid) return;

      if (editItem) {
        const res = await updateExpenseFn({
          data: {
            id: editItem.id,
            updates: {
              date: new Date(finalDate).toISOString(),
              category,
              description,
              amount: parseFloat(amount),
              status: expenseStatus,
            },
          },
        });
        if (res?.success) {
          toast.success(t("expenseUpdatedSuccess", "Expense updated successfully"));
          setIsAddOpen(false);
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createExpenseFn({
          data: {
            expense: {
              date: new Date(finalDate).toISOString(),
              category,
              description,
              amount: parseFloat(amount),
              status: expenseStatus,
            },
          },
        });
        if (res?.success) {
          toast.success(t("expenseAddedSuccess", "Expense added successfully"));
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      }
      clearExpAll();
    } catch (error: any) {
      toast.error(error?.message || "An error occurred while saving expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deleteExpenseFn({ data: { id: deleteId } });
        if (res?.success) {
          toast.success(t("expenseDeleted", "Expense record deleted"));
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      } catch {
        toast.error(t("failedToDeleteExpense", "Failed to delete expense"));
      }
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawExpenses,
      [
        { key: "date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ],
      "expenses",
    );
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("operatingExpenses", "Operating Expenses")}
        description={t("manageExpensesDesc", "Track store rent, utility bills, employee payroll, and daily miscellaneous costs.")}
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
              size="sm"
              onClick={() => handleOpenAdd()}
              className="shadow-soft"
            >
              <Plus className="size-4 mr-1.5" />
              {t("addExpense", "Add Expense")}
            </Button>
          </>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalExpenses", "Total Expenses")}
          value={formatCurrency(metrics.total)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label={t("paidOut", "Paid Out")}
          value={formatCurrency(metrics.paid)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("pendingBills", "Pending Bills")}
          value={formatCurrency(metrics.pending)}
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label={t("topCategory", "Top Category")}
          value={metrics.maxCat}
          icon={TrendingDown}
          accent="info"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchExpenses", "Search by category or expense note...")}
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
                <SheetTitle className="text-lg font-bold">{t("filterExpenses", "Filter Expenses")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("category", "Category")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allCategoriesCount", "All Categories") },
                      ...uniqueCategories.map((c) => ({ value: String(c), label: String(c) })),
                    ]}
                    value={draftFilters.category}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, category: val }))}
                    placeholder={t("filterByCategory", "Filter by Category")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("status", "Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allStatuses", "All Statuses") },
                      ...PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
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
        {isExpensesLoading ? (
          <TableSkeleton columns={6} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isExpensesError ? (
          <ErrorState onRetry={refetchExpenses} />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("date", "Date")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("category", "Category")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("expenseDescription", "Expense Description")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {t("paymentStatus", "Payment Status")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("amount", "Amount")}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      {t("actions", "Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <EmptyState
                          icon={Receipt}
                          title={t("noExpensesFound", "No expenses found")}
                          description={
                            search
                              ? t("adjustSearch", "Try adjusting your search or filters.")
                              : t("noExpensesYet", "No business expenses recorded yet. Click below to add one.")
                          }
                          actionLabel={t("addExpense", "Add Expense")}
                          onAction={() => handleOpenAdd()}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExpenses.map((e: any) => (
                      <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs font-medium">
                          {formatDate(e.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold bg-muted/60 border-border/80"
                          >
                            {e.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-sm text-foreground whitespace-nowrap">
                          {e.description}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider",
                              e.status === "paid"
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-warning/15 text-warning border-warning/30",
                            )}
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(Number(e.amount) || 0)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-36">
                              <DropdownMenuItem
                                onClick={() => handleOpenAdd(e)}
                                className="text-xs font-semibold"
                              >
                                <Edit2 className="mr-2 size-3.5 text-primary" /> {t("edit", "Edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(e.id)}
                                className="text-xs font-semibold text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-3.5" /> {t("delete", "Delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {paginatedExpenses.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-bold bg-muted/60">
                        {e.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(e.date)}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground mt-1 truncate">
                      {e.description}
                    </div>
                    <div className="mt-1.5">
                      <Badge className="text-[9px] font-bold bg-success/15 text-success border-success/30">
                        {e.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <div className="text-sm font-black text-foreground">
                      {formatCurrency(Number(e.amount) || 0)}
                    </div>
                    <div className="flex gap-1 justify-end mt-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => handleOpenAdd(e)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        onClick={() => setDeleteId(e.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredExpenses.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredExpenses.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Expense Drawer Sheet */}
      <Sheet
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearExpAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
            <SheetTitle className="text-xl font-black text-foreground">
              {editItem ? t("editExpense", "Edit Operating Expense") : t("addExpense", "Record New Business Expense")}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("manageExpensesDesc", "Track store rent, electricity, maintenance, logistics, and vendor payouts.")}
            </p>
          </SheetHeader>

          <form noValidate onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">
                    {t("date", "Expense Date")} <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    name="date"
                    date={expenseDate || new Date().toISOString().split("T")[0]}
                    onDateChange={(d) => {
                      setExpenseDate(d ? d.toISOString().split("T")[0] : "");
                      clearExpError("date");
                    }}
                  />
                  <FieldError message={expErrors.date} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">
                    {t("category", "Category")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editItem?.category}
                    placeholder={t("expenseCategoryPlaceholder", "e.g. Utilities / Office Rent")}
                    className={
                      expErrors.category ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    onChange={() => clearExpError("category")}
                  />
                  <FieldError message={expErrors.category} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  {t("expenseDescription", "Expense Description / Purpose")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder={t("expenseDescriptionPlaceholder", "e.g. Paid showroom internet & electricity bill")}
                  defaultValue={editItem?.description}
                  className={
                    expErrors.description ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearExpError("description")}
                />
                <FieldError message={expErrors.description} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">
                    {t("amount", "Amount")} ({currencySymbol}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={editItem?.amount}
                    className={`font-bold text-base ${expErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    onChange={() => clearExpError("amount")}
                  />
                  <FieldError message={expErrors.amount} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">{t("paymentStatus", "Payment Status")}</Label>
                  <SearchableSelect
                    options={PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                    value={expenseStatus}
                    onChange={setExpenseStatus}
                    placeholder={t("selectStatus", "Select Status")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">{t("paymentMethod", "Payment Method")}</Label>
                <SearchableSelect
                  options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m.label, label: m.label }))}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder={t("selectPaymentMethod", "Select payment method")}
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearExpAll();
                }}
              >
                {t("cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="min-w-[140px] font-bold shadow-soft"
              >
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("saveExpense", "Save Expense")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExpense", "Delete Expense Record?")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense entry? This will permanently remove the
              audit record.
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
