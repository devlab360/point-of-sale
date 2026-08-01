import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localDb, type LocalDeliveryChallan } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Truck, Printer, CheckCircle2, MoreVertical, Trash2, ArrowRightLeft, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/delivery-challans")({
  head: () => ({ meta: [{ title: "Delivery Challans · Grocer.Pro" }] }),
  component: DeliveryChallansPage,
});

type ChallanLineItem = { productId: string; productName: string; quantity: number; unit: string; price: number };

function DeliveryChallansPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const rawChallans = useLiveQuery(() => localDb.deliveryChallans.filter(c => !c._deleted).reverse().toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<LocalDeliveryChallan | null>(null);
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
  const [notes, setNotes] = useState("Goods dispatched in good condition. Please inspect upon delivery.");
  const [lineItems, setLineItems] = useState<ChallanLineItem[]>([]);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredChallans = useMemo(() => {
    let filtered = rawChallans;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.challanNo.toLowerCase().includes(lower) ||
          c.customerName.toLowerCase().includes(lower) ||
          c.transportName?.toLowerCase().includes(lower)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
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
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
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
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const { errors: chErrors, validate: validateCh, clearError: clearChError, clearAll: clearChAll } = useFormValidation({
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
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const chNo = `CH-${Date.now().toString().slice(-6)}`;
      await localDb.deliveryChallans.add({
        id: uuidv4(),
        orgId: PersistStore.getOrgId() || "default",
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
        synced: false
      });

      // Deduct stock immediately upon delivery challan dispatch
      for (const item of lineItems) {
        const prod = await localDb.products.get(item.productId);
        if (prod) {
          await localDb.products.update(prod.id, {
            stock: Math.max(0, prod.stock - item.quantity),
          });
          await localDb.inventoryMovements.add({
            productName: prod.name,
            action: `Challan ${chNo}`,
            quantity: -item.quantity,
            createdAt: new Date().toISOString(),
          });
        }
      }

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

  const convertChallanToInvoice = async (ch: LocalDeliveryChallan) => {
    try {
      const saleId = uuidv4();
      const invNum = saleId.substring(0, 8).toUpperCase();

      // Compute Total
      let subtotal = 0;
      const saleItems = [];
      for (const item of ch.items) {
        const prod = await localDb.products.get(item.productId);
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
      await localDb.offlineSales.add({
        id: saleId,
        customerId: ch.customerId,
        customerName: ch.customerName,
        date: new Date().toISOString(),
        items: ch.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal,
        discountAmt: 0,
        taxAmt,
        total: grandTotal,
        paymentMethod: "credit",
        status: "completed",
        synced: false,
        saleItems,
      });

      // 2. Update Challan status
      await localDb.deliveryChallans.update(ch.id, { status: "invoiced", synced: false });

      toast.success(`Delivery Challan ${ch.challanNo} billed as Sales Invoice #${invNum}!`);
      setViewItem(null);
    } catch (err) {
      toast.error("Failed to convert challan to invoice");
    }
  };

  const deleteChallan = async (id: string) => {
    await localDb.deliveryChallans.update(id, { _deleted: true, synced: false });
    await localDb.activityLog.add({
      id: uuidv4(),
      orgId: PersistStore.getOrgId() || "default",
      action: "TOMBSTONE",
      user: "system",
      details: JSON.stringify({ entityType: "deliveryChallans", entityId: id }),
      timestamp: new Date().toISOString(),
      synced: false,
    });
    toast.success("Delivery Challan deleted");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="Delivery Challans (চালান)"
        description="Issue goods dispatch slips, track vehicle deliveries, and convert challans to invoices."
        primaryAction={{ label: "Create Delivery Challan", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search challans..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawChallans.length === 0}
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
                    { value: "delivered", label: "Delivered" },
                    { value: "invoiced", label: "Invoiced" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button className="w-full" onClick={() => { setFilters(draftFilters); close(); }}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {filteredChallans.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No delivery challans found"
            description={search ? "Try adjusting your search query." : "Create your first delivery challan to dispatch goods."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Challan #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Transport / Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{c.challanNo}</td>
                      <td className="px-4 py-3 font-semibold">{c.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.date)}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.transportName ? `${c.transportName} (${c.vehicleNo || "N/A"})` : "Self / Local"}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === "invoiced" ? (
                          <Badge className="bg-success/15 text-success border-success/30">Invoiced</Badge>
                        ) : (
                          <Badge className="bg-warning/15 text-warning-foreground border-warning/30">Delivered</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewItem(c)}>
                              <Truck className="mr-2 size-4 text-primary" /> View / Print Challan Slip
                            </DropdownMenuItem>
                            {c.status !== "invoiced" && (
                              <DropdownMenuItem onClick={() => convertChallanToInvoice(c)}>
                                <ArrowRightLeft className="mr-2 size-4 text-success" /> Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteChallan(c.id)}>
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </DataPage>

      {/* Create Delivery Challan Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); clearChAll(); }
      }}>
        <DialogContent className="sm:max-w-3xl overflow-hidden p-0">
          <DialogHeader className="bg-muted p-4">
            <DialogTitle>Dispatch Delivery Challan</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateChallan} className="space-y-4 p-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Customer / Consignee <span className="text-destructive">*</span></Label>
              <div className={chErrors.selectedCustomerId ? "rounded-md border border-destructive" : ""}>
                <SearchableSelect
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  value={selectedCustomerId}
                  onChange={(val) => { setSelectedCustomerId(val); clearChError("selectedCustomerId"); }}
                  placeholder="Select a customer..."
                />
              </div>
              <FieldError message={chErrors.selectedCustomerId} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Transport / Carrier</Label>
                <Input value={transportName} onChange={(e) => setTransportName(e.target.value)} placeholder="e.g. FedEx / Own Vehicle" />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle No.</Label>
                <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. MH-12-XX-9999" />
              </div>
              <div className="space-y-1.5">
                <Label>Driver Name & Contact</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. John Doe (555-0101)" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Search & Add Products</Label>
              <SearchableSelect
                options={products.map(p => ({ value: p.id, label: p.name, sublabel: `Stock: ${p.stock} ${p.unit} | Price: ${formatCurrency(p.price)}` }))}
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

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Dispatched Item</th>
                      <th className="p-2 text-center w-24">Quantity</th>
                      <th className="p-2 text-left w-20">Unit</th>
                      <th className="p-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="p-2 font-medium">{item.productName}</td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            required
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => updateLineQty(item.productId, parseInt(e.target.value) || 1)}
                            className="h-7 w-16 text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-left text-muted-foreground font-semibold">{item.unit}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.productId, 0)}
                            className="text-destructive hover:underline font-bold"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); clearChAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Dispatch Delivery Challan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View / Print Delivery Challan Sheet */}
      <Sheet open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border">
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 pr-8">
            <div>
              <SheetTitle className="text-xl font-bold text-primary">{viewItem?.challanNo}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Delivery Slip for {viewItem?.customerName}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1 size-3.5" /> Print Challan
              </Button>
              {viewItem?.status !== "invoiced" && (
                <Button size="sm" onClick={() => viewItem && convertChallanToInvoice(viewItem)}>
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
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">Transport Details</h4>
                  <div className="text-xs mt-1">Carrier: <strong>{viewItem.transportName || "Direct / Local"}</strong></div>
                  <div className="text-xs">Vehicle #: <strong>{viewItem.vehicleNo || "N/A"}</strong></div>
                  <div className="text-xs">Driver: <strong>{viewItem.driverName || "N/A"}</strong></div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">Dispatched Goods List</h4>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2.5 text-left">#</th>
                        <th className="p-2.5 text-left">Description of Goods</th>
                        <th className="p-2.5 text-right">Quantity</th>
                        <th className="p-2.5 text-left">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewItem.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-foreground">{i.productName}</td>
                          <td className="p-2.5 text-right font-bold text-base">{i.quantity}</td>
                          <td className="p-2.5 text-left font-medium text-muted-foreground">{i.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    </div>
  );
}
