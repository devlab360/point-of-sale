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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { FieldError } from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/useFormValidation";
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
  DollarSign,
  Clock,
  MoreVertical,
  Layers,
  Printer,
  Wallet,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers & Vendor Khata · OneDesk360" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settleItem, setSettleItem] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [isSettling, setIsSettling] = useState(false);
  const [ledgerSupplier, setLedgerSupplier] = useState<any | null>(null);

  const {
    data: suppliersData,
    isLoading: isSuppliersLoading,
    isError: isSuppliersError,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: async () => ((await getSuppliersFn({ data: {} })) as any)?.data || [],
  });

  const rawSuppliers: any[] = suppliersData || [];

  const { data: supplierLedgerEntriesData } = useQuery({
    queryKey: ["supplierLedger", ledgerSupplier?.id],
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
  const [pageSize, setPageSize] = useState(10);

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
          s.email?.toLowerCase().includes(lower) ||
          s.phone?.includes(lower),
      );
    }
    if (filters.balance === "has_balance") {
      filtered = filtered.filter((s) => Number(s.balance) > 0);
    } else if (filters.balance === "settled") {
      filtered = filtered.filter((s) => Number(s.balance) <= 0);
    }
    return filtered;
  }, [rawSuppliers, debouncedSearch, filters.balance]);

  // Metrics
  const metrics = useMemo(() => {
    const totalSuppliers = rawSuppliers.length;
    const totalPayable = rawSuppliers.reduce((acc, s) => acc + Math.max(0, Number(s.balance) || 0), 0);
    const withDue = rawSuppliers.filter((s) => Number(s.balance) > 0).length;
    const settled = rawSuppliers.filter((s) => Number(s.balance) <= 0).length;
    return { totalSuppliers, totalPayable, withDue, settled };
  }, [rawSuppliers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(suppliers.length / pageSize));
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

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleItem || !settleAmount) return;
    setIsSettling(true);
    try {
      const amountNum = parseFloat(settleAmount);
      const newBal = Math.max(0, (Number(settleItem.balance) || 0) - amountNum);

      await createSupplierLedgerFn({
        data: {
          supplierId: settleItem.id,
          type: "Payment",
          amount: String(amountNum),
          balanceAfter: String(newBal),
          note: "Direct balance settlement",
        },
      });

      await updateSupplierFn({
        data: {
          id: settleItem.id,
          updates: { balance: String(newBal) },
        },
      });

      toast.success("Settlement recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplierLedger"] });
      setSettleItem(null);
      setSettleAmount("");
    } catch {
      toast.error("Failed to process payment settlement");
    } finally {
      setIsSettling(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      suppliers,
      [
        { key: "name", label: "Supplier Name" },
        { key: "contact", label: "Contact Person" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "balance", label: "Payable Balance" },
      ],
      "suppliers",
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
        if (row["Name"] || row["Supplier Name"]) {
          await createSupplierFn({
            data: {
              supplier: {
                id: uuidv4(),
                name: row["Name"] || row["Supplier Name"],
                contact: row["Contact Person"] || row["Contact"] || "",
                email: row["Email"] || "",
                phone: row["Phone"] || "",
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Successfully imported ${count} suppliers`);
    } catch {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <>
      <DataPage
        title="Suppliers & Vendor Khata"
        description="Manage vendor relationships, purchase history, and outstanding payable balances."
        primaryAction={{
          label: "Add Supplier",
          onClick: () => {
            setEditItem(null);
            setIsAddOpen(true);
          },
          icon: Plus,
        }}
        searchPlaceholder="Search by supplier name, contact person, or phone..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
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
                    { value: "has_balance", label: "Outstanding Dues (> 0)" },
                    { value: "settled", label: "Settled (0 Due)" },
                  ]}
                  value={draftFilters.balance}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, balance: val }))}
                  placeholder="Filter by Balance"
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
        {isSuppliersLoading ? (
          <CardGridSkeleton cards={6} columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
        ) : isSuppliersError ? (
          <ErrorState onRetry={refetchSuppliers} />
        ) : (
          <div className="space-y-4">
            {/* Top KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Vendors
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground">
                  {metrics.totalSuppliers}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Khata Payable
                </span>
                <span className="text-xl sm:text-2xl font-black text-destructive">
                  {formatCurrency(metrics.totalPayable)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Accounts with Due
                </span>
                <span className="text-xl sm:text-2xl font-black text-warning">
                  {metrics.withDue}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Settled Accounts
                </span>
                <span className="text-xl sm:text-2xl font-black text-success">
                  {metrics.settled}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[750px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Supplier Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Contact Person</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Phone / Email</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Khata Balance</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <EmptyState
                            icon={Truck}
                            title="No suppliers found"
                            description={
                              search
                                ? "Try adjusting your search query."
                                : "You haven't added any suppliers or vendors yet."
                            }
                            actionLabel="Add Supplier"
                            onAction={() => {
                              setEditItem(null);
                              setIsAddOpen(true);
                            }}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSuppliers.map((s: any) => (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell
                            className="font-bold text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setLedgerSupplier(s)}
                          >
                            {s.name}
                          </TableCell>
                          <TableCell className="font-medium text-xs text-muted-foreground">
                            {s.contact || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold text-foreground">{s.phone || "No Phone"}</div>
                            {s.email && <div className="text-[11px] text-muted-foreground">{s.email}</div>}
                          </TableCell>
                          <TableCell>
                            {Number(s.balance) > 0 ? (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/25 text-xs font-black">
                                Due: {formatCurrency(Number(s.balance))}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px] font-black uppercase">
                                Settled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {Number(s.balance) > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSettleItem(s);
                                    setSettleAmount(String(s.balance));
                                  }}
                                  className="h-8 text-xs font-bold text-primary hover:bg-primary/10 border-primary/20"
                                >
                                  Settle
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLedgerSupplier(s)}
                                className="h-8 text-xs font-semibold"
                              >
                                Ledger
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-40">
                                  <DropdownMenuItem onClick={() => setEditItem(s)} className="text-xs font-semibold">
                                    <Edit2 className="size-3.5 mr-2 text-primary" /> Edit Supplier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteId(s.id)}
                                    className="text-xs font-semibold text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Delete
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
                {paginatedSuppliers.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-soft"
                    onClick={() => setLedgerSupplier(s)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-foreground truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.contact} · {s.phone}</div>
                      <div className="mt-1.5">
                        {Number(s.balance) > 0 ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/25 text-[10px] font-black">
                            Due: {formatCurrency(Number(s.balance))}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[9px] font-bold">
                            Settled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suppliers.length > 0 && (
                <div className="border-t border-border/60 p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={suppliers.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      {/* Add / Edit Supplier Drawer Sheet */}
      <Sheet
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearSuppAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
            <SheetTitle className="text-xl font-black text-foreground">
              {editItem ? "Edit Supplier Profile" : "Add New Supplier / Vendor"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage vendor contacts, supplier phone, and payable balance tracking.
            </p>
          </SheetHeader>

          <form noValidate onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Supplier Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Apex Electronics Ltd"
                  defaultValue={editItem?.name}
                  className={suppErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
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
                  placeholder="e.g. John Doe (Account Manager)"
                  defaultValue={editItem?.contact}
                  className={suppErrors.contact ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={() => clearSuppError("contact")}
                />
                <FieldError message={suppErrors.contact} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g. billing@vendor.com"
                    defaultValue={editItem?.email}
                    className={suppErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={() => clearSuppError("email")}
                  />
                  <FieldError message={suppErrors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +1 555-0199"
                    defaultValue={editItem?.phone}
                    className={suppErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={() => clearSuppError("phone")}
                  />
                  <FieldError message={suppErrors.phone} />
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
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
              <Button type="submit" disabled={isSaving} className="min-w-[140px] font-bold shadow-soft">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Supplier
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Settle Balance Drawer Sheet */}
      <Sheet open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
            <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <span>Settle Vendor Balance</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record payment to clear outstanding Khata dues for <strong>{settleItem?.name}</strong>.
            </p>
          </SheetHeader>

          <form onSubmit={handleSettle} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
                <span className="text-xs font-bold text-destructive uppercase">Current Due Balance</span>
                <p className="text-2xl font-black text-destructive mt-1">{formatCurrency(Number(settleItem?.balance) || 0)}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settleAmount">Settlement Payment Amount *</Label>
                <Input
                  id="settleAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={settleItem?.balance}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="font-bold text-base"
                  required
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button type="button" variant="outline" onClick={() => setSettleItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSettling} className="min-w-[150px] font-bold shadow-soft">
                {isSettling && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirm Payment
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Supplier Khata Ledger Statement Drawer */}
      <Sheet open={!!ledgerSupplier} onOpenChange={(open) => !open && setLedgerSupplier(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl sm:text-2xl font-black text-foreground">
                  Supplier Khata Ledger (লেজার)
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ledgerSupplier?.name} · {ledgerSupplier?.contact} ({ledgerSupplier?.phone || "No phone"})
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="font-bold text-xs">
                <Printer className="size-3.5 mr-1.5" /> Print Statement
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Ledger KPI Summary */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
              <span className="text-xs font-bold text-destructive uppercase">Outstanding Due Payable</span>
              <p className="text-2xl font-black text-destructive mt-0.5">{formatCurrency(ledgerSupplier?.balance || 0)}</p>
            </div>

            {/* Ledger Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Purchase & Payment Transaction Records
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border shadow-soft">
                <Table className="min-w-[650px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Ref #</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right">Debit (+Payable)</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right">Credit (-Paid)</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {supplierLedgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded in supplier ledger yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplierLedgerEntries.map((l: any) => (
                        <TableRow key={l.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(l.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold text-xs capitalize whitespace-nowrap">
                            {l.type}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary whitespace-nowrap">
                            {l.referenceNo || "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-black text-destructive whitespace-nowrap">
                            {l.type?.toLowerCase() === "purchase"
                              ? formatCurrency(Math.abs(Number(l.amount || 0)))
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-black text-success whitespace-nowrap">
                            {l.type?.toLowerCase() === "payment" ||
                            l.type?.toLowerCase() === "return" ||
                            l.type?.toLowerCase() === "transfer out"
                              ? formatCurrency(Math.abs(Number(l.amount || 0)))
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-foreground whitespace-nowrap">
                            {formatCurrency(l.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
            <Button size="sm" onClick={() => setLedgerSupplier(null)} className="font-bold text-xs">
              Close Statement
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
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
