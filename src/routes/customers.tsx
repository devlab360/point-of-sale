import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { sendAutomatedDueReminder } from "@/lib/automation/due-bot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Loader2,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  X,
  Star,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Wallet,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CUSTOMER_TYPES, CUSTOMER_STATUSES } from "@/constants";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: `Customers · ${appName}` }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
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

  const customers: any[] = customersResponse?.data || [];
  const totalCount = customersResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Metrics summary
  const metrics = useMemo(() => {
    const totalDue = customers.reduce((acc, c) => acc + (Number(c.credit) || 0), 0);
    const totalJama = customers.reduce((acc, c) => acc + (Number(c.walletBalance) || 0), 0);
    const totalPoints = customers.reduce((acc, c) => acc + (Number(c.loyaltyPoints || c.points) || 0), 0);
    return { totalDue, totalJama, totalPoints };
  }, [customers]);

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
    phone: { phone: "Enter a valid phone number" },
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
          toast.success(t("customerUpdatedSuccess", "Customer updated successfully"));
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
          toast.success(t("customerAddedSuccess", "Customer added successfully"));
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
          toast.success(t("customerDeleted", "Customer deleted"));
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
      toast.error(t("enterValidAmountBalance", "Please enter a valid amount up to the outstanding balance."));
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
        toast.error(t("noDataInCsv", "No data found in CSV"));
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
    } catch {
      toast.error(t("failedToParseCsv", "Failed to parse CSV file"));
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
        title={t("customers", "Customers")}
        description={t("manageCustomers", "Manage customer relationships, loyalty, and ledgers.")}
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
            <Button
              size="sm"
              onClick={() => {
                setEditItem(null);
                setIsAddOpen(true);
              }}
              className="shadow-soft"
            >
              <Plus className="size-4 mr-1.5" />
              {t("addCustomer", "Add Customer")}
            </Button>
          </>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalCustomers", "Total Customers")}
          value={String(totalCount)}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label={t("creditDue", "Total Due (Udhaar)")}
          value={formatCurrency(metrics.totalDue)}
          icon={AlertCircle}
          accent="destructive"
        />
        <StatCard
          label={t("walletBalance", "Advance (Jama)")}
          value={formatCurrency(metrics.totalJama)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("loyaltyPoints", "Loyalty Points")}
          value={metrics.totalPoints.toLocaleString()}
          icon={Star}
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
            placeholder={t("searchCustomers", "Search by name, email, or phone...")}
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
                <SheetTitle className="text-lg font-bold">{t("filterCustomers", "Filter Customers")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("customerType", "Customer Type")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allTypes", "All Types") },
                      ...CUSTOMER_TYPES.map((typeObj) => ({
                        value: typeObj.value,
                        label: t(typeObj.value, typeObj.label),
                      })),
                    ]}
                    value={draftFilters.type}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                    placeholder={t("filterByType", "Filter by Type")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("accountStatus", "Account Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allStatuses", "All Statuses") },
                      ...CUSTOMER_STATUSES.map((s) => ({
                        value: s.value,
                        label: t(s.value, s.label),
                      })),
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

      {/* Main Content Card */}
      {isCustomersLoading ? (
        <TableSkeleton columns={9} rows={6} showHeaderAction={false} showFilters={false} />
      ) : isCustomersError ? (
        <ErrorState onRetry={refetchCustomers} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          {/* Desktop Table */}
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("customerName", "Customer Name")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("mobilePhone", "Mobile Phone")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">{t("visits", "Visits")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                    {t("spent", "Total Purchases")}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">{t("points", "Points")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right text-destructive">
                    {t("credit", "Udhaar (Due)")}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right text-success">
                    {t("wallet", "Jama / Advance")}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">{t("tier", "Category")}</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-right">{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <EmptyState
                        icon={Users}
                        title={t("noCustomersFound", "No customers found")}
                        description={
                          search
                            ? t("adjustSearch", "Try adjusting your search query.")
                            : t("noCustomersYet", "You haven't added any customers yet.")
                        }
                        actionLabel={t("addCustomer", "Add Customer")}
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
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
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
                      <TableCell className="number text-right font-medium text-xs">
                        {c.visits || 0}
                      </TableCell>
                      <TableCell className="number text-right font-bold text-sm">
                        {formatCurrency(c.totalSpent || 0)}
                      </TableCell>
                      <TableCell className="number text-right font-semibold text-primary text-xs">
                        {(c.loyaltyPoints ?? c.points ?? 0).toLocaleString()} pts
                      </TableCell>
                      <TableCell className="number text-right font-bold text-destructive text-sm">
                        {c.credit > 0 ? formatCurrency(c.credit) : "—"}
                      </TableCell>
                      <TableCell className="number text-right font-semibold text-success text-sm">
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
                            <span className="text-[10px] font-extrabold text-warning">
                              ★ VIP
                            </span>
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

          {/* Mobile Feed */}
          <div className="table-mobile-cards p-3 space-y-2.5">
            {customers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("noCustomersFound", "No customers found")}
                description={
                  search
                    ? t("adjustSearch", "Try adjusting your search query.")
                    : t("noCustomersYet", "You haven't added any customers yet.")
                }
                actionLabel={t("addCustomer", "Add Customer")}
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
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold py-0 capitalize"
                        >
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
            <div className="border-t border-border/60 p-3">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}

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
              {editItem ? t("editCustomer", "Edit Customer Profile") : t("addNewCustomer", "Add New Customer")}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("manageClientDetailsDesc", "Manage client details, credit limits, khata balance, and contact information.")}
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
                  {t("fullName", "Full Name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("customerNamePlaceholder", "e.g. Customer Name")}
                  defaultValue={editItem?.name || ""}
                  className={
                    custErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearCustError("name")}
                />
                <FieldError message={custErrors.name} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("email", "Email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t("customerEmailPlaceholder", "e.g. email@example.com")}
                    defaultValue={editItem?.email || ""}
                    className={
                      custErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                    onChange={() => clearCustError("email")}
                  />
                  <FieldError message={custErrors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("phone", "Phone")}</Label>
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
                <Label htmlFor="address">{t("address", "Address")}</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder={t("customerAddressPlaceholder", "e.g. 123 Main St")}
                  defaultValue={editItem?.address || ""}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">{t("city", "City")}</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g. New York"
                    defaultValue={editItem?.city || ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode">{t("zipCode", "Zip / Postal Code")}</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="e.g. 10001"
                    defaultValue={editItem?.zipCode || ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">{t("customerType", "Customer Type")}</Label>
                  <SearchableSelect
                    options={CUSTOMER_TYPES.map((tItem) => ({
                      value: tItem.value,
                      label: t(tItem.value, tItem.label),
                    }))}
                    value={editItem?.type || "retail"}
                    onChange={(val) => {
                      const input = document.createElement("input");
                      input.type = "hidden";
                      input.name = "type";
                      input.value = val;
                      document.getElementById("customer-form")?.appendChild(input);
                      if (editItem) setEditItem({ ...editItem, type: val as any });
                    }}
                    placeholder={t("selectType", "Select Type")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t("status", "Status")}</Label>
                  <SearchableSelect
                    options={CUSTOMER_STATUSES.map((s) => ({
                      value: s.value,
                      label: t(s.value, s.label),
                    }))}
                    value={editItem?.status || "active"}
                    onChange={(val) => {
                      const input = document.createElement("input");
                      input.type = "hidden";
                      input.name = "status";
                      input.value = val;
                      document.getElementById("customer-form")?.appendChild(input);
                      if (editItem) setEditItem({ ...editItem, status: val });
                    }}
                    placeholder={t("selectStatus", "Select Status")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">
                  {t("creditLimit", "Credit Limit")} ({currencySymbol})
                </Label>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  defaultValue={editItem?.creditLimit || 5000}
                  className={
                    custErrors.creditLimit
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
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
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("saveCustomer", "Save Customer")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure", "Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "deleteCustomerConfirmDesc",
                "This action cannot be undone. This will permanently delete the customer record.",
              )}
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

      <Dialog open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settleBalance", "Settle Balance")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t("outstandingBalanceFor", "Outstanding Balance for")}{" "}
              <strong>{settleItem?.name}</strong> is{" "}
              <strong className="text-destructive">{formatCurrency(settleItem?.credit)}</strong>.
            </div>
            <div className="space-y-2">
              <Label>{t("paymentAmount", "Payment Amount")}</Label>
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
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSettling}>
                {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("recordPayment", "Record Payment")}
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
                <span>{t("khataStatement", "Khata Statement (লেজার খাতা)")}</span>
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
                      settings?.storeName || appName,
                      ledgerCustomer.name,
                      ledgerCustomer.phone || "",
                      ledgerCustomer.credit,
                    )
                  }
                >
                  🤖 {t("sendAiReminder", "Send AI Reminder")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.print()}
              >
                {t("print", "Print")}
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
                {t("settleDue", "+ Settle Due")}
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {/* Ledger KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">
                  {t("totalOutstandingDue", "Total Outstanding Due")}
                </div>
                <div className="text-xl font-bold text-destructive mt-0.5">
                  {formatCurrency(ledgerCustomer?.credit || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">
                  {t("creditLimit", "Credit Limit")}
                </div>
                <div className="text-xl font-bold mt-0.5">
                  {formatCurrency(ledgerCustomer?.creditLimit || 5000)}
                </div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">
                  {t("availableCredit", "Available Credit")}
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
                {t("transactionHistoryStatement", "Transaction History Statement")}
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border shadow-soft">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-2.5 text-left">{t("date", "Date")}</TableHead>
                      <TableHead className="px-3 py-2.5 text-left">{t("type", "Type")}</TableHead>
                      <TableHead className="px-3 py-2.5 text-left">{t("refNo", "Ref #")}</TableHead>
                      <TableHead className="px-3 py-2.5 text-right">
                        {t("debitDue", "Debit (+Due)")}
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right">
                        {t("creditPaid", "Credit (-Paid)")}
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right">
                        {t("balance", "Balance")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerLedgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          {t("noTransactionsInLedger", "No transactions recorded in ledger yet.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerLedgerEntries.map((l: any) => (
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
