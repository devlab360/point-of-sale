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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSuppliersFn,
  createSupplierFn,
  updateSupplierFn,
  deleteSupplierFn,
  getSupplierLedgersFn,
  createSupplierLedgerFn,
} from "@/api/suppliers";
import {
  Truck,
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Star,
  Loader2,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { MoreVertical } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useLanguage } from "@/contexts/LanguageContext";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { PhoneInput } from "@/components/ui/phone-input";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers · NexisPOS" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawSuppliersData,
    isLoading: isSuppliersLoading,
    isError: isSuppliersError,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: async () => ((await getSuppliersFn({ data: {} })) as any)?.data || [],
  });
  const rawSuppliers = rawSuppliersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settleItem, setSettleItem] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  const handleSettle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settleItem) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0 || amount > settleItem.balance) {
      toast.error("Please enter a valid amount up to the outstanding balance.");
      return;
    }
    setIsSettling(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const newBalance = Math.max(0, settleItem.balance - amount);
      const res1 = await updateSupplierFn({
        data: {
          id: settleItem.id,
          updates: { balance: newBalance.toString() },
        },
      });
      if (!res1.success) throw new Error(res1.error);

      const res2 = await createSupplierLedgerFn({
        data: {
          ledger: {
            supplierId: settleItem.id,
            date: new Date().toISOString(),
            type: "payment",
            amount: amount.toString(),
            balanceAfter: newBalance.toString(),
            referenceNo: `PAY-${Date.now().toString().slice(-6)}`,
            note: "Supplier due settlement payment",
          },
        },
      });
      if (!res2.success) throw new Error(res2.error);

      toast.success(`Successfully settled ${formatCurrency(amount)}`);
      setSettleItem(null);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to settle balance");
    } finally {
      setIsSettling(false);
    }
  };
  const [ledgerSupplier, setLedgerSupplier] = useState<any | null>(null);

  const { data: supplierLedgerEntriesData } = useQuery({
    queryKey: ["supplierLedgers", ledgerSupplier?.id],
    queryFn: async () => {
      if (!ledgerSupplier) return [];
      return (
        ((await getSupplierLedgersFn({ data: { supplierId: ledgerSupplier.id } })) as any)?.data ||
        []
      );
    },
    enabled: !!ledgerSupplier,
  });
  const supplierLedgerEntries = supplierLedgerEntriesData || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const [filters, setFilters] = useState({ balance: "" });
  const [draftFilters, setDraftFilters] = useState({ balance: "" });
  const activeFilterCount = filters.balance ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ balance: "" });
    setDraftFilters({ balance: "" });
  };

  const suppliers = useMemo(() => {
    let filtered = rawSuppliers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.contact?.toLowerCase().includes(lower) ||
          s.email?.toLowerCase().includes(lower),
      );
    }
    if (filters.balance === "has_balance") {
      filtered = filtered.filter((s) => s.balance > 0);
    } else if (filters.balance === "settled") {
      filtered = filtered.filter((s) => s.balance <= 0);
    }
    return filtered;
  }, [rawSuppliers, debouncedSearch, filters.balance]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(suppliers.length / pageSize);
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return suppliers.slice(start, start + pageSize);
  }, [suppliers, page, pageSize]);

  const {
    errors: suppErrors,
    validate: validateSupp,
    clearError: clearSuppError,
    clearAll: clearSuppAll,
  } = useFormValidation({
    name: {
      required: "Supplier name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    contact: { required: "Contact person name is required" },
    email: { email: "Enter a valid email address" },
    phone: { phone: "Enter a valid phone number" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = (formData.get("name") as string)?.trim();
      const contact = (formData.get("contact") as string)?.trim();
      const phone = (formData.get("phone") as string)?.trim();
      const email = (formData.get("email") as string)?.trim();

      const isValid = validateSupp({ name, contact, email, phone });
      if (!isValid) return;

      if (editItem) {
        const res = await updateSupplierFn({
          data: { id: editItem.id, updates: { name, contact, phone, email } },
        });
        if (res?.success) {
          toast.success("Supplier updated successfully");
          setEditItem(null);
        } else throw new Error(res?.error);
      } else {
        const res = await createSupplierFn({
          data: {
            supplier: {
              name,
              contact,
              phone,
              email,
            },
          },
        });
        if (res?.success) {
          toast.success("Supplier added successfully");
          setIsAddOpen(false);
        } else throw new Error(res?.error);
      }
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      clearSuppAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deleteSupplierFn({ data: { id: deleteId } });
        if (res?.success) {
          toast.success("Supplier deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        } else throw new Error(res?.error);
      } catch (error) {
        toast.error("Failed to delete supplier");
      }
    }
  };

  const handleExport = () => {
    exportToCSV(suppliers, [
      { key: 'name', label: 'Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
    ], 'suppliers');
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
        if (row['Name']) {
          await createSupplierFn({
            data: {
              supplier: {
                id: uuidv4(),
                name: row['Name'],
                contactPerson: row['Contact Person'] || '',
                email: row['Email'] || '',
                phone: row['Phone'] || '',
                address: row['Address'] || ''
              }
            }
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Successfully imported ${count} suppliers`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("suppliers") || "Suppliers"}
        description={
          t("manageSuppliers") ||
          "Manage vendor relationships, purchase history, and outstanding balances."
        }
        primaryAction={{
          label: t("addSupplier") || "Add Supplier",
          onClick: () => {
            setEditItem(null);
            setIsAddOpen(true);
          },
        }}
        searchPlaceholder={t("searchSuppliers") || "Search by name, contact, or email..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawSuppliers.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Balance Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Suppliers" },
                    { value: "has_balance", label: "Has Balance" },
                    { value: "settled", label: "Settled" },
                  ]}
                  value={draftFilters.balance}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, balance: val }))}
                  placeholder="Filter by Balance"
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
        {isSuppliersLoading ? (
          <CardGridSkeleton cards={6} columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
        ) : isSuppliersError ? (
          <ErrorState onRetry={refetchSuppliers} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={t("noSuppliersFound") || "No suppliers found"}
            description={
              search
                ? t("adjustSearch") || "Try adjusting your search."
                : t("noSuppliersYet") || "You haven't added any suppliers yet."
            }
            actionLabel="Add Supplier"
            onAction={() => {
              setEditItem(null);
              setIsAddOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSuppliers.map((s) => (
                <div
                  key={s.id}
                  className="relative rounded-xl border border-border bg-card p-4 sm:p-5 shadow-soft"
                >
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {s.balance > 0 ? (
                      <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                        {formatCurrency(s.balance)} {t("due") || "due"}
                      </span>
                    ) : (
                      <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        {t("settled") || "Settled"}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(s)}>
                          <Edit2 className="mr-2 size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLedgerSupplier(s)}>
                          <Truck className="mr-2 size-4 text-primary" /> View Khata / Ledger
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                      {s.name.slice(0, 2)}
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {s.contact} {s.email && `· ${s.email}`}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div>
                      <div className="number font-bold text-foreground">{s.items}</div>
                      <div>{t("itemsSupplied") || "Items supplied"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{s.phone}</div>
                      <div>{t("phone") || "Phone"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {suppliers.length > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                totalItems={suppliers.length}
              />
            )}
          </div>
        )}
      </DataPage>

      <Dialog
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearSuppAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Supplier Company Name"
                defaultValue={editItem?.name}
                className={
                  suppErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                }
                onChange={() => clearSuppError("name")}
              />
              <FieldError message={suppErrors.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">
                Contact Person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact"
                name="contact"
                placeholder="e.g. Contact Person Name"
                defaultValue={editItem?.contact}
                className={
                  suppErrors.contact ? "border-destructive focus-visible:ring-destructive" : ""
                }
                onChange={() => clearSuppError("contact")}
              />
              <FieldError message={suppErrors.contact} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. supplier@example.com"
                  defaultValue={editItem?.email}
                  className={
                    suppErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearSuppError("email")}
                />
                <FieldError message={suppErrors.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 1700 000000"
                  defaultValue={editItem?.phone}
                  className={
                    suppErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearSuppError("phone")}
                />
                <FieldError message={suppErrors.phone} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearSuppAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Supplier
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
              This action cannot be undone. This will permanently delete the supplier record.
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
      <Dialog open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Outstanding Balance for <strong>{settleItem?.name}</strong> is{" "}
              <strong className="text-destructive">{formatCurrency(settleItem?.balance)}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="settleAmount">Settlement Amount</Label>
              <Input
                id="settleAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={settleItem?.balance}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setSettleItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSettling}>
                {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Khata Ledger Statement Side Drawer */}
      <Sheet open={!!ledgerSupplier} onOpenChange={(open) => !open && setLedgerSupplier(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl overflow-y-auto p-6 bg-background border-l border-border shadow-elevated"
        >
          <SheetHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b pb-4 pr-6 sm:pr-8 text-left">
            <div className="w-full sm:w-auto text-left">
              <SheetTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-left">
                <span>Supplier Khata Statement (সাপ্লায়ার লেজার)</span>
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                {ledgerSupplier?.name} · {ledgerSupplier?.contact}
              </p>
            </div>
            <div className="flex flex-wrap w-full sm:w-auto gap-2 mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none w-full sm:w-auto"
                onClick={() => window.print()}
              >
                Print Statement
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {/* Ledger KPI Summary */}
            <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-center">
              <div className="text-xs text-muted-foreground font-medium">
                Total Balance Payable / Due
              </div>
              <div className="text-2xl font-bold text-warning-foreground mt-0.5">
                {formatCurrency(ledgerSupplier?.balance || 0)}
              </div>
            </div>

            {/* Ledger Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Purchase & Payment History
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border shadow-soft">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Type</th>
                      <th className="px-3 py-2.5 text-left whitespace-nowrap">Ref #</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Debit (+Payable)</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Credit (-Paid)</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierLedgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded in supplier ledger yet.
                        </td>
                      </tr>
                    ) : (
                      supplierLedgerEntries.map((l) => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(l.date).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 font-medium capitalize whitespace-nowrap">
                            {l.type}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                            {l.referenceNo || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-warning-foreground whitespace-nowrap">
                            {l.type?.toLowerCase() === "purchase" ? formatCurrency(Math.abs(Number(l.amount || 0))) : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-success whitespace-nowrap">
                            {l.type?.toLowerCase() === "payment" || 
                             l.type?.toLowerCase() === "return" || 
                             l.type?.toLowerCase() === "transfer out"
                              ? formatCurrency(Math.abs(Number(l.amount || 0)))
                              : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                            {formatCurrency(l.balanceAfter)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
