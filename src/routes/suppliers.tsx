import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { appName } from "@/lib/env";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FieldError } from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/useFormValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FileText,
  CheckCircle2,
  Loader2,
  DollarSign,
  Clock,
  MoreVertical,
  Wallet,
  Building2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Upload,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: `Suppliers & Vendor Khata · ${appName}` }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form active tab in Drawer
  const [activeFormTab, setActiveFormTab] = useState<
    "general" | "tax_address" | "banking" | "notes"
  >("general");

  // Form Fields State
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscSwift, setIfscSwift] = useState("");
  const [upiId, setUpiId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  // Settlement and Ledger States
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

  const rawSuppliers: any[] = Array.isArray(suppliersData) ? suppliersData : [];

  const { data: supplierLedgerEntriesData, isLoading: isLedgerLoading } = useQuery({
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
  const supplierLedgerEntries = Array.isArray(supplierLedgerEntriesData)
    ? supplierLedgerEntriesData
    : [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [balanceFilter, setBalanceFilter] = useState("all");

  const suppliers = useMemo(() => {
    let list = rawSuppliers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(lower) ||
          s.contact?.toLowerCase().includes(lower) ||
          s.email?.toLowerCase().includes(lower) ||
          s.phone?.includes(lower) ||
          s.gstin?.toLowerCase().includes(lower) ||
          s.city?.toLowerCase().includes(lower),
      );
    }
    if (balanceFilter === "has_balance") {
      list = list.filter((s) => Number(s.balance) > 0);
    } else if (balanceFilter === "settled") {
      list = list.filter((s) => Number(s.balance) <= 0);
    }
    return [...list].reverse();
  }, [rawSuppliers, debouncedSearch, balanceFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalSuppliers = rawSuppliers.length;
    const totalPayable = rawSuppliers.reduce(
      (acc, s) => acc + Math.max(0, Number(s.balance) || 0),
      0,
    );
    const withDue = rawSuppliers.filter((s) => Number(s.balance) > 0).length;
    const settled = rawSuppliers.filter((s) => Number(s.balance) <= 0).length;
    return { totalSuppliers, totalPayable, withDue, settled };
  }, [rawSuppliers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, balanceFilter]);

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
    contact: { required: "Contact person is required" },
    phone: { required: "Phone number is required" },
  });

  const resetForm = () => {
    setName("");
    setContact("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setGstin("");
    setPan("");
    setStateCode("");
    setAddress("");
    setCity("");
    setState("");
    setPostalCode("");
    setCountry("India");
    setPaymentTerms("Net 30");
    setCreditLimit("");
    setOpeningBalance("0");
    setBankName("");
    setAccountNumber("");
    setIfscSwift("");
    setUpiId("");
    setNotes("");
    setStatus("active");
    setActiveFormTab("general");
    clearSuppAll();
  };

  const openAddDrawer = () => {
    setEditItem(null);
    resetForm();
    setIsAddOpen(true);
  };

  const openEditDrawer = (s: any) => {
    setEditItem(s);
    setName(s.name || "");
    setContact(s.contact || "");
    setPhone(s.phone || "");
    setEmail(s.email || "");
    setWebsite(s.website || "");
    setGstin(s.gstin || "");
    setPan(s.pan || "");
    setStateCode(s.stateCode || "");
    setAddress(s.address || "");
    setCity(s.city || "");
    setState(s.state || "");
    setPostalCode(s.postalCode || "");
    setCountry(s.country || "India");
    setPaymentTerms(s.paymentTerms || "Net 30");
    setCreditLimit(s.creditLimit || "");
    setOpeningBalance(s.balance || "0");
    setBankName(s.bankName || "");
    setAccountNumber(s.accountNumber || "");
    setIfscSwift(s.ifscSwift || "");
    setUpiId(s.upiId || "");
    setNotes(s.notes || "");
    setStatus(s.status || "active");
    setActiveFormTab("general");
    clearSuppAll();
    setIsAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateSupp({
      name: name.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
    });
    if (!isValid) {
      setActiveFormTab("general");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        website: website.trim() || null,
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        stateCode: stateCode.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postalCode: postalCode.trim() || null,
        country: country.trim() || null,
        paymentTerms: paymentTerms || null,
        creditLimit: creditLimit ? Number(creditLimit) : null,
        balance: openingBalance ? Number(openingBalance) : 0,
        bankName: bankName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        ifscSwift: ifscSwift.trim() || null,
        upiId: upiId.trim() || null,
        notes: notes.trim() || null,
        status: status || "active",
      };

      if (editItem) {
        const res = (await updateSupplierFn({
          data: { id: editItem.id, updates: payload },
        })) as any;
        if (res?.success) {
          toast.success("Supplier updated successfully");
          setIsAddOpen(false);
          setEditItem(null);
        } else throw new Error(res?.error);
      } else {
        const res = (await createSupplierFn({
          data: {
            supplier: {
              id: uuidv4(),
              ...payload,
            },
          },
        })) as any;
        if (res?.success) {
          toast.success("Supplier added successfully");
          setIsAddOpen(false);
        } else throw new Error(res?.error);
      }
      queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = (await deleteSupplierFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success("Supplier deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
        } else throw new Error(res?.error);
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete supplier");
      }
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleItem || !settleAmount || Number(settleAmount) <= 0) return;
    setIsSettling(true);
    try {
      const amountNum = parseFloat(settleAmount);
      const newBal = Math.max(0, (Number(settleItem.balance) || 0) - amountNum);

      await createSupplierLedgerFn({
        data: {
          ledger: {
            id: uuidv4(),
            supplierId: settleItem.id,
            date: new Date().toISOString(),
            type: "Payment Settlement",
            amount: String(amountNum),
            balanceAfter: String(newBal),
            note: "Direct balance payment settlement",
          },
        },
      });

      await updateSupplierFn({
        data: {
          id: settleItem.id,
          updates: { balance: String(newBal) },
        },
      });

      toast.success("Settlement recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["supplierLedger"] });
      setSettleItem(null);
      setSettleAmount("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to process payment settlement");
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
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gstin", label: "GSTIN" },
        { key: "balance", label: "Payable Balance" },
      ],
      "suppliers",
    );
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in CSV");
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
                contact: row["Contact"] || row["Contact Person"] || "Representative",
                phone: row["Phone"] || "",
                email: row["Email"] || "",
                gstin: row["GSTIN"] || "",
              },
            },
          });
          count++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["suppliers", orgId] });
      toast.success(`Imported ${count} suppliers`);
    } catch {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Consistent Standard PageHeader */}
      <PageHeader
        title="Suppliers & Vendor Khata"
        description="Manage vendor relationships, purchase records, and outstanding payable balances."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("supplier-import-input")?.click()}
              className="gap-1.5"
            >
              <Upload className="size-4" /> Import CSV
              <input
                type="file"
                id="supplier-import-input"
                className="hidden"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleImport(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openAddDrawer} className="gap-1.5">
              <Plus className="size-4" /> Add Supplier
            </Button>
          </div>
        }
      />

      {/* Standard Unified StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vendors"
          value={String(metrics.totalSuppliers)}
          hint="Registered procurement partners"
          icon={Building2}
          accent="primary"
        />
        <StatCard
          label="Total Khata Payable"
          value={formatCurrency(metrics.totalPayable)}
          hint="Outstanding vendor balance"
          icon={DollarSign}
          accent="destructive"
        />
        <StatCard
          label="Accounts With Due"
          value={String(metrics.withDue)}
          hint="Vendors awaiting payment"
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label="Settled Accounts"
          value={String(metrics.settled)}
          hint="Zero balance remaining"
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* Main Table & List Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, phone, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="h-9 w-38 text-xs rounded-lg">
                <SelectValue placeholder="All Balances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="has_balance">Outstanding Dues (&gt; 0)</SelectItem>
                <SelectItem value="settled">Settled (0 Due)</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isSuppliersLoading ? (
          viewMode === "table" ? (
            <TableSkeleton columns={6} rows={6} />
          ) : (
            <CardGridSkeleton cards={6} />
          )
        ) : isSuppliersError ? (
          <ErrorState onRetry={refetchSuppliers} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers found"
            description={
              search
                ? "Try adjusting your search criteria."
                : "You haven't registered any suppliers yet."
            }
            actionLabel="Add Supplier"
            onAction={openAddDrawer}
          />
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[850px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier & Business Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>GSTIN / Tax ID</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Khata Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSuppliers.map((s: any) => {
                    const hasDue = Number(s.balance) > 0;
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div
                            onClick={() => setLedgerSupplier(s)}
                            className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
                          >
                            {s.name}
                          </div>
                          {s.city && <div className="text-xs text-muted-foreground">{s.city}</div>}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {s.contact || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground">{s.phone || "—"}</div>
                          {s.email && <div className="text-muted-foreground">{s.email}</div>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {s.gstin || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.paymentTerms || "Net 30"}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasDue ? (
                            <Badge
                              variant="outline"
                              className="bg-destructive/10 text-destructive border-destructive/25 text-xs font-bold"
                            >
                              Due: {formatCurrency(Number(s.balance))}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-success/15 text-success border-success/30 text-[10px] font-bold uppercase"
                            >
                              Settled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasDue && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSettleItem(s);
                                  setSettleAmount(String(s.balance));
                                }}
                                className="h-8 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
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
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-40">
                                <DropdownMenuItem
                                  onClick={() => openEditDrawer(s)}
                                  className="text-xs font-semibold"
                                >
                                  <Edit2 className="size-3.5 mr-2 text-primary" /> Edit Profile
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {suppliers.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={suppliers.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        ) : (
          /* Card Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSuppliers.map((s: any) => {
                const hasDue = Number(s.balance) > 0;
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-base shrink-0">
                            {s.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3
                              onClick={() => setLedgerSupplier(s)}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate cursor-pointer"
                            >
                              {s.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{s.contact}</p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-40">
                            <DropdownMenuItem
                              onClick={() => openEditDrawer(s)}
                              className="text-xs font-semibold"
                            >
                              <Edit2 className="size-3.5 mr-2 text-primary" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setLedgerSupplier(s)}
                              className="text-xs font-semibold"
                            >
                              <FileText className="size-3.5 mr-2 text-blue-500" /> Khata Ledger
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(s.id)}
                              className="text-xs font-semibold text-destructive"
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{s.phone}</span>
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{s.email}</span>
                          </div>
                        )}
                        {s.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0" />
                            <span>{s.city}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            Khata Balance
                          </span>
                          <span
                            className={`text-sm font-bold ${hasDue ? "text-destructive" : "text-success"}`}
                          >
                            {hasDue
                              ? `Due: ${formatCurrency(Number(s.balance))}`
                              : `Settled (${currencySymbol}0.00)`}
                          </span>
                        </div>
                        {s.paymentTerms && (
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {s.paymentTerms}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerSupplier(s)}
                        className="h-8 text-xs font-semibold flex-1"
                      >
                        Ledger Statement
                      </Button>
                      {hasDue && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSettleItem(s);
                            setSettleAmount(String(s.balance));
                          }}
                          className="h-8 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Settle
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {suppliers.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={suppliers.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comprehensive Supplier Add/Edit Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {editItem ? "Edit Supplier Profile" : "Add New Supplier"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Configure vendor contact information, tax identification, billing terms, and bank
                routing.
              </SheetDescription>

              {/* Form Navigation Tabs */}
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveFormTab("general")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeFormTab === "general"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="size-3.5" /> 1. Contacts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab("tax_address")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeFormTab === "tax_address"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="size-3.5" /> 2. Tax & Address
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab("banking")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeFormTab === "banking"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Landmark className="size-3.5" /> 3. Terms & Bank
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab("notes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeFormTab === "notes"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3.5" /> 4. Notes
                </button>
              </div>
            </SheetHeader>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* TAB 1: General & Contacts */}
                {activeFormTab === "general" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold">
                        Supplier / Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g. Apex Electronics Ltd"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          clearSuppError("name");
                        }}
                        className={
                          suppErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                        }
                      />
                      <FieldError message={suppErrors.name} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact" className="text-xs font-semibold">
                          Contact Person <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contact"
                          placeholder="e.g. John Doe"
                          value={contact}
                          onChange={(e) => {
                            setContact(e.target.value);
                            clearSuppError("contact");
                          }}
                          className={
                            suppErrors.contact
                              ? "border-destructive focus-visible:ring-destructive"
                              : ""
                          }
                        />
                        <FieldError message={suppErrors.contact} />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold">
                          Phone Number <span className="text-destructive">*</span>
                        </Label>
                        <PhoneInput
                          id="phone"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearSuppError("phone");
                          }}
                          className={
                            suppErrors.phone
                              ? "border-destructive focus-visible:ring-destructive"
                              : ""
                          }
                        />
                        <FieldError message={suppErrors.phone} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="e.g. billing@vendor.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="website" className="text-xs font-semibold">
                          Website
                        </Label>
                        <Input
                          id="website"
                          placeholder="e.g. https://vendor.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Tax & Address */}
                {activeFormTab === "tax_address" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="gstin" className="text-xs font-semibold">
                          GSTIN / Tax ID
                        </Label>
                        <Input
                          id="gstin"
                          placeholder="e.g. 29ABCDE1234F1Z5"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pan" className="text-xs font-semibold">
                          PAN Number
                        </Label>
                        <Input
                          id="pan"
                          placeholder="e.g. ABCDE1234F"
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="stateCode" className="text-xs font-semibold">
                          State Code
                        </Label>
                        <Input
                          id="stateCode"
                          placeholder="e.g. 29"
                          value={stateCode}
                          onChange={(e) => setStateCode(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-xs font-semibold">
                        Street Address
                      </Label>
                      <Input
                        id="address"
                        placeholder="e.g. 123 Commerce Way, Suite 400"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-xs font-semibold">
                          City
                        </Label>
                        <Input
                          id="city"
                          placeholder="e.g. Mumbai"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="state" className="text-xs font-semibold">
                          State / Province
                        </Label>
                        <Input
                          id="state"
                          placeholder="e.g. Maharashtra"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="postalCode" className="text-xs font-semibold">
                          Postal Code
                        </Label>
                        <Input
                          id="postalCode"
                          placeholder="e.g. 400001"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Terms & Banking */}
                {activeFormTab === "banking" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Payment Terms</Label>
                        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                            <SelectItem value="Advance">100% Advance</SelectItem>
                            <SelectItem value="Net 7">Net 7 Days</SelectItem>
                            <SelectItem value="Net 15">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30">Net 30 Days</SelectItem>
                            <SelectItem value="Net 60">Net 60 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="creditLimit" className="text-xs font-semibold">
                          Credit Limit ({currencySymbol})
                        </Label>
                        <Input
                          id="creditLimit"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="openingBalance" className="text-xs font-semibold">
                          Opening Due Balance ({currencySymbol})
                        </Label>
                        <Input
                          id="openingBalance"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={openingBalance}
                          onChange={(e) => setOpeningBalance(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Bank Settlement Details
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="bankName" className="text-xs font-semibold">
                            Bank Name
                          </Label>
                          <Input
                            id="bankName"
                            placeholder="e.g. HDFC Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="accountNumber" className="text-xs font-semibold">
                            Account Number
                          </Label>
                          <Input
                            id="accountNumber"
                            placeholder="e.g. 50100234567890"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="ifscSwift" className="text-xs font-semibold">
                            IFSC / SWIFT Code
                          </Label>
                          <Input
                            id="ifscSwift"
                            placeholder="e.g. HDFC0001234"
                            value={ifscSwift}
                            onChange={(e) => setIfscSwift(e.target.value.toUpperCase())}
                            className="font-mono uppercase"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="upiId" className="text-xs font-semibold">
                            UPI ID
                          </Label>
                          <Input
                            id="upiId"
                            placeholder="e.g. vendor@upi"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Status & Notes */}
                {activeFormTab === "notes" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Supplier Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="preferred">Preferred / VIP Vendor ⭐</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-xs font-semibold">
                        Procurement Notes
                      </Label>
                      <Textarea
                        id="notes"
                        rows={4}
                        placeholder="Internal vendor notes, delivery instructions..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {activeFormTab !== "general" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeFormTab === "tax_address") setActiveFormTab("general");
                        if (activeFormTab === "banking") setActiveFormTab("tax_address");
                        if (activeFormTab === "notes") setActiveFormTab("banking");
                      }}
                      className="text-xs"
                    >
                      Back
                    </Button>
                  )}
                  {activeFormTab !== "notes" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeFormTab === "general") setActiveFormTab("tax_address");
                        if (activeFormTab === "tax_address") setActiveFormTab("banking");
                        if (activeFormTab === "banking") setActiveFormTab("notes");
                      }}
                      className="text-xs font-semibold text-primary"
                    >
                      Next →
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                    {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                    {editItem ? "Update Supplier" : "Save Supplier"}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Settle Balance Drawer Sheet */}
      <Sheet open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                <span>Settle Vendor Balance</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Record a direct payment settlement for <strong>{settleItem?.name}</strong>.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSettle}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-1">
                  <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
                    Current Due Balance
                  </span>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(Number(settleItem?.balance) || 0)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settleAmount" className="text-xs font-semibold">
                    Settlement Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="settleAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="font-bold text-base"
                    required
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setSettleItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSettling} className="font-semibold shadow-sm">
                  {isSettling && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Confirm Payment
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Supplier Khata Ledger Statement Drawer */}
      <Sheet open={!!ledgerSupplier} onOpenChange={(open) => !open && setLedgerSupplier(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          {ledgerSupplier && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl font-bold text-foreground">
                      {ledgerSupplier.name} — Khata Statement
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                      {ledgerSupplier.contact} · {ledgerSupplier.phone}
                    </SheetDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Due Balance
                    </span>
                    <span className="text-lg font-bold text-destructive">
                      {formatCurrency(Number(ledgerSupplier.balance) || 0)}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="rounded-xl border border-border/80 overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierLedgerEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            No ledger history found for this supplier.
                          </TableCell>
                        </TableRow>
                      ) : (
                        supplierLedgerEntries.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-muted-foreground">
                              {formatDate(l.date)}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {l.type}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{l.note || "—"}</TableCell>
                            <TableCell className="font-bold text-right">
                              {formatCurrency(Number(l.amount))}
                            </TableCell>
                            <TableCell className="font-bold text-right text-primary">
                              {formatCurrency(Number(l.balanceAfter))}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setLedgerSupplier(null)}>
                  Close Statement
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Delete Supplier
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to permanently delete this supplier?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
