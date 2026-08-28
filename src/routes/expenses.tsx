import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
  Wallet,
  TrendingDown,
  PieChart,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Plus,
  DollarSign,
  CheckCircle2,
  Clock,
  Receipt,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpensesFn, createExpenseFn, updateExpenseFn, deleteExpenseFn } from "@/api/expenses";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { exportToCSV } from "@/lib/csv";
import { usePreferences } from "@/contexts/PreferencesContext";
import { FieldError } from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/useFormValidation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Operating Expenses · OneDesk360" }] }),
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
  const activeFilterCount = (filters.category ? 1 : 0) + (filters.status ? 1 : 0);

  const handleResetFilters = () => {
    setFilters({ category: "", status: "" });
    setDraftFilters({ category: "", status: "" });
  };

  const filteredExpenses = useMemo(() => {
    let result = rawExpenses;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.description?.toLowerCase().includes(lower) ||
          e.category?.toLowerCase().includes(lower),
      );
    }
    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters.status) {
      result = result.filter((e) => e.status === filters.status);
    }
    return result;
  }, [rawExpenses, debouncedSearch, filters]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    rawExpenses.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats);
  }, [rawExpenses]);

  // Metrics
  const metrics = useMemo(() => {
    const total = rawExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const paid = rawExpenses
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const pending = rawExpenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const catTotals: Record<string, number> = {};
    rawExpenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.amount) || 0);
    });
    let maxCat = "-";
    let maxAmt = 0;
    Object.entries(catTotals).forEach(([cat, amt]) => {
      if (amt > maxAmt) {
        maxAmt = amt;
        maxCat = cat;
      }
    });

    return { total, paid, pending, maxCat, maxAmt };
  }, [rawExpenses]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, page, pageSize]);

  const {
    errors: expErrors,
    validate: validateExp,
    clearError: clearExpError,
    clearAll: clearExpAll,
  } = useFormValidation({
    category: { required: "Category is required" },
    description: {
      required: "Description is required",
      minLength: { value: 3, message: "Description must be at least 3 characters" },
    },
    amount: {
      required: "Amount is required",
      positive: "Amount must be greater than 0",
      custom: (val) => (parseFloat(val) <= 0 ? "Amount must be greater than 0" : undefined),
    },
  });

  const handleOpenAdd = (item?: any) => {
    if (item) {
      setEditItem(item);
      setExpenseDate(item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0]);
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
          toast.success("Expense updated successfully");
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
          toast.success("Expense added successfully");
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
          toast.success("Expense record deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      } catch {
        toast.error("Failed to delete expense");
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
    <>
      <DataPage
        title="Operating Expenses"
        description="Track store rent, utility bills, employee payroll, and daily miscellaneous costs."
        primaryAction={{
          label: "Add Expense",
          onClick: () => handleOpenAdd(),
          icon: Plus,
        }}
        searchPlaceholder="Search by category or expense note..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Categories" },
                    ...uniqueCategories.map((c) => ({ value: String(c), label: String(c) })),
                  ]}
                  value={draftFilters.category}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, category: val }))}
                  placeholder="Filter by Category"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "paid", label: "Paid" },
                    { value: "pending", label: "Pending" },
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
      >
        {isExpensesLoading ? (
          <TableSkeleton columns={6} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isExpensesError ? (
          <ErrorState onRetry={refetchExpenses} />
        ) : (
          <div className="space-y-4">
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Expenses
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground">
                  {formatCurrency(metrics.total)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Paid Out
                </span>
                <span className="text-xl sm:text-2xl font-black text-success">
                  {formatCurrency(metrics.paid)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pending Bills
                </span>
                <span className="text-xl sm:text-2xl font-black text-warning">
                  {formatCurrency(metrics.pending)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Top Category
                </span>
                <span className="text-lg sm:text-xl font-black text-info truncate">
                  {metrics.maxCat}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[750px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Category</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Expense Description</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Payment Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {paginatedExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center">
                          <EmptyState
                            icon={Receipt}
                            title="No expenses found"
                            description={
                              search
                                ? "Try adjusting your search or filters."
                                : "No business expenses recorded yet. Click below to add one."
                            }
                            actionLabel="Add Expense"
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
                                  <Edit2 className="mr-2 size-3.5 text-primary" /> Edit Expense
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(e.id)}
                                  className="text-xs font-semibold text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 size-3.5" /> Delete
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

              {/* Mobile Cards */}
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
                        <span className="text-[10px] text-muted-foreground">{formatDate(e.date)}</span>
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
                      <div className="text-sm font-black text-foreground">{formatCurrency(Number(e.amount) || 0)}</div>
                      <div className="flex gap-1 justify-end mt-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenAdd(e)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteId(e.id)}>
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
            </div>
          </div>
        )}
      </DataPage>

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
              {editItem ? "Edit Operating Expense" : "Record New Business Expense"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track store rent, electricity, maintenance, logistics, and vendor payouts.
            </p>
          </SheetHeader>

          <form noValidate onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">
                    Expense Date <span className="text-destructive">*</span>
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
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editItem?.category}
                    placeholder="e.g. Utilities / Office Rent"
                    className={expErrors.category ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={() => clearExpError("category")}
                  />
                  <FieldError message={expErrors.category} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Expense Description / Purpose <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g. Paid showroom internet & electricity bill"
                  defaultValue={editItem?.description}
                  className={expErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={() => clearExpError("description")}
                />
                <FieldError message={expErrors.description} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">
                    Amount ({currencySymbol}) <span className="text-destructive">*</span>
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
                  <Label htmlFor="status">Payment Status</Label>
                  <SearchableSelect
                    options={[
                      { value: "paid", label: "Paid (Cleared)" },
                      { value: "pending", label: "Pending (Due / Payable)" },
                    ]}
                    value={expenseStatus}
                    onChange={setExpenseStatus}
                    placeholder="Select Status"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <SearchableSelect
                  options={[
                    { value: "Cash", label: "Cash in Hand" },
                    { value: "Bank Transfer", label: "Bank Transfer / Check" },
                    { value: "Mobile Wallet", label: "Mobile Wallet (UPI / MFS)" },
                    { value: "Corporate Card", label: "Corporate Card" },
                  ]}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder="Select payment method"
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
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[140px] font-bold shadow-soft">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Expense
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense entry? This will permanently remove the audit record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
