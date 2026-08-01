import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
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
import { localDb, type LocalQuotation } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { FileText, Printer, CheckCircle2, MoreVertical, Trash2, ArrowRightLeft, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "B2B Quotations · Grocer.Pro" }] }),
  component: QuotationsPage,
});

type QuotationLineItem = { productId: string; productName: string; quantity: number; price: number };

function QuotationsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const rawQuotations = useLiveQuery(() => localDb.quotations.filter(q => !q._deleted).reverse().toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<LocalQuotation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [notes, setNotes] = useState("Price valid for 14 days. 50% advance required upon PO confirmation.");

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredQuotations = useMemo(() => {
    let filtered = rawQuotations;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.quotationNo.toLowerCase().includes(lower) ||
          q.customerName.toLowerCase().includes(lower)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(q => q.status === filters.status);
    }
    return [...filtered].reverse();
  }, [rawQuotations, debouncedSearch, filters.status]);

  const totalPages = Math.ceil(filteredQuotations.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredQuotations.slice(start, start + pageSize);
  }, [filteredQuotations, page, pageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const addItemToQuotation = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    const cust = customers.find((c) => c.id === selectedCustomerId);

    let initialPrice = p.price;
    if (cust?.type === "wholesale" && p.wholesalePrice && p.wholesalePrice > 0) {
      initialPrice = p.wholesalePrice;
    } else if (cust?.type === "dealer" && p.dealerPrice && p.dealerPrice > 0) {
      initialPrice = p.dealerPrice;
    }

    setLineItems((prev) => {
      const exists = prev.find((item) => item.productId === productId);
      if (exists) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, price: initialPrice }];
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

  const updateLinePrice = (productId: string, price: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, price } : item))
    );
  };

  const quotationSubtotal = lineItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const quotationTax = quotationSubtotal * 0.08;
  const quotationTotal = quotationSubtotal + quotationTax;

  const { errors: quotErrors, validate: validateQuot, clearError: clearQuotError, clearAll: clearQuotAll } = useFormValidation({
    selectedCustomerId: { required: "Customer is required" },
  });

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateQuot({ selectedCustomerId });
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
      const quotNo = `QT-${Date.now().toString().slice(-6)}`;
      await localDb.quotations.add({
        id: uuidv4(),
        quotationNo: quotNo,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone || undefined,
        date: new Date().toISOString(),
        validUntil,
        items: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: quotationSubtotal,
        discountAmt: 0,
        taxAmt: quotationTax,
        total: quotationTotal,
        status: "sent",
        notes,
        orgId: PersistStore.getOrgId() || "default",
        synced: false
      });

      toast.success(`Quotation ${quotNo} created successfully!`);
      setIsAddOpen(false);
      setLineItems([]);
      clearQuotAll();
    } catch (err) {
      toast.error("Failed to create quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertToInvoice = async (quot: LocalQuotation) => {
    try {
      const saleId = uuidv4();
      const invNum = saleId.substring(0, 8).toUpperCase();

      // 1. Create Sale Invoice
      await localDb.offlineSales.add({
        id: saleId,
        orgId: PersistStore.getOrgId() || "default",
        customerId: quot.customerId,
        customerName: quot.customerName,
        date: new Date().toISOString(),
        items: quot.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: quot.subtotal,
        discountAmt: quot.discountAmt,
        taxAmt: quot.taxAmt,
        total: quot.total,
        paymentMethod: "credit",
        status: "completed",
        synced: false,
        saleItems: quot.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
        })),
      });

      // 2. Deduct Stock
      for (const item of quot.items) {
        const prod = await localDb.products.get(item.productId);
        if (prod) {
          await localDb.products.update(prod.id, {
            stock: Math.max(0, prod.stock - item.quantity),
          });
        }
      }

      // 3. Mark Quotation as Converted
      await localDb.quotations.update(quot.id, { status: "converted", synced: false });

      toast.success(`Quotation ${quot.quotationNo} converted to Sales Invoice #${invNum}!`);
      setViewItem(null);
    } catch (err) {
      toast.error("Failed to convert quotation to invoice");
    }
  };
  const deleteQuotation = async (id: string) => {
    await localDb.quotations.update(id, { _deleted: true, synced: false });
    await localDb.activityLog.add({
      id: uuidv4(),
      orgId: PersistStore.getOrgId() || "default",
      action: "TOMBSTONE",
      user: "system",
      details: JSON.stringify({ entityType: "quotations", entityId: id }),
      timestamp: new Date().toISOString(),
      synced: false,
    });
    toast.success("Quotation deleted");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="B2B Quotations & Estimates"
        description="Create proforma invoices, price quotations, and convert them to B2B invoices."
        primaryAction={{ label: "Create Quotation", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by quotation # or customer..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawQuotations.length === 0}
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
                    { value: "sent", label: "Sent" },
                    { value: "converted", label: "Converted to Invoice" },
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
        {filteredQuotations.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotations found"
            description={search ? "Try adjusting your search query." : "Create your first B2B quotation to get started."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Quotation #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Valid Until</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{q.quotationNo}</td>
                      <td className="px-4 py-3 font-semibold">{q.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(q.date)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(q.validUntil)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-3">
                        {q.status === "converted" ? (
                          <Badge className="bg-success/15 text-success border-success/30">Converted to Invoice</Badge>
                        ) : q.status === "sent" ? (
                          <Badge className="bg-info/15 text-info border-info/30">Sent</Badge>
                        ) : (
                          <Badge variant="outline">{q.status}</Badge>
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
                            <DropdownMenuItem onClick={() => setViewItem(q)}>
                              <FileText className="mr-2 size-4 text-primary" /> View / Print Quotation
                            </DropdownMenuItem>
                            {q.status !== "converted" && (
                              <DropdownMenuItem onClick={() => convertToInvoice(q)}>
                                <ArrowRightLeft className="mr-2 size-4 text-success" /> Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteQuotation(q.id)}>
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

      {/* Create B2B Quotation Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); clearQuotAll(); }
      }}>
        <DialogContent className="sm:max-w-4xl overflow-hidden p-0">
          <DialogHeader className="bg-muted p-4">
            <DialogTitle>Create New Quotation / Estimate</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateQuotation} className="space-y-4 p-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer / Client <span className="text-destructive">*</span></Label>
                <div className={quotErrors.selectedCustomerId ? "rounded-md border border-destructive" : ""}>
                  <SearchableSelect
                    options={customers.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedCustomerId}
                    onChange={(val) => { setSelectedCustomerId(val); clearQuotError("selectedCustomerId"); }}
                    placeholder="Search customer..."
                  />
                </div>
                <FieldError message={quotErrors.selectedCustomerId} />
              </div>
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <div className="mt-1">
                  <DatePicker 
                    date={validUntil ? new Date(validUntil) : undefined} 
                    onDateChange={(d) => setValidUntil(d ? d.toISOString().split("T")[0] : "")} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <Label>Search & Add Products to Estimate <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={products.map((p) => ({ value: p.id, label: p.name, sublabel: `Price: ${formatCurrency(p.price)}` }))}
                value=""
                onChange={(val) => {
                  if (val) {
                    addItemToQuotation(val);
                    clearQuotError("lineItems");
                  }
                }}
                placeholder="Search products by name or code..."
              />
              <FieldError message={quotErrors.lineItems} />
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-center w-20">Qty</th>
                      <th className="p-2 text-right w-28">Unit Price ({currencySymbol})</th>
                      <th className="p-2 text-right w-24">Total</th>
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
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.price}
                            onChange={(e) => updateLinePrice(item.productId, parseFloat(e.target.value) || 0)}
                            className="h-7 w-24 text-right text-xs"
                          />
                        </td>
                        <td className="p-2 text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
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

            {/* Summary */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-xs"><span>Subtotal:</span><span>{formatCurrency(quotationSubtotal)}</span></div>
              <div className="flex justify-between text-xs"><span>Tax (8%):</span><span>{formatCurrency(quotationTax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total Estimate:</span><span>{formatCurrency(quotationTotal)}</span></div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); clearQuotAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Create Quotation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View / Print Quotation Sheet */}
      <Sheet open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border">
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 pr-8">
            <div>
              <SheetTitle className="text-xl font-bold text-primary">{viewItem?.quotationNo}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Quotation for {viewItem?.customerName}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1 size-3.5" /> Print PDF
              </Button>
              {viewItem?.status !== "converted" && (
                <Button size="sm" onClick={() => viewItem && convertToInvoice(viewItem)}>
                  <CheckCircle2 className="mr-1 size-3.5" /> Convert to Invoice
                </Button>
              )}
            </div>
          </SheetHeader>

          {viewItem && (
            <div className="space-y-6 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 bg-muted/20">
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">Customer Details</h4>
                  <div className="font-semibold text-base mt-1">{viewItem.customerName}</div>
                  <div className="text-xs text-muted-foreground">{viewItem.customerPhone || "N/A"}</div>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">Quotation Info</h4>
                  <div className="text-xs mt-1">Date: <strong>{formatDate(viewItem.date)}</strong></div>
                  <div className="text-xs">Valid Until: <strong className="text-destructive">{formatDate(viewItem.validUntil)}</strong></div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">Quoted Line Items</h4>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2.5 text-left">Item Name</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewItem.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium">{i.productName}</td>
                          <td className="p-2.5 text-center font-bold">{i.quantity}</td>
                          <td className="p-2.5 text-right">{formatCurrency(i.price)}</td>
                          <td className="p-2.5 text-right font-bold">{formatCurrency(i.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs"><span>Subtotal:</span><span>{formatCurrency(viewItem.subtotal)}</span></div>
                <div className="flex justify-between text-xs"><span>Tax Amount:</span><span>{formatCurrency(viewItem.taxAmt)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total Estimate:</span><span>{formatCurrency(viewItem.total)}</span></div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
