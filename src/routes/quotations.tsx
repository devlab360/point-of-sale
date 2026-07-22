import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
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
import { FileText, Printer, CheckCircle2, MoreVertical, Trash2, ArrowRightLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "B2B Quotations · Grocer.Pro" }] }),
  component: QuotationsPage,
});

type QuotationLineItem = { productId: string; productName: string; quantity: number; price: number };

function QuotationsPage() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const rawQuotations = useLiveQuery(() => localDb.quotations.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewItem, setViewItem] = useState<LocalQuotation | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [notes, setNotes] = useState("Price valid for 14 days. 50% advance required upon PO confirmation.");

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
    return filtered.reverse();
  }, [rawQuotations, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / itemsPerPage));
  const paginated = filteredQuotations.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return toast.error("Please select a customer");
    if (lineItems.length === 0) return toast.error("Please add at least one line item");

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
      });

      toast.success(`Quotation ${quotNo} created successfully!`);
      setIsAddOpen(false);
      setLineItems([]);
    } catch (err) {
      toast.error("Failed to create quotation");
    }
  };

  const convertToInvoice = async (quot: LocalQuotation) => {
    try {
      const saleId = uuidv4();
      const invNum = saleId.substring(0, 8).toUpperCase();

      // 1. Create Sale Invoice
      await localDb.offlineSales.add({
        id: saleId,
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
      await localDb.quotations.update(quot.id, { status: "converted" });

      toast.success(`Quotation ${quot.quotationNo} converted to Sales Invoice #${invNum}!`);
      setViewItem(null);
    } catch (err) {
      toast.error("Failed to convert quotation to invoice");
    }
  };

  const deleteQuotation = async (id: string) => {
    await localDb.quotations.delete(id);
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(q.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(q.validUntil).toLocaleDateString()}</td>
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
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      {/* Create B2B Quotation Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <span>Create B2B Quotation / Estimate</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateQuotation} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Customer *</Label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type ? c.type.toUpperCase() : "RETAIL"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valid Until *</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
              </div>
            </div>

            {/* Line Items Selection */}
            <div className="space-y-2 border-t pt-3">
              <Label>Add Products to Quotation</Label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addItemToQuotation(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">+ Click to Select & Add Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - Retail: {currencySymbol}{p.price} {p.wholesalePrice ? `| Wholesale: ${currencySymbol}${p.wholesalePrice}` : ""}
                  </option>
                ))}
              </select>
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
                            value={item.quantity}
                            onChange={(e) => updateLineQty(item.productId, parseInt(e.target.value) || 1)}
                            className="h-7 w-16 text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Quotation</Button>
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
                  <div className="text-xs mt-1">Date: <strong>{new Date(viewItem.date).toLocaleDateString()}</strong></div>
                  <div className="text-xs">Valid Until: <strong className="text-destructive">{new Date(viewItem.validUntil).toLocaleDateString()}</strong></div>
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
