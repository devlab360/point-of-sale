import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Truck,
  Printer,
  CheckCircle2,
  MoreVertical,
  Trash2,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/delivery-challans")({
  head: () => ({ meta: [{ title: "Delivery Challans · OneDesk360" }] }),
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
      toast.error("Please add at least one line item");
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return toast.error("Please select a customer");

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
      toast.error("Failed to create delivery challan");
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
      toast.error("Failed to convert challan to invoice");
    }
  };

  const deleteChallan = async (id: string) => {
    try {
      const res = await deleteDeliveryChallanFn({ data: { id } });
      if (res?.success) {
        toast.success("Delivery Challan deleted");
        queryClient.invalidateQueries({ queryKey: ["deliveryChallans"] });
      } else throw new Error((res as any)?.error);
    } catch {
      toast.error("Failed to delete delivery challan");
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
    toast.success("Delivery Challans exported successfully");
  };

  return (
    <>
      <DataPage
        title="Delivery Challans"
        description="Issue goods dispatch slips, track vehicle deliveries, and convert challans to invoices."
        primaryAction={{ label: "Create Delivery Challan", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search challans..."
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
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "dispatched", label: "Dispatched" },
                    { value: "invoiced", label: "Invoiced" },
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
      topContent={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Challans</div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-foreground">{rawChallans.length}</div>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Invoiced</div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-success">
                  {rawChallans.filter((c) => c.status === "invoiced").length}
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dispatched</div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-primary">
                  {rawChallans.filter((c) => c.status === "dispatched" || c.status === "delivered").length}
                </div>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Conversion</div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-amber-500">
                  {rawChallans.filter((c) => c.status !== "invoiced").length}
                </div>
              </div>
            </div>
          }
        >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            {/* Desktop Table View */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan #</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Dispatch Date</TableHead>
                    <TableHead>Transport / Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <EmptyState
                          icon={Truck}
                          title="No delivery challans found"
                          description={
                            search
                              ? "Try adjusting your search query."
                              : "Create your first delivery challan to dispatch goods."
                          }
                          actionLabel="Create Challan"
                          onAction={() => setIsAddOpen(true)}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((c) => (
                      <TableRow key={c.id}>
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
                            : "Self / Local Dispatch"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {c.status === "invoiced" ? (
                            <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                              Invoiced
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/15 text-warning-foreground border-warning/25 text-[10px] font-bold">
                              Dispatched / Out
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
                                <Truck className="mr-2 size-3.5 text-primary" /> View / Print Slip
                              </DropdownMenuItem>
                              {c.status !== "invoiced" && (
                                <DropdownMenuItem
                                  onClick={() => convertChallanToInvoice(c)}
                                  className="text-xs font-bold text-success"
                                >
                                  <ArrowRightLeft className="mr-2 size-3.5" /> Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => deleteChallan(c.id)}
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
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Truck}
                  title="No delivery challans found"
                  description={
                    search
                      ? "Try adjusting your search query."
                      : "Create your first delivery challan to dispatch goods."
                  }
                  actionLabel="Create Challan"
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
                          : "Local Dispatch"}
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
                        {c.status === "invoiced" ? "Invoiced" : "Out"}
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
                          <ArrowRightLeft className="size-3" /> Invoice
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
        </div>
      </DataPage>

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
            <SheetTitle className="text-xl font-bold text-foreground">Dispatch Delivery Challan</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Issue goods dispatch notes with driver, carrier, and vehicle verification.</p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateChallan}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <Label>
                  Customer / Consignee <span className="text-destructive">*</span>
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
                    placeholder="Select a customer..."
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
                  <Label>Transport / Carrier</Label>
                  <Input
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    placeholder="e.g. FedEx / Own Vehicle"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle No.</Label>
                  <Input
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. MH-12-XX-9999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Driver Name & Contact</Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. John Doe (555-0101)"
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <Label>Search & Add Products</Label>
                <SearchableSelect
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `Stock: ${p.stock} ${p.unit} | Price: ${formatCurrency(p.price)}`,
                  }))}
                  value=""
                  onChange={(val) => {
                    if (val) {
                      addItemToChallan(val);
                      clearChError("lineItems");
                    }
                  }}
                  placeholder="Search products by name or code..."
                />
                <FieldError message={chErrors.lineItems} />
              </div>

              {/* Line Items List */}
              {lineItems.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Dispatched Items</span>
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
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[180px]">
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Dispatch Delivery Challan
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
                Delivery Slip for {viewItem?.customerName}
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.print()}
              >
                <Printer className="mr-1 size-3.5" /> Print Challan
              </Button>
              {viewItem?.status !== "invoiced" && (
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => viewItem && convertChallanToInvoice(viewItem)}
                >
                  <CheckCircle2 className="mr-1 size-3.5" /> Convert to Invoice
                </Button>
              )}
            </div>
          </SheetHeader>

          {viewItem && (
            <div className="space-y-6 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 bg-muted/20">
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">Deliver To</h4>
                  <div className="font-semibold text-base mt-1">{viewItem.customerName}</div>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    Transport Details
                  </h4>
                  <div className="text-xs mt-1">
                    Carrier: <strong>{viewItem.transportName || "Direct / Local"}</strong>
                  </div>
                  <div className="text-xs">
                    Vehicle #: <strong>{viewItem.vehicleNo || "N/A"}</strong>
                  </div>
                  <div className="text-xs">
                    Driver: <strong>{viewItem.driverName || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">
                  Dispatched Goods List
                </h4>
                <div className="overflow-x-auto rounded-xl border">
                  <Table className="text-xs min-w-[500px]">
                    <TableHeader className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-2.5 text-left">#</TableHead>
                        <TableHead className="p-2.5 text-left">Description of Goods</TableHead>
                        <TableHead className="p-2.5 text-right">Quantity</TableHead>
                        <TableHead className="p-2.5 text-left">Unit</TableHead>
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
                  <div className="text-xs font-semibold mt-2">Driver / Transport Signature</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed border-foreground/40 pb-8"></div>
                  <div className="text-xs font-semibold mt-2">Receiver's Signature & Stamp</div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
