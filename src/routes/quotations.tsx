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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getQuotationsFn,
  createQuotationFn,
  updateQuotationFn,
  deleteQuotationFn,
} from "@/api/quotations";
import { getCustomersFn, createCustomerFn } from "@/api/customers";
import { getProductsFn, updateProductFn } from "@/api/products";
import { createSaleFn } from "@/api/sales";
import { useCurrency } from "@/lib/currency";
import {
  FileText,
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

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "B2B Quotations · OneDesk360" }] }),
  component: QuotationsPage,
});

type QuotationLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

function QuotationsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawQuotationsData } = useQuery({
    queryKey: ["quotations", orgId],
    queryFn: async () => ((await getQuotationsFn({ data: {} })) as any)?.data || [],
  });
  const rawQuotations = rawQuotationsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);
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
  const [notes, setNotes] = useState(
    "Price valid for 14 days. 50% advance required upon PO confirmation.",
  );

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
          q.customerName.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((q) => q.status === filters.status);
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
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
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
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
    );
  };

  const updateLinePrice = (productId: string, price: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, price } : item)),
    );
  };

  const quotationSubtotal = lineItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const quotationTax = quotationSubtotal * 0.08;
  const quotationTotal = quotationSubtotal + quotationTax;

  const {
    errors: quotErrors,
    validate: validateQuot,
    clearError: clearQuotError,
    clearAll: clearQuotAll,
  } = useFormValidation({
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const quotNo = `QT-${Date.now().toString().slice(-6)}`;
      const res = await createQuotationFn({
        data: {
          quotation: {
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
          },
        },
      });
      if (!res?.success) throw new Error(res?.error);

      queryClient.invalidateQueries({ queryKey: ["quotations"] });
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

  const convertToInvoice = async (quot: any) => {
    try {
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      const saleRes = await createSaleFn({
        data: {
          sale: {
            customerId: quot.customerId,
            customerName: quot.customerName,
            date: new Date().toISOString(),
            paymentMethod: "credit",
            status: "completed",
          },
          items: quot.items.map((i: any) => ({
            referenceType: "PRODUCT",
            referenceId: i.productId,
            productId: i.productId,
            productName: i.productName || i.name || "Unknown Product",
            quantity: i.quantity,
            price: parseFloat(i.price) || 0,
          })),
        },
      });
      if (!saleRes.success) throw new Error(saleRes.error);

      // Deduct Stock
      for (const item of quot.items) {
        const prod = products.find((p: any) => p.id === item.productId);
        if (prod) {
          await updateProductFn({
            data: { id: prod.id, updates: { stock: Math.max(0, prod.stock - item.quantity) } },
          });
        }
      }

      // Mark Quotation as Converted
      await updateQuotationFn({ data: { id: quot.id, updates: { status: "converted" } } });

      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`Quotation ${quot.quotationNo} converted to Sales Invoice #${invNum}!`);
      setViewItem(null);
    } catch (err) {
      toast.error("Failed to convert quotation to invoice");
    }
  };
  const deleteQuotation = async (id: string) => {
    const res = await deleteQuotationFn({ data: { id } });
    if (res?.success) {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation deleted");
    } else {
      toast.error("Failed to delete quotation");
    }
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
        {filteredQuotations.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotations found"
            description={
              search
                ? "Try adjusting your search query."
                : "Create your first B2B quotation to get started."
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Quotation #</th>
                      <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                      <th className="px-5 py-3 whitespace-nowrap">Quote Date</th>
                      <th className="px-5 py-3 whitespace-nowrap">Valid Until</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Estimated Total</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginated.map((q) => (
                      <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-primary whitespace-nowrap cursor-pointer hover:underline" onClick={() => setViewItem(q)}>
                          {q.quotationNo}
                        </td>
                        <td className="px-5 py-3 font-bold text-foreground whitespace-nowrap">
                          {q.customerName}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(q.date)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(q.validUntil)}
                        </td>
                        <td className="number px-5 py-3 text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(q.total)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {q.status === "converted" ? (
                            <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                              Converted to Invoice
                            </Badge>
                          ) : q.status === "sent" ? (
                            <Badge className="bg-info/12 text-info border-info/25 text-[10px] font-bold">Sent to Client</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold capitalize">{q.status}</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => setViewItem(q)} className="text-xs font-semibold">
                                <FileText className="mr-2 size-3.5 text-primary" /> View / Print Quote
                              </DropdownMenuItem>
                              {q.status !== "converted" && (
                                <DropdownMenuItem onClick={() => convertToInvoice(q)} className="text-xs font-bold text-success">
                                  <ArrowRightLeft className="mr-2 size-3.5" /> Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => deleteQuotation(q.id)}
                              >
                                <Trash2 className="mr-2 size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {paginated.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => setViewItem(q)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{q.quotationNo}</span>
                        <span className="text-[10px] text-muted-foreground">Expires {formatDate(q.validUntil)}</span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">{q.customerName}</div>
                      <div className="mt-1">
                        {q.status === "converted" ? (
                          <Badge className="bg-success/12 text-success text-[9px] font-bold py-0">
                            Converted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-bold py-0 capitalize">
                            {q.status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">{formatCurrency(q.total)}</div>
                      {q.status !== "converted" ? (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px] font-bold mt-1 shadow-soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            convertToInvoice(q);
                          }}
                        >
                          Invoice →
                        </Button>
                      ) : (
                        <span className="text-[10px] text-success font-bold mt-1 inline-block">Billed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredQuotations.length}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      {/* Create B2B Quotation Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearQuotAll();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl overflow-hidden p-0">
          <DialogHeader className="bg-muted p-4">
            <DialogTitle>Create New Quotation / Estimate</DialogTitle>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleCreateQuotation}
            className="space-y-4 p-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Customer / Client <span className="text-destructive">*</span>
                </Label>
                <div
                  className={
                    quotErrors.selectedCustomerId ? "rounded-md border border-destructive" : ""
                  }
                >
                  <SearchableSelect
                    options={customers.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedCustomerId}
                    onChange={(val) => {
                      setSelectedCustomerId(val);
                      clearQuotError("selectedCustomerId");
                    }}
                    placeholder="Search customer..."
                    onCreate={async (name) => {
                      const res = await createCustomerFn({ data: { customer: { name } } });
                      if (res?.success) {
                        queryClient.invalidateQueries({ queryKey: ["customers"] });
                        return res.data?.id;
                      }
                    }}
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
              <Label>
                Search & Add Products to Estimate <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={products.map((p) => ({
                  value: p.id,
                  label: p.name,
                  sublabel: `Price: ${formatCurrency(p.price)}`,
                }))}
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
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left whitespace-nowrap">Item</th>
                      <th className="p-2 text-center w-20 whitespace-nowrap">Qty</th>
                      <th className="p-2 text-right w-28 whitespace-nowrap">
                        Unit Price ({currencySymbol})
                      </th>
                      <th className="p-2 text-right w-24 whitespace-nowrap">Total</th>
                      <th className="p-2 text-center w-12 whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="p-2 font-medium whitespace-nowrap">{item.productName}</td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <Input
                            type="number"
                            min="1"
                            required
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineQty(item.productId, parseInt(e.target.value) || 1)
                            }
                            className="h-7 w-16 text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.price}
                            onChange={(e) =>
                              updateLinePrice(item.productId, parseFloat(e.target.value) || 0)
                            }
                            className="h-7 w-24 text-right text-xs"
                          />
                        </td>
                        <td className="p-2 text-right font-bold whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
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
              <div className="flex justify-between text-xs">
                <span>Subtotal:</span>
                <span>{formatCurrency(quotationSubtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tax (8%):</span>
                <span>{formatCurrency(quotationTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1">
                <span>Total Estimate:</span>
                <span>{formatCurrency(quotationTotal)}</span>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  clearQuotAll();
                }}
              >
                Cancel
              </Button>
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
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border"
        >
          <SheetHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b pb-4 pr-6 sm:pr-8 text-left">
            <div className="w-full sm:w-auto text-left">
              <SheetTitle className="text-lg sm:text-xl font-bold text-primary text-left">
                {viewItem?.quotationNo}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                Quotation for {viewItem?.customerName}
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.print()}
              >
                <Printer className="mr-1 size-3.5" /> Print PDF
              </Button>
              {viewItem?.status !== "converted" && (
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => viewItem && convertToInvoice(viewItem)}
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
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    Customer Details
                  </h4>
                  <div className="font-semibold text-base mt-1">{viewItem.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {viewItem.customerPhone || "N/A"}
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">
                    Quotation Info
                  </h4>
                  <div className="text-xs mt-1">
                    Date: <strong>{formatDate(viewItem.date)}</strong>
                  </div>
                  <div className="text-xs">
                    Valid Until:{" "}
                    <strong className="text-destructive">{formatDate(viewItem.validUntil)}</strong>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">
                  Quoted Line Items
                </h4>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2.5 text-left whitespace-nowrap">Item Name</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Qty</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Price</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewItem.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium whitespace-nowrap">{i.productName}</td>
                          <td className="p-2.5 text-center font-bold whitespace-nowrap">
                            {i.quantity}
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            {formatCurrency(i.price)}
                          </td>
                          <td className="p-2.5 text-right font-bold whitespace-nowrap">
                            {formatCurrency(i.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl border bg-muted/40 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewItem.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(viewItem.taxAmt)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total Estimate:</span>
                  <span>{formatCurrency(viewItem.total)}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
