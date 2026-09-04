import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { appName } from "@/lib/env";
import {
  Plus,
  Trash2,
  Camera,
  Loader2,
  Truck,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
  DollarSign,
  Package,
  Receipt,
  ScanLine,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuppliersFn, createSupplierFn } from "@/api/suppliers";
import { getProductsFn } from "@/api/products";
import { createPurchaseFn, updatePurchaseFn, getPurchaseByIdFn } from "@/api/purchases";
import { parseInvoiceFn } from "@/api/ai";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersistStore } from "@/lib/session-store";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { PAYMENT_METHOD_OPTIONS } from "@/constants";

import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/purchases/new")({
  head: () => ({ meta: [{ title: `Purchase Order · ${appName}` }] }),
  validateSearch: (search: Record<string, unknown>): { editId?: string } => ({
    editId: typeof search.editId === "string" ? search.editId : undefined,
  }),
  component: NewPurchasePage,
});

function NewPurchasePage() {
  const { t } = useLanguage();
  const { formatCurrency, currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const search = useSearch({ from: "/purchases/new" });
  const editId = search.editId;
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: async () => ((await getSuppliersFn({ data: {} })) as any)?.data || [],
  });
  const suppliers: any[] = suppliersData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products: any[] = productsData || [];

  // Edit existing purchase
  const { data: existingPurchaseData, isLoading: isExistingLoading } = useQuery({
    queryKey: ["purchase", editId],
    queryFn: async () => {
      if (!editId) return null;
      return (await getPurchaseByIdFn({ data: { id: editId } }))?.data || null;
    },
    enabled: !!editId,
  });

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [lines, setLines] = useState<
    { productId: string; qty: number; cost: number; batchNo?: string; expiryDate?: string }[]
  >([{ productId: "", qty: 1, cost: 0 }]);
  const [amountPaid, setAmountPaid] = useState<number | "">("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate if in edit mode
  useEffect(() => {
    if (existingPurchaseData) {
      setSupplierId(existingPurchaseData.supplierId || "");
      setInvoiceNo(existingPurchaseData.invoiceNo || "");
      if (existingPurchaseData.date) {
        setPurchaseDate(existingPurchaseData.date.split("T")[0]);
      }
      if (existingPurchaseData.paymentMethod) {
        setPaymentMethod(existingPurchaseData.paymentMethod);
      }
      if (existingPurchaseData.paid !== undefined) {
        setAmountPaid(Number(existingPurchaseData.paid));
      }
      if (
        existingPurchaseData.items &&
        Array.isArray(existingPurchaseData.items) &&
        existingPurchaseData.items.length > 0
      ) {
        setLines(
          existingPurchaseData.items.map((i: any) => ({
            productId: i.productId,
            qty: Number(i.quantity || i.qty || 1),
            cost: Number(i.cost || 0),
          })),
        );
      }
    }
  }, [existingPurchaseData]);

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0);
  }, [lines]);

  const tax = 0;
  const total = subtotal + tax;
  const paidVal = amountPaid === "" ? total : Number(amountPaid);
  const dueVal = Math.max(0, total - paidVal);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s: any) => s.id === supplierId);
  }, [suppliers, supplierId]);

  const handleAddLine = () => {
    setLines([...lines, { productId: "", qty: 1, cost: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      setLines([{ productId: "", qty: 1, cost: 0 }]);
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        newLines[index].cost = Number(prod.cost) || 0;
      }
    }
    setLines(newLines);
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      return toast.error(t("selectOrEnterSupplier", "Please select or enter a supplier"));
    }

    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (validLines.length === 0) {
      return toast.error(t("addAtLeastOneValidLineItem", "Please add at least one valid product line item with quantity > 0"));
    }

    setIsSubmitting(true);
    try {
      const supplierName = selectedSupplier?.name || "Supplier";
      const supplierContact = selectedSupplier?.phone || selectedSupplier?.contact || "";

      const purchaseData = {
        supplierId,
        supplierName,
        supplierContact,
        invoiceNo: invoiceNo.trim() || `PO-${Date.now().toString().slice(-6)}`,
        date: new Date(purchaseDate).toISOString(),
        paymentMethod,
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        paid: (amountPaid === "" ? total : Number(amountPaid)).toString(),
        items: validLines.map((l) => {
          const prod = products.find((p) => p.id === l.productId);
          return {
            productId: l.productId,
            name: prod?.name || "Item",
            sku: prod?.sku || "",
            quantity: l.qty,
            cost: l.cost,
            total: l.qty * l.cost,
          };
        }),
      };

      if (editId) {
        const res = await updatePurchaseFn({
          data: {
            id: editId,
            ...purchaseData,
          },
        });
        if (res?.success) {
          toast.success(t("purchaseOrderUpdatedSuccess", "Purchase order updated successfully"));
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          navigate({ to: "/purchases" });
        } else {
          toast.error((res as any)?.error || "Failed to update purchase order");
        }
      } else {
        const res = await createPurchaseFn({ data: purchaseData });
        if (res?.success) {
          toast.success(t("purchaseOrderRecordedStockUpdated", "Purchase order recorded and stock updated!"));
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          navigate({ to: "/purchases" });
        } else {
          toast.error((res as any)?.error || "Failed to record purchase order");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    toast.loading("Scanning invoice with Gemini AI...", { id: "ocr" });

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await parseInvoiceFn({
          data: { fileBase64: base64, mimeType: file.type },
        });

        if (!res?.success || !res.data) {
          throw new Error((res as any)?.error || "Failed to extract invoice data");
        }

        const data = res.data;

        if (data.invoiceNumber && !invoiceNo) {
          setInvoiceNo(data.invoiceNumber);
        }

        if (data.supplierName) {
          const supplierStr = data.supplierName.toLowerCase();
          const matchedSupplier = suppliers.find(
            (s: any) =>
              s.name.toLowerCase().includes(supplierStr) ||
              supplierStr.includes(s.name.toLowerCase()),
          );
          if (matchedSupplier) {
            setSupplierId(matchedSupplier.id);
          } else {
            toast.warning(`Supplier "${data.supplierName}" not found in system.`);
          }
        }

        if (data.items && data.items.length > 0) {
          const newLines: any[] = [];
          for (const item of data.items) {
            const prodStr = item.productName?.toLowerCase() || "";
            const matchedProduct = products.find(
              (p: any) =>
                p.name.toLowerCase().includes(prodStr) || prodStr.includes(p.name.toLowerCase()),
            );
            if (matchedProduct) {
              newLines.push({
                productId: matchedProduct.id,
                qty: item.quantity || 1,
                cost: item.cost || matchedProduct.cost || 0,
              });
            }
          }
          if (newLines.length > 0) {
            setLines(newLines);
          }
        }

        toast.success("Invoice parsed successfully!", { id: "ocr" });
      } catch (err: any) {
        toast.error(err.message || "Failed to extract invoice data", { id: "ocr" });
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file", { id: "ocr" });
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-container pb-24 relative space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/90 backdrop-blur-xl pb-3 pt-2 border-b border-border/80 shadow-sm -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {editId ? t("editPurchaseOrder", "Edit Purchase Order") : t("newInboundPurchaseOrder", "New Inbound Purchase Order")}
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-bold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
            >
              {editId ? `${t("editing", "Editing")} ${existingPurchaseData?.invoiceNo || editId}` : t("stockInflow", "Stock Inflow")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {t("newPurchaseDesc", "Receive inbound products, update warehouse valuation, and record vendor payables.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing || isSubmitting}
            className="font-bold text-xs rounded-xl h-10 border-primary/30 text-primary hover:bg-primary/5"
          >
            {isAnalyzing ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 mr-1.5" />
            )}
            AI Invoice Scanner
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/purchases" })}
            className="flex-1 sm:flex-none h-10 rounded-xl text-xs font-semibold"
          >
            {t("discard", "Discard")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none min-w-[140px] h-10 rounded-xl font-bold text-xs shadow-soft"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            {editId ? "Save Changes" : "Submit Order"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Supplier & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Order Info Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
              <Building2 className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">{t("supplierPurchaseMetadata", "Supplier & Purchase Metadata")}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Supplier / Vendor <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  options={suppliers.map((s: any) => ({
                    value: s.id,
                    label: s.name,
                    sublabel: s.phone || s.email || "No contact",
                  }))}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder={t("selectOrSearchVendor", "Select or search vendor...")}
                  onCreate={async (name) => {
                    const res = await createSupplierFn({ data: { supplier: { name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
                      const newSup = (res as any).data;
                      if (newSup?.id) setSupplierId(newSup.id);
                      return name;
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("poInvoiceRefNumber", "PO / Invoice Reference Number")}</Label>
                <Input
                  placeholder={t("poInvoiceRefPlaceholder", "e.g. INV-9902 or PO-8841")}
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Purchase Order Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  date={purchaseDate}
                  onDateChange={(d) =>
                    setPurchaseDate(
                      d ? d.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("paymentMethod", "Payment Method")}</Label>
                <SearchableSelect
                  options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m.label, label: m.label }))}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder={t("selectPaymentMode", "Select payment mode")}
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="size-4 text-primary" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t("inboundStockItems", "Inbound Stock Items")}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Select products, received quantities, and unit purchase costs.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddLine}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Plus className="size-3.5" /> Add Product Row
              </Button>
            </div>

            <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider pl-4">
                      {t("purchases.productSkuName", "Product SKU / Name")}
                    </TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right w-24">
                      {t("common.qty", "Qty")}
                    </TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right w-32">
                      {t("purchases.unitCost", "Unit Cost")} ({currencySymbol})
                    </TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right w-32">
                      {t("purchases.lineTotal", "Line Total")}
                    </TableHead>
                    <TableHead className="w-10 text-center pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {lines.map((line, idx) => {
                    const currentProd = products.find((p) => p.id === line.productId);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="min-w-[240px] pl-4 py-3">
                          <SearchableSelect
                            options={products.map((p: any) => ({
                              value: p.id,
                              label: p.name,
                              sublabel: `SKU: ${p.sku || "N/A"} · Current Stock: ${p.stock ?? 0}`,
                            }))}
                            value={line.productId}
                            onChange={(val) => handleUpdateLine(idx, "productId", val)}
                            placeholder={t("selectProductSku", "Select product SKU...")}
                          />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) =>
                              handleUpdateLine(idx, "qty", parseInt(e.target.value) || 1)
                            }
                            className="h-9 text-right font-bold text-xs rounded-xl"
                          />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.cost}
                            onChange={(e) =>
                              handleUpdateLine(idx, "cost", parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-right font-bold text-xs rounded-xl"
                          />
                        </TableCell>
                        <TableCell className="text-right font-black text-xs text-foreground whitespace-nowrap py-3">
                          {formatCurrency((Number(line.qty) || 0) * (Number(line.cost) || 0))}
                        </TableCell>
                        <TableCell className="text-center pr-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLine(idx)}
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title={t("removeLineItem", "Remove Line Item")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Summary & Payment Settlement */}
        <div className="space-y-6 sticky top-6">
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Receipt className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">{t("orderSettlementSummary", "Order Settlement Summary")}</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Items ({lines.filter((l) => l.productId).length}):</span>
                <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("estimatedTaxes", "Estimated Taxes:")}</span>
                <span className="font-bold text-foreground">{formatCurrency(tax)}</span>
              </div>

              <div className="pt-3 border-t border-border/60 flex justify-between items-center text-sm font-black text-foreground">
                <span className="uppercase tracking-wider text-xs">{t("grandTotal", "Grand Total:")}</span>
                <span className="text-xl font-black text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Amount Paid ({currencySymbol})</Label>
                <button
                  type="button"
                  onClick={() => setAmountPaid(total)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Pay in Full
                </button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={total}
                placeholder={`Full: ${total.toFixed(2)}`}
                value={amountPaid}
                onChange={(e) =>
                  setAmountPaid(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                }
                className="font-black text-sm h-10 rounded-xl"
              />

              <div className="flex justify-between items-center text-xs p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">
                    Vendor Due Balance (Khata):
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {dueVal > 0 ? "Payable on credit" : "Fully settled"}
                  </span>
                </div>
                <span
                  className={`font-black text-base font-mono ${
                    dueVal > 0 ? "text-amber-600 dark:text-amber-400" : "text-success"
                  }`}
                >
                  {formatCurrency(dueVal)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full font-bold shadow-soft h-11 text-sm rounded-xl mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              {editId ? "Save Changes" : "Post Inbound Purchase"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
