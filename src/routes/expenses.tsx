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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Wallet, TrendingDown, Receipt, MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalExpense } from "@/lib/db";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses · Grocer.Pro" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const rawExpenses = useLiveQuery(() => localDb.expenses.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const expenses = useMemo(() => {
    let filtered = rawExpenses;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(e =>
        e.category.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower)
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    return filtered;
  }, [rawExpenses, debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(expenses.length / pageSize);
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [expenses, page, pageSize]);

  const uniqueCategories = useMemo(() => Array.from(new Set(rawExpenses.map(e => e.category))), [rawExpenses]);

  const total = rawExpenses.reduce((acc, e) => acc + e.amount, 0);
  const pending = rawExpenses.filter(e => e.status !== "paid").length;

  // Calculate largest category
  const catMap = rawExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const largestCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const { errors: expErrors, validate: validateExp, clearError: clearExpError, clearAll: clearExpAll } = useFormValidation({
    date: { required: "Date is required" },
    category: { required: "Category is required" },
    description: { required: "Description is required", minLength: { value: 3, message: "Description must be at least 3 characters" } },
    amount: { required: "Amount is required", positive: "Amount must be a positive number" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const formData = new FormData(e.currentTarget);
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
        await localDb.expenses.update(editItem.id, { date, category, description, amount, status });
        toast.success("Expense updated successfully");
        setEditItem(null);
      } else {
        await localDb.expenses.add({
          id: uuidv4(),
          date,
          category,
          description,
          amount,
          status,
        });
        toast.success("Expense added successfully");
        setIsAddOpen(false);
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
        await localDb.expenses.delete(deleteId);
        toast.success("Expense deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete expense");
      }
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalExpenses") || "Total Expenses"} value={formatCurrency(total)} icon={Wallet} accent="primary" />
        <StatCard label={t("largestCategory") || "Largest Category"} value={largestCategory} hint="By amount" icon={Receipt} accent="info" />
        <StatCard label={t("pending") || "Pending"} value={pending.toString()} icon={TrendingDown} accent="warning" />
      </div>
      <DataPage
        title={t("expenses") || "Expenses"}
        description={t("manageExpenses") || "Track operating costs across all categories."}
        primaryAction={{ label: t("addExpense") || "Add Expense", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder={t("searchExpenses") || "Search by category or description..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawExpenses.length === 0}
        filtersContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <SearchableSelect 
                options={[
                  { value: "", label: "All Categories" },
                  ...uniqueCategories.map(c => ({ value: c, label: c }))
                ]} 
                value={categoryFilter} 
                onChange={setCategoryFilter} 
                placeholder="Filter by Category"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect 
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" }
                ]} 
                value={statusFilter} 
                onChange={setStatusFilter} 
                placeholder="Filter by Status"
              />
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setCategoryFilter(""); setStatusFilter(""); }}>
              Reset Filters
            </Button>
          </div>
        }
      >
        {expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t("noExpensesFound") || "No expenses found"}
            description={search ? (t("adjustSearch") || "Try adjusting your search.") : (t("noExpensesYet") || "No expenses have been recorded yet.")}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("date") || "Date"}</th>
                    <th className="px-4 py-3">{t("category") || "Category"}</th>
                    <th className="px-4 py-3">{t("description") || "Description"}</th>
                    <th className="px-4 py-3">{t("status") || "Status"}</th>
                    <th className="px-4 py-3 text-right">{t("amount") || "Amount"}</th>
                    <th className="px-4 py-3 text-right">{t("actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{e.category}</Badge></td>
                      <td className="px-4 py-3 font-semibold">{e.description}</td>
                      <td className="px-4 py-3"><Badge className={e.status === "paid" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{e.status}</Badge></td>
                      <td className="number px-4 py-3 text-right font-semibold">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditItem(e)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expenses.length > 0 && (
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

      <Dialog open={isAddOpen || !!editItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditItem(null);
          clearExpAll();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form id="expense-form" noValidate onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <DatePicker
                  name="date"
                  date={expenseDate || (editItem ? editItem.date : new Date().toISOString().split('T')[0])}
                  onDateChange={(d) => { setExpenseDate(d ? d.toISOString().split("T")[0] : ""); clearExpError("date"); }}
                />
                <FieldError message={expErrors.date} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Input
                  id="category" name="category"
                  defaultValue={editItem?.category}
                  placeholder="e.g. Utilities"
                  className={expErrors.category ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={() => clearExpError("category")}
                />
                <FieldError message={expErrors.category} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <Input
                id="description" name="description"
                placeholder="e.g. Electricity bill for July"
                defaultValue={editItem?.description}
                className={expErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                onChange={() => clearExpError("description")}
              />
              <FieldError message={expErrors.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount ($) <span className="text-destructive">*</span></Label>
                <Input
                  id="amount" name="amount" type="number" min="0" step="0.01"
                  placeholder="e.g. 150.00"
                  defaultValue={editItem?.amount}
                  className={expErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={() => clearExpError("amount")}
                />
                <FieldError message={expErrors.amount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <SearchableSelect
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "paid", label: "Paid" }
                  ]}
                  value={editItem?.status || "pending"}
                  onChange={val => {
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
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); clearExpAll(); }}>Cancel</Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
