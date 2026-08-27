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
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Wallet, TrendingDown, PieChart, MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpensesFn, createExpenseFn, updateExpenseFn, deleteExpenseFn } from "@/api/expenses";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses · OneDesk360" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawExpensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => ((await getExpensesFn({ data: {} })) as any)?.data || [],
  });
  const rawExpenses = rawExpensesData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>("");

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

  const expenses = useMemo(() => {
    let filtered = rawExpenses;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.category.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower),
      );
    }
    if (filters.category) {
      filtered = filtered.filter((e) => e.category === filters.category);
    }
    if (filters.status) {
      filtered = filtered.filter((e) => e.status === filters.status);
    }
    return filtered;
  }, [rawExpenses, debouncedSearch, filters.category, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(expenses.length / pageSize);
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [expenses, page, pageSize]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(rawExpenses.map((e) => String(e.category)))),
    [rawExpenses],
  );

  const total = rawExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const pending = rawExpenses.filter((e) => e.status !== "paid").length;

  // Calculate largest category
  const catMap = rawExpenses.reduce(
    (acc, e: any) => {
      acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const largestCategory =
    Object.entries(catMap).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "N/A";

  const {
    errors: expErrors,
    validate: validateExp,
    clearError: clearExpError,
    clearAll: clearExpAll,
  } = useFormValidation({
    date: { required: "Date is required" },
    category: { required: "Category is required" },
    description: {
      required: "Description is required",
      minLength: { value: 3, message: "Description must be at least 3 characters" },
    },
    amount: { required: "Amount is required", positive: "Amount must be a positive number" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const date = (formData.get("date") as string)?.trim();
      const category = (formData.get("category") as string)?.trim();
      const description = (formData.get("description") as string)?.trim();
      const amountStr = (formData.get("amount") as string)?.trim();
      const status = formData.get("status") as string;

      const isValid = validateExp({ date, category, description, amount: amountStr });
      if (!isValid) return;

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Amount must be a positive number");
        return;
      }

      if (editItem) {
        const res = await updateExpenseFn({
          data: {
            id: editItem.id,
            updates: { date, category, description, amount, status },
          },
        });
        if (res?.success) {
          toast.success("Expense updated successfully");
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createExpenseFn({
          data: {
            expense: {
              date,
              category,
              description,
              amount,
              status,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deleteExpenseFn({ data: { id: deleteId } });
        if (res?.success) {
          toast.success("Expense deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else throw new Error(res?.error);
      } catch (error) {
        toast.error("Failed to delete expense");
      }
    }
  };

  return (
    <div className="page-container space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("totalExpenses") || "Total Expenses"}
          value={formatCurrency(total)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label={t("largestCategory") || "Largest Category"}
          value={largestCategory}
          hint="By amount"
          icon={PieChart}
          accent="info"
        />
        <StatCard
          label={t("pending") || "Pending"}
          value={pending.toString()}
          icon={TrendingDown}
          accent="warning"
        />
      </div>
      <DataPage
        title={t("expenses") || "Expenses"}
        description={t("manageExpenses") || "Track operating costs across all categories."}
        primaryAction={{
          label: t("addExpense") || "Add Expense",
          onClick: () => setIsAddOpen(true),
        }}
        searchPlaceholder={t("searchExpenses") || "Search by category or description..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawExpenses.length === 0}
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
                    ...uniqueCategories.map((c: any) => ({ value: String(c), label: String(c) })),
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
                className="w-full"
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
          <TableSkeleton columns={5} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isExpensesError ? (
          <ErrorState onRetry={refetchExpenses} />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t("noExpensesFound") || "No expenses found"}
            description={
              search
                ? t("adjustSearch") || "Try adjusting your search."
                : t("noExpensesYet") || "No expenses have been recorded yet."
            }
            actionLabel="Add Expense"
            onAction={() => {
              setEditItem(null);
              setExpenseDate(new Date().toISOString().slice(0, 10));
              setIsAddOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">{t("date") || "Date"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("category") || "Category"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("description") || "Expense Description"}</th>
                      <th className="px-5 py-3 whitespace-nowrap">{t("status") || "Status"}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">{t("amount") || "Amount"}</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">{t("actions") || "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap text-xs font-medium">
                          {formatDate(e.date)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold bg-muted/40 border-border/80">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-bold text-foreground whitespace-nowrap">
                          {e.description}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge
                            className={cn(
                              "text-[10px] font-bold",
                              e.status === "paid"
                                ? "bg-success/12 text-success hover:bg-success/20 border-success/20"
                                : "bg-warning/15 text-warning-foreground hover:bg-warning/20 border-warning/20",
                            )}
                          >
                            {e.status}
                          </Badge>
                        </td>
                        <td className="number px-5 py-3 text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditItem(e);
                                  setExpenseDate(e.date);
                                  setIsAddOpen(true);
                                }}
                                className="text-xs font-semibold"
                              >
                                <Edit2 className="mr-2 size-3.5" /> Edit Expense
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => setDeleteId(e.id)}
                              >
                                <Trash2 className="mr-2 size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {paginatedExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-bold py-0">
                          {e.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDate(e.date)}</span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">{e.description}</div>
                      <div className="mt-1">
                        <Badge
                          className={cn(
                            "text-[9px] font-bold py-0",
                            e.status === "paid" ? "bg-success/12 text-success" : "bg-warning/15 text-warning-foreground",
                          )}
                        >
                          {e.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">{formatCurrency(e.amount)}</div>
                      <div className="flex justify-end gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg"
                          onClick={() => {
                            setEditItem(e);
                            setExpenseDate(e.date);
                            setIsAddOpen(true);
                          }}
                        >
                          <Edit2 className="size-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-destructive"
                          onClick={() => setDeleteId(e.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={expenses.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      <Dialog
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearExpAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form id="expense-form" noValidate onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  name="date"
                  date={
                    expenseDate ||
                    (editItem ? editItem.date : new Date().toISOString().split("T")[0])
                  }
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
                  placeholder="e.g. Utilities"
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
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Electricity bill for July"
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
                  Amount ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150.00"
                  defaultValue={editItem?.amount}
                  className={
                    expErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearExpError("amount")}
                />
                <FieldError message={expErrors.amount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <SearchableSelect
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "paid", label: "Paid" },
                  ]}
                  value={editItem?.status || "pending"}
                  onChange={(val) => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = "status";
                    input.value = val;
                    document.getElementById("expense-form")?.appendChild(input);
                    if (editItem) setEditItem({ ...editItem, status: val as any });
                  }}
                  placeholder="Select Status"
                />
              </div>
            </div>
            <DialogFooter>
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
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record.
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
