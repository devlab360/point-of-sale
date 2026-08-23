import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Plus,
  Trash2,
  Camera,
  Loader2,
  Truck,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuppliersFn } from "@/api/suppliers";
import { getProductsFn } from "@/api/products";
import { createPurchaseFn } from "@/api/purchases";
import { parseInvoiceFn } from "@/api/ai";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PersistStore } from "@/lib/session-store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/purchases/new")({
  head: () => ({ meta: [{ title: "New Purchase Order · NexisPOS" }] }),
  component: NewPurchase,
});

function NewPurchase() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
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

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<{ productId: string; qty: number; cost: number }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number | "">("");

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0);
  const tax = 0; // Tax is configured per-product in settings, not applied globally here
  const total = subtotal + tax;

  const handleAddLine = () => {
    setLines([...lines, { productId: "", qty: 1, cost: 0 }]);
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
      return toast.error("Please select a supplier");
    }
    if (lines.length === 0) {
      return toast.error("Please add at least one line item");
    }
    if (lines.some((l) => !l.productId)) {
      return toast.error("Please select a valid product for all items");
    }
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      return toast.error("Supplier not found");
    }

    setIsSubmitting(true);
    try {
      const formattedItems = lines.map((l) => {
        const prod = products.find((p) => p.id === l.productId);
        return {
          productId: l.productId,
          productName: prod?.name || "Product",
          quantity: Number(l.qty) || 1,
          cost: Number(l.cost) || 0,
        };
      });

      const res = await createPurchaseFn({
        data: {
          purchase: {
            supplierId: sup.id,
            supplier: sup.name,
            date: new Date().toISOString(),
            status: "received",
            subtotal: subtotal,
            taxAmt: tax,
            total: total,
            paid: amountPaid === "" ? total : Number(amountPaid),
            due: amountPaid === "" ? 0 : total - Number(amountPaid),
          },
          items: formattedItems,
        },
      });

      if (!res?.success) throw new Error(res?.error || "Failed to submit purchase order");

      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });

      toast.success("Purchase order recorded and stock updated successfully!");
      navigate({ to: "/purchases" });
    } catch (e: any) {
      toast.error(e.message || "Failed to record purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    toast.loading("Analyzing invoice with AI OCR...", { id: "ocr" });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Str = (event.target?.result as string).split(',')[1];
        const res = await parseInvoiceFn({
          data: {
            fileBase64: base64Str,
            mimeType: file.type,
          }
        });

        if (!res.success) throw new Error(res.error || "Failed to parse invoice");

        const data = res.data;
        
        // 1. Fuzzy match supplier
        if (data.supplierName) {
          const supplierStr = data.supplierName.toLowerCase();
          const matchedSupplier = suppliers.find(s => 
            s.name.toLowerCase().includes(supplierStr) || 
            supplierStr.includes(s.name.toLowerCase())
          );
          if (matchedSupplier) {
            setSupplierId(matchedSupplier.id);
          } else {
            toast.warning(`Supplier "${data.supplierName}" not found in system.`);
          }
        }

        // 2. Fuzzy match products and populate lines
        if (data.items && data.items.length > 0) {
          const newLines: { productId: string; qty: number; cost: number }[] = [];
          for (const item of data.items) {
             const prodStr = item.productName.toLowerCase();
             const matchedProduct = products.find(p => 
               p.name.toLowerCase().includes(prodStr) || 
               prodStr.includes(p.name.toLowerCase())
             );
             if (matchedProduct) {
               newLines.push({
                 productId: matchedProduct.id,
                 qty: item.quantity || 1,
                 cost: item.cost || matchedProduct.cost || 0
               });
             } else {
               toast.warning(`Product "${item.productName}" not found in inventory.`);
             }
          }
          if (newLines.length > 0) {
            setLines(newLines);
          }
        }
        
        toast.success("Invoice data extracted successfully!", { id: "ocr" });
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
    <div className="page-container space-y-5 container mx-auto">
      {/* Back button & Breadcrumb header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/purchases" })}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1" /> Back to Purchases
        </Button>
      </div>

      <PageHeader
        title="New Purchase Order"
        description="Receive stock from suppliers, update inventory, and manage purchase bills."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              size="sm"
              variant="outline"
              className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20 font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing || isSubmitting}
            >
              {isAnalyzing ? (
                <Loader2 className="size-4 mr-2 animate-spin text-primary" />
              ) : (
                <Camera className="size-4 mr-2" />
              )}
              Auto-Fill with AI
            </Button>
            {/* <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isAnalyzing || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Order
                </>
              )}
            </Button> */}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Main Content Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Supplier details card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Truck className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Supplier & Invoice Details</h3>
                <p className="text-xs text-muted-foreground">Select the vendor delivering stock</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Supplier <span className="text-destructive">*</span>
                </label>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={isSubmitting}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length > 0 ? (
                      suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="font-medium">{s.name}</span>
                            {s.company && (
                              <span className="text-xs text-muted-foreground">({s.company})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-center text-muted-foreground">
                        No suppliers found. Create one first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/20 text-sm font-medium">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Received
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Line Items</h3>
                  <p className="text-xs text-muted-foreground">
                    Specify incoming product quantities and unit purchase costs
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {lines.length} {lines.length === 1 ? "Item" : "Items"}
              </Badge>
            </div>

            {/* Responsive Table / Card Container */}
            <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
              <table className="w-full text-left text-sm min-w-[550px]">
                <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 w-28 text-right">Qty</th>
                    <th className="px-4 py-3 w-32 text-right">Unit Cost</th>
                    <th className="px-4 py-3 w-36 text-right">Total Cost</th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={l.productId}
                          onValueChange={(v) => handleUpdateLine(i, "productId", v)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Choose product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min="1"
                          required
                          placeholder="1"
                          className="h-9 text-right font-medium"
                          value={l.qty}
                          onChange={(e) => handleUpdateLine(i, "qty", Number(e.target.value))}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="h-9 text-right font-medium"
                          value={l.cost}
                          onChange={(e) => handleUpdateLine(i, "cost", Number(e.target.value))}
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatCurrency((Number(l.qty) || 0) * (Number(l.cost) || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <ShoppingBag className="size-8 text-muted-foreground/40" />
                          <p className="text-sm font-medium">
                            No items added to purchase order yet.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1"
                            onClick={handleAddLine}
                          >
                            <Plus className="size-4 mr-1" /> Add First Item
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-dashed border-primary/30 text-primary hover:bg-primary/5 w-full sm:w-auto font-medium"
              onClick={handleAddLine}
              disabled={isSubmitting}
            >
              <Plus className="size-4 mr-1" /> Add Line Item
            </Button>
          </div>
        </div>

        {/* Sidebar Summary Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-base text-foreground">Order Summary</h3>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                GST (8%)
              </Badge>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)} units)</span>
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (GST 8%)</span>
                <span className="font-semibold text-foreground">{formatCurrency(tax)}</span>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-base text-foreground">Grand Total</span>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 p-3.5 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Submitting this order will automatically increment product stock levels and log
                inventory movements.
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isAnalyzing || isSubmitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving Purchase...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Submit Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
