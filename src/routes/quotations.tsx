import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { useDebounce } from "@/hooks/useDebounce";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    queryFn: async () => {
      try {
        const res = (await getQuotationsFn({ data: {} })) as any;
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const rawQuotations = Array.isArray(rawQuotationsData) ? rawQuotationsData : [];

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
    let filtered = Array.isArray(rawQuotations) ? rawQuotations : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          (q?.quotationNo || "").toLowerCase().includes(lower) ||
          (q?.customerName || "").toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((q) => q?.status === filters.status);
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
      if (!res?.success) throw new Error((res as any)?.error || "Failed to create");

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

  const handleExport = () => {
    if (filteredQuotations.length === 0) {
      toast.error("No quotations to export");
      return;
    }
    const csvContent = [
      ["Quotation No", "Customer", "Date", "Valid Until", "Total", "Status"],
      ...filteredQuotations.map((q: any) => [
        q?.quotationNo || "",
        q?.customerName || "",
        q?.date || "",
        q?.validUntil || "",
        q?.total || "0",
        q?.status || "",
      ]),
    ]
      .map((row) => row.map((val) => `"${val || ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quotations_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Quotations exported successfully");
  };

  return (
    <>
      <DataPage
        title="B2B Quotations & Estimates"
        description="Create proforma invoices, price quotations, and convert them to B2B invoices."
        primaryAction={{ label: "Create Quotation", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by quotation # or customer..."
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
                    { value: "draft", label: "Draft" },
                    { value: "sent", label: "Sent" },
                    { value: "converted", label: "Converted to Invoice" },
                    { value: "expired", label: "Expired" },
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
        <div className="space-y-4">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Quotes</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-foreground">{rawQuotations.length}</div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Converted</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-success">
                {rawQuotations.filter((q) => q.status === "converted").length}
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending / Sent</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-amber-500">
                {rawQuotations.filter((q) => q.status === "sent" || q.status === "draft").length}
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Value</div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-primary truncate">
                {formatCurrency(rawQuotations.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            {/* Desktop Table View */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Quote Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Estimated Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <EmptyState
                          icon={FileText}
                          title="No quotations found"
                          description={
                            search
                              ? "Try adjusting your search query."
                              : "Create your first B2B quotation to get started."
                          }
                          actionLabel="Create Quotation"
                          onAction={() => setIsAddOpen(true)}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell
                          className="font-mono font-semibold text-primary whitespace-nowrap cursor-pointer hover:underline"
                          onClick={() => setViewItem(q)}
                        >
                          {q.quotationNo}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">
                          {q.customerName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(q.date)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(q.validUntil)}
                        </TableCell>
                        <TableCell className="number text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(q.total)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {q.status === "converted" ? (
                            <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                              Converted to Invoice
                            </Badge>
                          ) : q.status === "sent" ? (
                            <Badge className="bg-info/12 text-info border-info/25 text-[10px] font-bold">
                              Sent to Client
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold capitalize">
                              {q.status}
                            </Badge>
                          )}
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
                                onClick={() => setViewItem(q)}
                                className="text-xs font-semibold"
                              >
                                <FileText className="mr-2 size-3.5 text-primary" /> View / Print
                                Quote
                              </DropdownMenuItem>
                              {q.status !== "converted" && (
                                <DropdownMenuItem
                                  onClick={() => convertToInvoice(q)}
                                  className="text-xs font-bold text-success"
                                >
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
                  icon={FileText}
                  title="No quotations found"
                  description={
                    search
                      ? "Try adjusting your search query."
                      : "Create your first B2B quotation to get started."
                  }
                  actionLabel="Create Quotation"
                  onAction={() => setIsAddOpen(true)}
                  className="border-none bg-transparent my-0 py-6 shadow-none"
                />
              ) : (
                paginated.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    onClick={() => setViewItem(q)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {q.quotationNo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Expires {formatDate(q.validUntil)}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                        {q.customerName}
                      </div>
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
                      <div className="number text-sm font-black text-foreground">
                        {formatCurrency(q.total)}
                      </div>
                      {q.status !== "converted" ? (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px] font-bold mt-1 shadow-soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            convertToInvoice(q);
                          }}
                        >
                          <ArrowRightLeft className="size-3 mr-1" /> Invoice
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredQuotations.length > 0 && (
              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredQuotations.length}
                />
              </div>
            )}
          </div>
        </div>
      </DataPage>

      {/* Create B2B Quotation Drawer */}
      <Sheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearQuotAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold text-foreground">Create New Quotation / Estimate</SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Generate formal estimates and convert them into sales invoices anytime.</p>
          </SheetHeader>
          <form
            noValidate
            onSubmit={handleCreateQuotation}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
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

              <div className="space-y-1.5 border-t pt-4">
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
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <Table className="text-xs min-w-[500px]">
                    <TableHeader className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-3 text-left">Item</TableHead>
                        <TableHead className="p-3 text-center w-24">Qty</TableHead>
                        <TableHead className="p-3 text-right w-32">
                          Unit Price ({currencySymbol})
                        </TableHead>
                        <TableHead className="p-3 text-right w-28">Total</TableHead>
                        <TableHead className="p-3 text-center w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                      {lineItems.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium p-3 whitespace-nowrap">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-center p-3 whitespace-nowrap">
                            <Input
                              type="number"
                              min="1"
                              required
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineQty(item.productId, parseInt(e.target.value) || 1)
                              }
                              className="h-8 w-20 text-center text-xs mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right p-3 whitespace-nowrap">
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
                              className="h-8 w-28 text-right text-xs ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right font-black p-3 whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                          </TableCell>
                          <TableCell className="text-center p-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => updateLineQty(item.productId, 0)}
                              className="text-destructive hover:bg-destructive/10 size-6 rounded-md inline-flex items-center justify-center font-bold"
                            >
                              ×
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-muted/40 border border-border/80 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(quotationSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tax (8%):</span>
                  <span className="font-semibold">{formatCurrency(quotationTax)}</span>
                </div>
                <div className="flex justify-between font-black text-lg border-t border-border pt-2 text-foreground">
                  <span>Total Estimate:</span>
                  <span className="text-primary">{formatCurrency(quotationTotal)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
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
              <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Create Quotation
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* View / Print Quotation Sheet */}
      <Sheet open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl overflow-y-auto p-6 bg-background border-l border-border"
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
                  <Table className="text-xs min-w-[400px]">
                    <TableHeader className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-2.5 text-left">Item Name</TableHead>
                        <TableHead className="p-2.5 text-center">Qty</TableHead>
                        <TableHead className="p-2.5 text-right">Price</TableHead>
                        <TableHead className="p-2.5 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewItem.items.map((i, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="p-2.5 font-medium whitespace-nowrap">
                            {i.productName}
                          </TableCell>
                          <TableCell className="p-2.5 text-center font-bold whitespace-nowrap">
                            {i.quantity}
                          </TableCell>
                          <TableCell className="p-2.5 text-right whitespace-nowrap">
                            {formatCurrency(i.price)}
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold whitespace-nowrap">
                            {formatCurrency(i.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </>
  );
}
