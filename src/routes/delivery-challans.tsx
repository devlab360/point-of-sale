import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { appName } from "@/lib/env";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Printer,
  CheckCircle2,
  MoreVertical,
  Trash2,
  ArrowRightLeft,
  Loader2,
  Plus,
  Search,
  Download,
  RotateCcw,
  Filter,
  Clock,
  Package,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDeliveryChallansFn,
  createDeliveryChallanFn,
  updateDeliveryChallanStatusFn,
  deleteDeliveryChallanFn,
} from "@/api/delivery-challans";
import { getCustomersFn, createCustomerFn } from "@/api/customers";
import { getProductsFn, updateProductFn } from "@/api/products";
import { getUnitsFn } from "@/api/units";
import { createSaleFn } from "@/api/sales";
import { createInventoryMovementFn } from "@/api/inventory";
import { useCurrency } from "@/lib/currency";
import { CHALLAN_STATUSES } from "@/constants";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/delivery-challans")({
  head: () => ({ meta: [{ title: `Delivery Challans · ${appName}` }] }),
  component: DeliveryChallansPage,
});

type ChallanLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
};

function DeliveryChallansPage() {
  const { t } = useLanguage();
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawChallansData } = useQuery({
    queryKey: ["deliveryChallans", orgId],
    queryFn: async () => {
      try {
        const res = (await getDeliveryChallansFn({ data: {} })) as any;
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const rawChallans = Array.isArray(rawChallansData) ? rawChallansData : [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => {
      try {
        const res = (await getCustomersFn({ data: {} })) as any;
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const customers = Array.isArray(customersData) ? customersData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      try {
        const res = (await getProductsFn({ data: {} })) as any;
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const { data: unitsData } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => {
      try {
        const res = (await getUnitsFn({ data: {} })) as any;
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const units = Array.isArray(unitsData) ? unitsData : [];

  const getUnitDisplay = (unitIdOrName: string) => {
    if (!unitIdOrName) return "";
    const found = units.find((u: any) => u?.id === unitIdOrName || u?.name === unitIdOrName);
    if (found) return found?.short || found?.name;
    if (unitIdOrName.length > 20 && unitIdOrName.includes("-")) return "unit";
    return unitIdOrName;
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [transportName, setTransportName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState(
    "Goods dispatched in good condition. Please inspect upon delivery.",
  );
  const [lineItems, setLineItems] = useState<ChallanLineItem[]>([]);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredChallans = useMemo(() => {
    let filtered = Array.isArray(rawChallans) ? rawChallans : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c?.challanNo || "").toLowerCase().includes(lower) ||
          (c?.customerName || "").toLowerCase().includes(lower) ||
          (c?.transportName || "").toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((c) => c?.status === filters.status);
    }
    return [...filtered].reverse();
  }, [rawChallans, debouncedSearch, filters.status]);

  const totalPages = Math.ceil(filteredChallans.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredChallans.slice(start, start + pageSize);
  }, [filteredChallans, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const addItemToChallan = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    const cust = customers.find((c) => c.id === selectedCustomerId);

    let price = p.price;
    if (cust?.type === "wholesale" && p.wholesalePrice && p.wholesalePrice > 0) {
      price = p.wholesalePrice;
    } else if (cust?.type === "dealer" && p.dealerPrice && p.dealerPrice > 0) {
      price = p.dealerPrice;
    }

    setLineItems((prev) => {
      const exists = prev.find((item) => item.productId === productId);
      if (exists) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unit: p.unit, price }];
    });
  };

  const updateLineQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setLineItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setLineItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
    );
  };

  const {
    errors: chErrors,
    validate: validateCh,
    clearError: clearChError,
    clearAll: clearChAll,
  } = useFormValidation({
    selectedCustomerId: { required: "Customer is required" },
  });

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateCh({ selectedCustomerId });
    if (!isValid) return;

    if (lineItems.length === 0) {
      toast.error(t("addAtLeastOneLineItem", "Please add at least one line item"));
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return toast.error(t("selectCustomer", "Please select a customer"));

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const chNo = `CH-${Date.now().toString().slice(-6)}`;
      const res = await createDeliveryChallanFn({
        data: {
          challan: {
            challanNo: chNo,
            customerId: cust.id,
            customerName: cust.name,
            date: new Date().toISOString(),
            items: lineItems.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              unit: i.unit,
            })),
            status: "delivered",
            transportName,
            vehicleNo,
            driverName,
            notes,
          },
        },
      });
      if (!res?.success) throw new Error((res as any)?.error || "Failed to create");

      // Deduct stock immediately upon delivery challan dispatch
      for (const item of lineItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          await updateProductFn({
            data: { id: prod.id, updates: { stock: Math.max(0, prod.stock - item.quantity) } },
          });
          await createInventoryMovementFn({
            data: {
              movement: {
                productId: prod.id,
                productName: prod.name,
                action: `Challan ${chNo}`,
                quantity: -item.quantity,
              },
            },
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["deliveryChallans"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Delivery Challan ${chNo} created & goods dispatched!`);
      setIsAddOpen(false);
      setLineItems([]);
      clearChAll();
    } catch (err) {
      toast.error(t("failedToCreateChallan", "Failed to create delivery challan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertChallanToInvoice = async (ch: any) => {
    try {
      const invNum = `INV-${Date.now().toString().slice(-6)}`;

      // Compute Total
      let subtotal = 0;
      const saleItems: any[] = [];
      for (const item of ch.items) {
        const prod = products.find((p) => p.id === item.productId);
        const price = prod?.wholesalePrice || prod?.price || 0;
        const total = price * item.quantity;
        subtotal += total;
        saleItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price,
          total,
        });
      }

      const taxAmt = subtotal * 0.08;
      const grandTotal = subtotal + taxAmt;

      // 1. Create Sale Invoice
      const saleRes = await createSaleFn({
        data: {
          sale: {
            customerId: ch.customerId,
            customerName: ch.customerName,
            date: new Date().toISOString(),
            paymentMethod: "credit",
            status: "completed",
            paid: grandTotal,
          },
          items: ch.items.map((i: any) => ({
            referenceType: "PRODUCT",
            referenceId: i.productId,
            productId: i.productId,
            productName: i.productName || i.name || "Unknown Product",
            quantity: i.quantity,
            price: parseFloat(i.price) || 0,
          })),
        },
      });
      if (!saleRes.success) throw new Error((saleRes as any)?.error);

      // 2. Update Challan status
      const challanRes = await updateDeliveryChallanStatusFn({
        data: { id: ch.id, status: "invoiced" },
      });
      if (!challanRes.success) throw new Error((challanRes as any)?.error);

      queryClient.invalidateQueries({ queryKey: ["deliveryChallans"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`Delivery Challan ${ch.challanNo} billed as Sales Invoice #${invNum}!`);
      setViewItem(null);
    } catch (err) {
      toast.error(t("failedToConvertChallan", "Failed to convert challan to invoice"));
    }
  };

  const deleteChallan = async (id: string) => {
    try {
      const res = await deleteDeliveryChallanFn({ data: { id } });
      if (res?.success) {
        toast.success(t("challanDeleted", "Delivery Challan deleted"));
        queryClient.invalidateQueries({ queryKey: ["deliveryChallans"] });
      } else throw new Error((res as any)?.error);
    } catch {
      toast.error(t("failedToDeleteChallan", "Failed to delete delivery challan"));
    }
  };

  const handleExport = () => {
    if (filteredChallans.length === 0) {
      toast.error("No delivery challans to export");
      return;
    }
    const csvContent = [
      ["Challan No", "Customer", "Date", "Vehicle No", "Driver", "Status"],
      ...filteredChallans.map((c: any) => [
        c?.challanNo || "",
        c?.customerName || "",
        c?.date || "",
        c?.vehicleNo || "",
        c?.driverName || "",
        c?.status || "",
      ]),
    ]
      .map((row) => row.map((val) => `"${val || ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `delivery_challans_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("challansExportedSuccess", "Delivery Challans exported successfully"));
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("deliveryChallans", "Delivery Challans & Dispatch")}
        description={t("deliveryChallansDesc", "Issue goods dispatch slips, track vehicle deliveries, and convert challans to invoices.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-4" /> {t("exportCSV", "Export CSV")}
            </Button>
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> {t("createDeliveryChallan", "Create Challan")}
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalChallans", "Total Challans")}
          value={String(rawChallans.length)}
          hint={t("allDispatchLogs", "All dispatch records")}
          icon={Truck}
          accent="primary"
        />
        <StatCard
          label={t("invoiced", "Invoiced")}
          value={String(rawChallans.filter((c) => c.status === "invoiced").length)}
          hint={t("billedToCustomers", "Billed to customers")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("dispatched", "Dispatched / Out")}
          value={String(
            rawChallans.filter((c) => c.status === "dispatched" || c.status === "delivered").length,
          )}
          hint={t("goodsInTransit", "Goods in transit")}
          icon={Clock}
          accent="warning"
        />
        <StatCard
          label={t("pendingConversion", "Pending Conversion")}
          value={String(rawChallans.filter((c) => c.status !== "invoiced").length)}
          hint={t("awaitingInvoiceGeneration", "Awaiting sales invoice")}
          icon={Package}
          accent="info"
        />
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchChallans", "Search by challan # or customer...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs">
                <RotateCcw className="size-3.5" /> {t("reset", "Reset")}
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs relative">
                  <Filter className="size-3.5" />
                  <span>{t("filters", "Filters")}</span>
                  {activeFilterCount > 0 && (
                    <span className="size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
                <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
                  <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Filter className="size-4.5 text-primary" />
                    <span>{t("filterChallans", "Filter Challans")}</span>
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    {t("filterByStatusAndVehicleDispatchMode", "Filter by status and vehicle dispatch mode.")}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("status", "Status")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: t("allStatuses", "All Statuses") },
                        ...CHALLAN_STATUSES.map((c) => ({ value: c.value, label: c.label })),
                      ]}
                      value={draftFilters.status}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                      placeholder={t("filterByStatus", "Filter by Status")}
                    />
                  </div>
                </div>
                <SheetFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleResetFilters();
                    }}
                  >
                    {t("reset", "Reset")}
                  </Button>
                  <Button
                    className="flex-1 font-bold"
                    onClick={() => {
                      setFilters(draftFilters);
                    }}
                  >
                    {t("applyFilters", "Apply Filters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Table Card */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("challanNo", "Challan #")}</TableHead>
                  <TableHead>{t("customerName", "Customer Name")}</TableHead>
                  <TableHead>{t("dispatchDate", "Dispatch Date")}</TableHead>
                  <TableHead>{t("transportVehicle", "Transport / Vehicle")}</TableHead>
                  <TableHead>{t("status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <EmptyState
                        icon={Truck}
                        title={t("noChallansFound", "No delivery challans found")}
                        description={
                          search
                            ? t("tryAdjustingSearchQuery", "Try adjusting your search query.")
                            : t("noChallansCreatedYet", "Create your first delivery challan to dispatch goods.")
                        }
                        actionLabel={t("createChallan", "Create Challan")}
                        onAction={() => setIsAddOpen(true)}
                        className="border-none bg-transparent my-0 py-8 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell
                        className="font-mono font-semibold text-primary whitespace-nowrap cursor-pointer hover:underline"
                        onClick={() => setViewItem(c)}
                      >
                        {c.challanNo}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                        {c.customerName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.date)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium text-muted-foreground">
                        {c.transportName
                          ? `${c.transportName} (${c.vehicleNo || "N/A"})`
                          : t("selfLocalDispatch", "Self / Local Dispatch")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {c.status === "invoiced" ? (
                          <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                            {t("invoiced", "Invoiced")}
                          </Badge>
                        ) : (
                          <Badge className="bg-warning/15 text-warning-foreground border-warning/25 text-[10px] font-bold">
                            {t("dispatchedOut", "Dispatched / Out")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                              <MoreVertical className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem
                              onClick={() => setViewItem(c)}
                              className="text-xs font-semibold"
                            >
                              <Truck className="mr-2 size-3.5 text-primary" /> {t("viewPrintSlip", "View / Print Slip")}
                            </DropdownMenuItem>
                            {c.status !== "invoiced" && (
                              <DropdownMenuItem
                                onClick={() => convertChallanToInvoice(c)}
                                className="text-xs font-bold text-success"
                              >
                                <ArrowRightLeft className="mr-2 size-3.5" /> {t("convertToInvoice", "Convert to Invoice")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive text-xs font-semibold"
                              onClick={() => deleteChallan(c.id)}
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

          {/* Mobile Card Feed (< 768px) */}
          <div className="table-mobile-cards p-3 space-y-2.5">
            {paginated.length === 0 ? (
              <EmptyState
                icon={Truck}
                title={t("noChallansFound", "No delivery challans found")}
                description={
                  search
                    ? t("tryAdjustingSearchQuery", "Try adjusting your search query.")
                    : t("noChallansCreatedYet", "Create your first delivery challan to dispatch goods.")
                }
                actionLabel={t("createChallan", "Create Challan")}
                onAction={() => setIsAddOpen(true)}
                className="border-none bg-transparent my-0 py-6 shadow-none"
              />
            ) : (
              paginated.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  onClick={() => setViewItem(c)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {c.challanNo}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(c.date)}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                      {c.customerName}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {c.transportName
                        ? `${c.transportName} · ${c.vehicleNo || "N/A"}`
                        : t("localDispatch", "Local Dispatch")}
                    </p>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <Badge
                      className={
                        c.status === "invoiced"
                          ? "bg-success/12 text-success text-[9px] font-bold py-0"
                          : "bg-warning/15 text-warning-foreground text-[9px] font-bold py-0"
                      }
                    >
                      {c.status === "invoiced" ? t("invoiced", "Invoiced") : t("out", "Out")}
                    </Badge>
                    {c.status !== "invoiced" ? (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px] font-bold mt-1 shadow-soft flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          convertChallanToInvoice(c);
                        }}
                      >
                        <ArrowRightLeft className="size-3" /> {t("invoice", "Invoice")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredChallans.length > 0 && (
            <div className="border-t border-border/60 p-2 sm:p-3">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={filteredChallans.length}
              />
            </div>
          )}
        </div>

      {/* Create Delivery Challan Drawer */}
      <Sheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearChAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold text-foreground">
              {t("dispatchDeliveryChallan", "Dispatch Delivery Challan")}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("dispatchDeliveryChallanDesc", "Issue goods dispatch notes with driver, carrier, and vehicle verification.")}
            </p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateChallan}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <Label>
                  {t("customerConsignee", "Customer / Consignee")} <span className="text-destructive">*</span>
                </Label>
                <div
                  className={
                    chErrors.selectedCustomerId ? "rounded-md border border-destructive" : ""
                  }
                >
                  <SearchableSelect
                    options={customers.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedCustomerId}
                    onChange={(val) => {
                      setSelectedCustomerId(val);
                      clearChError("selectedCustomerId");
                    }}
                    placeholder={t("selectCustomer", "Select a customer...")}
                    onCreate={async (name) => {
                      const res = await createCustomerFn({ data: { customer: { name } } });
                      if (res?.success) {
                        queryClient.invalidateQueries({ queryKey: ["customers"] });
                        return res.data?.id;
                      }
                    }}
                  />
                </div>
                <FieldError message={chErrors.selectedCustomerId} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("transportCarrier", "Transport / Carrier")}</Label>
                  <Input
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    placeholder={t("transportPlaceholder", "e.g. FedEx / Own Vehicle")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("vehicleNo", "Vehicle No.")}</Label>
                  <Input
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder={t("vehicleNoPlaceholder", "e.g. MH-12-XX-9999")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("driverNameAndContact", "Driver Name & Contact")}</Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder={t("driverPlaceholder", "e.g. John Doe (555-0101)")}
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <Label>{t("searchAndAddProducts", "Search & Add Products")}</Label>
                <SearchableSelect
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `${t("stock", "Stock")}: ${p.stock} ${p.unit} | ${t("price", "Price")}: ${formatCurrency(p.price)}`,
                  }))}
                  value=""
                  onChange={(val) => {
                    if (val) {
                      addItemToChallan(val);
                      clearChError("lineItems");
                    }
                  }}
                  placeholder={t("searchProductsPlaceholder", "Search products by name or code...")}
                />
                <FieldError message={chErrors.lineItems} />
              </div>

              {/* Line Items List */}
              {lineItems.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>{t("dispatchedItems", "Dispatched Items")}</span>
                    <Badge variant="secondary" className="rounded-full text-[10px] px-2">
                      {lineItems.length}
                    </Badge>
                  </Label>
                  <div className="space-y-2">
                    {lineItems.map((item) => {
                      const displayUnit = getUnitDisplay(item.unit);
                      return (
                        <div
                          key={item.productId}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all hover:border-primary/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {item.productName}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 items-center rounded-lg border border-input bg-background overflow-hidden">
                              <Input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLineQty(item.productId, parseInt(e.target.value) || 1)
                                }
                                className="h-full w-20 border-0 bg-transparent px-2 text-center text-sm font-black shadow-none focus-visible:ring-0"
                              />
                              {displayUnit && (
                                <div className="flex h-full items-center justify-center bg-muted/50 px-3 border-l border-input">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {displayUnit}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateLineQty(item.productId, 0)}
                              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  clearChAll();
                }}
              >
                {t("cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[180px]">
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("dispatchDeliveryChallan", "Dispatch Delivery Challan")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* View / Print Delivery Challan Sheet */}
      <Sheet open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto p-6 bg-background border-l border-border"
        >
          <SheetHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b pb-4 pr-6 sm:pr-8 text-left">
            <div className="w-full sm:w-auto text-left">
              <SheetTitle className="text-lg sm:text-xl font-bold text-primary text-left">
                {viewItem?.challanNo}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                {t("deliverySlipFor", "Delivery Slip for")} {viewItem?.customerName}
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.print()}
              >
                <Printer className="mr-1 size-3.5" /> {t("printChallan", "Print Challan")}
              </Button>
              {viewItem?.status !== "invoiced" && (
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => viewItem && convertChallanToInvoice(viewItem)}
                >
                  <CheckCircle2 className="mr-1 size-3.5" /> {t("convertToInvoice", "Convert to Invoice")}
                </Button>
              )}
            </div>
          </SheetHeader>

          {viewItem && (
            <div className="space-y-6 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 bg-muted/20">
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">{t("deliverTo", "Deliver To")}</h4>
                  <div className="font-semibold text-base mt-1">{viewItem.customerName}</div>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    {t("transportDetails", "Transport Details")}
                  </h4>
                  <div className="text-xs mt-1">
                    {t("carrier", "Carrier")}: <strong>{viewItem.transportName || t("directLocal", "Direct / Local")}</strong>
                  </div>
                  <div className="text-xs">
                    {t("vehicleNo", "Vehicle No.")}: <strong>{viewItem.vehicleNo || "N/A"}</strong>
                  </div>
                  <div className="text-xs">
                    {t("driver", "Driver")}: <strong>{viewItem.driverName || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">
                  {t("dispatchedGoodsList", "Dispatched Goods List")}
                </h4>
                <div className="overflow-x-auto rounded-xl border">
                  <Table className="text-xs min-w-[500px]">
                    <TableHeader className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-2.5 text-left">#</TableHead>
                        <TableHead className="p-2.5 text-left">{t("descriptionOfGoods", "Description of Goods")}</TableHead>
                        <TableHead className="p-2.5 text-right">{t("quantity", "Quantity")}</TableHead>
                        <TableHead className="p-2.5 text-left">{t("unit", "Unit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewItem.items.map((i, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="p-2.5 font-mono text-muted-foreground whitespace-nowrap">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="p-2.5 font-semibold text-foreground whitespace-nowrap">
                            {i.productName}
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-base whitespace-nowrap">
                            {i.quantity}
                          </TableCell>
                          <TableCell className="p-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {getUnitDisplay(i.unit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Signature Lines for Delivery Verification */}
              <div className="grid grid-cols-2 gap-8 pt-10 border-t">
                <div className="text-center">
                  <div className="border-b border-dashed border-foreground/40 pb-8"></div>
                  <div className="text-xs font-semibold mt-2">{t("driverTransportSignature", "Driver / Transport Signature")}</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed border-foreground/40 pb-8"></div>
                  <div className="text-xs font-semibold mt-2">{t("receiverSignatureStamp", "Receiver's Signature & Stamp")}</div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
