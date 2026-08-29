import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { DataPage } from "@/components/layout/DataPage";
import { sendAutomatedDueReminder } from "@/lib/automation/due-bot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useCurrency } from "@/lib/currency";
import { Mail, Phone, Star, MoreVertical, Edit2, Trash2, Users, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { sendWhatsAppDueReminder } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomersFn,
  createCustomerFn,
  updateCustomerFn,
  deleteCustomerFn,
  getCustomerLedgersFn,
  createCustomerLedgerFn,
} from "@/api/customers";
import { getSettingsFn } from "@/api/settings";
import { useLanguage } from "@/contexts/LanguageContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers · OneDesk360" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  // State initialization moved below hooks

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settleItem, setSettleItem] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [ledgerCustomer, setLedgerCustomer] = useState<any | null>(null);

  const { data: customerLedgerEntriesData } = useQuery({
    queryKey: ["customerLedgers", ledgerCustomer?.id],
    queryFn: async () =>
      ((await getCustomerLedgersFn({ data: { customerId: ledgerCustomer!.id } })) as any)?.data ||
      [],
    enabled: !!ledgerCustomer,
  });
  const customerLedgerEntries = customerLedgerEntriesData || [];

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data,
  });
  const settings: any = settingsData;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ type: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "", status: "" });
  const activeFilterCount = (filters.type ? 1 : 0) + (filters.status ? 1 : 0);

  const {
    data: customersResponse,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", orgId, page, pageSize, debouncedSearch, filters.type, filters.status],
    queryFn: async () =>
      ((await getCustomersFn({
        data: {
          page,
          pageSize,
          query: debouncedSearch,
          type: filters.type,
          status: filters.status,
        },
      })) as any) || {},
  });

  const customers = customersResponse?.data || [];
  const totalCount = customersResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleResetFilters = () => {
    setFilters({ type: "", status: "" });
    setDraftFilters({ type: "", status: "" });
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.type, filters.status]);
  const {
    errors: custErrors,
    validate: validateCust,
    clearError: clearCustError,
    clearAll: clearCustAll,
  } = useFormValidation({
    name: {
      required: "Customer name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    email: { email: "Enter a valid email address" },
    phone: { phone: "Enter a valid 10-15 digit phone number" },
    creditLimit: { positive: "Credit limit must be a valid positive number" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const name = (formData.get("name") as string)?.trim();
      const email = (formData.get("email") as string)?.trim() || null;
      const phone = (formData.get("phone") as string)?.trim() || null;
      const address = (formData.get("address") as string)?.trim() || null;
      const city = (formData.get("city") as string)?.trim() || null;
      const zipCode = (formData.get("zipCode") as string)?.trim() || null;
      const statuses = formData.getAll("status");
      const status = (
        statuses.length > 0 ? statuses[statuses.length - 1] : editItem?.status || "active"
      ) as string;
      const types = formData.getAll("type");
      const type = (types.length > 0 ? types[types.length - 1] : editItem?.type || "retail") as any;
      const creditLimit = parseFloat(formData.get("creditLimit") as string) || 5000;

      const isValid = validateCust({ name, email, phone, creditLimit: String(creditLimit) });
      if (!isValid) {
        const firstError = Object.values(custErrors)[0];
        if (firstError) toast.error(firstError);
        return;
      }

      if (editItem) {
        const res = await updateCustomerFn({
          data: {
            id: editItem.id,
            updates: { name, email, phone, address, city, zipCode, status, type, creditLimit },
          },
        });
        if (res?.success) {
          toast.success("Customer updated successfully");
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createCustomerFn({
          data: {
            customer: {
              name,
              email,
              phone,
              address,
              city,
              zipCode,
              status,
              type,
              creditLimit,
            },
          },
        });
        if (res?.success) {
          toast.success("Customer added successfully");
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        } else throw new Error(res?.error);
      }
      clearCustAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deleteCustomerFn({ data: { id: deleteId } });
        if (res?.success) {
          toast.success("Customer deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        } else throw new Error(res?.error);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete customer");
      }
    }
  };

  const [isSettling, setIsSettling] = useState(false);

  const handleSettle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settleItem) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0 || amount > settleItem.credit) {
      toast.error("Please enter a valid amount up to the outstanding balance.");
      return;
    }
    setIsSettling(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const newBalance = Math.max(0, settleItem.credit - amount);
      const res1 = await updateCustomerFn({
        data: {
          id: settleItem.id,
          updates: {
            credit: newBalance,
          },
        },
      });
      if (!res1.success) throw new Error(res1.error);

      const res2 = await createCustomerLedgerFn({
        data: {
          ledger: {
            customerId: settleItem.id,
            date: new Date().toISOString(),
            type: "payment",
            amount: amount.toString(),
            balanceAfter: newBalance.toString(),
            referenceNo: `PAY-${Date.now().toString().slice(-6)}`,
            note: "Customer due settlement payment",
          },
        },
      });
      if (!res2.success) throw new Error(res2.error);

      toast.success(`Successfully settled ${formatCurrency(amount)}`);
      setSettleItem(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerLedgers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to settle balance");
    } finally {
      setIsSettling(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      customers,
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address" },
        { key: "type", label: "Type" },
        { key: "points", label: "Points" },
      ],
      "customers",
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
        if (row["Name"]) {
          await createCustomerFn({
            data: {
              customer: {
                id: uuidv4(),
                name: row["Name"],
                email: row["Email"] || "",
                phone: row["Phone"] || "",
                address: row["Address"] || "",
                type: (row["Type"] as any) || "retail",
                points: parseInt(row["Points"] || "0"),
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Successfully imported ${count} customers`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div>
      <DataPage
        title={t("customers") || "Customers"}
        description={t("manageCustomers") || "Manage customer relationships, loyalty, and ledgers."}
        primaryAction={{
          label: t("addCustomer") || "Add Customer",
          onClick: () => {
            setEditItem(null);
            setIsAddOpen(true);
          },
        }}
        searchPlaceholder={t("searchCustomers") || "Search by name, email, or phone..."}
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
                <Label>Customer Type</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Types" },
                    { value: "Retail", label: "Retail" },
                    { value: "Wholesale", label: "Wholesale" },
                  ]}
                  value={draftFilters.type}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                  placeholder="Filter by Type"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
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
        {isCustomersLoading ? (
          <TableSkeleton columns={9} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isCustomersError ? (
          <ErrorState onRetry={refetchCustomers} />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customer") || "Customer Name"}</TableHead>
                      <TableHead>{t("contact") || "Mobile Phone"}</TableHead>
                      <TableHead className="text-right">{t("visits") || "Visits"}</TableHead>
                      <TableHead className="text-right">{t("spent") || "Total Purchases"}</TableHead>
                      <TableHead className="text-right">{t("points") || "Points"}</TableHead>
                      <TableHead className="text-right text-destructive font-bold">{t("credit") || "Udhaar (Due)"}</TableHead>
                      <TableHead className="text-right text-success font-bold">{t("wallet") || "Jama / Advance"}</TableHead>
                      <TableHead>{t("tier") || "Category"}</TableHead>
                      <TableHead className="text-right">{t("actions") || "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-64 text-center">
                          <EmptyState
                            icon={Users}
                            title={t("noCustomersFound") || "No customers found"}
                            description={
                              search
                                ? t("adjustSearch") || "Try adjusting your search query."
                                : t("noCustomersYet") || "You haven't added any customers yet."
                            }
                            actionLabel="Add Customer"
                            onAction={() => {
                              setEditItem(null);
                              setIsAddOpen(true);
                            }}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
                                {c.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span
                                className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                                onClick={() => setLedgerCustomer(c)}
                              >
                                {c.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-medium">{c.phone}</div>
                            {c.email && (
                              <div className="text-xs text-muted-foreground">{c.email}</div>
                            )}
                          </TableCell>
                          <TableCell className="number text-right font-medium">{c.visits || 0}</TableCell>
                          <TableCell className="number text-right font-semibold">
                            {formatCurrency(c.totalSpent || 0)}
                          </TableCell>
                          <TableCell className="number text-right font-semibold text-primary">
                            {(c.loyaltyPoints ?? c.points ?? 0).toLocaleString()} pts
                          </TableCell>
                          <TableCell className="number text-right font-bold text-destructive">
                            {c.credit > 0 ? formatCurrency(c.credit) : "—"}
                          </TableCell>
                          <TableCell className="number text-right font-semibold text-success">
                            {c.walletBalance > 0 ? formatCurrency(c.walletBalance) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {c.type === "Wholesale" ? (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold"
                                >
                                  Wholesale
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground text-[10px] font-semibold"
                                >
                                  Retail
                                </Badge>
                              )}
                              {c.status === "vip" ? (
                                <span className="text-[10px] font-extrabold text-warning">★ VIP</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => setEditItem(c)}
                                  className="text-xs font-semibold"
                                >
                                  <Edit2 className="mr-2 size-3.5" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setLedgerCustomer(c)}
                                  className="text-xs font-bold text-primary"
                                >
                                  <Users className="mr-2 size-3.5" /> Customer Ledger (Khata)
                                </DropdownMenuItem>
                                {c.credit > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSettleItem(c);
                                      setSettleAmount(c.credit.toString());
                                    }}
                                    className="text-xs font-bold text-success"
                                  >
                                    <Star className="mr-2 size-3.5" /> Settle Due Balance
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive text-xs font-semibold"
                                  onClick={() => setDeleteId(c.id)}
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

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {customers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={t("noCustomersFound") || "No customers found"}
                    description={
                      search
                        ? t("adjustSearch") || "Try adjusting your search query."
                        : t("noCustomersYet") || "You haven't added any customers yet."
                    }
                    actionLabel="Add Customer"
                    onAction={() => {
                      setEditItem(null);
                      setIsAddOpen(true);
                    }}
                    className="border-none bg-transparent my-0 py-6 shadow-none"
                  />
                ) : (
                  customers.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                      onClick={() => setLedgerCustomer(c)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary border border-primary/20">
                          {c.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                              {c.name}
                            </span>
                            {c.status === "vip" && (
                              <span className="text-[10px] text-warning font-black">★</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[9px] font-bold py-0 capitalize">
                              {c.type || "Retail"}
                            </Badge>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              {(c.loyaltyPoints ?? 0).toLocaleString()} pts
                            </span>
                            {c.credit > 0 && (
                              <span className="text-[10px] font-black text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                                Udhaar: {formatCurrency(c.credit)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="number text-xs font-black text-foreground">
                          {formatCurrency(c.totalSpent)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {c.visits} visits
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {customers.length > 0 && (
                <div className="border-t border-border/60 p-2 sm:p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={customers.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      {/* Add / Edit Customer Drawer */}
      <Sheet
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearCustAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold text-foreground">
              {editItem ? "Edit Customer Profile" : "Add New Customer"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage client details, credit limits, khata balance, and contact information.
            </p>
          </SheetHeader>
          <form
            id="customer-form"
            noValidate
            onSubmit={handleSave}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Customer Name"
                  defaultValue={editItem?.name || ""}
                  className={
                    custErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearCustError("name")}
                />
                <FieldError message={custErrors.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g. email@example.com"
                    defaultValue={editItem?.email || ""}
                    className={
                      custErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    onChange={() => clearCustError("email")}
                  />
                  <FieldError message={custErrors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. 1700 000000"
                    defaultValue={editItem?.phone || ""}
                    className={
                      custErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    onChange={() => clearCustError("phone")}
                  />
                  <FieldError message={custErrors.phone} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="e.g. 123 Main St"
                  defaultValue={editItem?.address || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g. New York"
                    defaultValue={editItem?.city || ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode">Zip / Postal Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="e.g. 10001"
                    defaultValue={editItem?.zipCode || ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">{t("customerType") || "Customer Type"}</Label>
                  <SearchableSelect
                    options={[
                      { value: "retail", label: "Retail" },
                      { value: "wholesale", label: "Wholesale" },
                      { value: "dealer", label: "Dealer" },
                      { value: "corporate", label: "Corporate" },
                    ]}
                    value={editItem?.type || "retail"}
                    onChange={(val) => {
                      const input = document.createElement("input");
                      input.type = "hidden";
                      input.name = "type";
                      input.value = val;
                      document.getElementById("customer-form")?.appendChild(input);
                      if (editItem) setEditItem({ ...editItem, type: val as any });
                    }}
                    placeholder="Select Type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t("status") || "Status"}</Label>
                  <SearchableSelect
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                    value={editItem?.status || "active"}
                    onChange={(val) => {
                      const input = document.createElement("input");
                      input.type = "hidden";
                      input.name = "status";
                      input.value = val;
                      document.getElementById("customer-form")?.appendChild(input);
                      if (editItem) setEditItem({ ...editItem, status: val });
                    }}
                    placeholder="Select Status"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">Credit Limit ({currencySymbol})</Label>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  defaultValue={editItem?.creditLimit || 5000}
                  className={
                    custErrors.creditLimit ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearCustError("creditLimit")}
                />
                <FieldError message={custErrors.creditLimit} />
              </div>
            </div>
            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearCustAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Customer
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer record.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Outstanding Balance for <strong>{settleItem?.name}</strong> is{" "}
              <strong className="text-destructive">{formatCurrency(settleItem?.credit)}</strong>.
            </div>
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                max={settleItem?.credit}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettleItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSettling}>
                {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Customer Khata Ledger Statement Side Drawer */}
      <Sheet open={!!ledgerCustomer} onOpenChange={(open) => !open && setLedgerCustomer(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto p-6 bg-background border-l border-border shadow-elevated"
        >
          <SheetHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b pb-4 pr-6 sm:pr-8 text-left">
            <div className="w-full sm:w-auto text-left">
              <SheetTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-left">
                <span>Khata Statement (লেজার খাতা)</span>
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                {ledgerCustomer?.name} · {ledgerCustomer?.phone}
              </p>
            </div>
            <div className="flex flex-wrap w-full sm:w-auto gap-2 mt-2 sm:mt-0">
              {ledgerCustomer?.phone && ledgerCustomer?.credit > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-success/10 text-success border-success/30 hover:bg-success/20 font-semibold flex-1 sm:flex-none"
                  onClick={() =>
                    sendAutomatedDueReminder(
                      settings?.storeName || "OneDesk360",
                      ledgerCustomer.name,
                      ledgerCustomer.phone || "",
                      ledgerCustomer.credit,
                    )
                  }
                >
                  🤖 Send AI Reminder
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.print()}
              >
                Print
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none w-full sm:w-auto"
                onClick={() => {
                  if (ledgerCustomer) {
                    setSettleItem(ledgerCustomer);
                    setSettleAmount(ledgerCustomer.credit.toString());
                  }
                }}
              >
                + Settle Due
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {/* Ledger KPI Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Total Outstanding Due
                </div>
                <div className="text-xl font-bold text-destructive mt-0.5">
                  {formatCurrency(ledgerCustomer?.credit || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Credit Limit</div>
                <div className="text-xl font-bold mt-0.5">
                  {formatCurrency(ledgerCustomer?.creditLimit || 5000)}
                </div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">
                  Available Credit
                </div>
                <div className="text-xl font-bold text-success mt-0.5">
                  {formatCurrency(
                    Math.max(
                      0,
                      (ledgerCustomer?.creditLimit || 5000) - (ledgerCustomer?.credit || 0),
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transaction History Statement
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border shadow-soft">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-2.5 text-left">Date</TableHead>
                      <TableHead className="px-3 py-2.5 text-left">Type</TableHead>
                      <TableHead className="px-3 py-2.5 text-left">Ref #</TableHead>
                      <TableHead className="px-3 py-2.5 text-right">Debit (+Due)</TableHead>
                      <TableHead className="px-3 py-2.5 text-right">Credit (-Paid)</TableHead>
                      <TableHead className="px-3 py-2.5 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerLedgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded in ledger yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerLedgerEntries.map((l) => (
                        <TableRow key={l.id} className="hover:bg-muted/30">
                          <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(l.date).toLocaleString()}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 font-medium capitalize whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                l.type === "invoice"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-success/10 text-success",
                              )}
                            >
                              {l.type}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                            {l.referenceNo || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right font-semibold text-destructive whitespace-nowrap">
                            {l.type === "invoice" ? formatCurrency(l.amount) : "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right font-semibold text-success whitespace-nowrap">
                            {l.type === "payment" || l.type === "return"
                              ? formatCurrency(l.amount)
                              : "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
