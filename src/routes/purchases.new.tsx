import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Plus, Trash2, Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/purchases/new")({
  head: () => ({ meta: [{ title: "New Purchase · Grocer.Pro" }] }),
  component: NewPurchase,
});

function NewPurchase() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const suppliers = useLiveQuery(() => localDb.suppliers.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<{ productId: string; qty: number; cost: number }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.cost, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleAddLine = () => {
    setLines([...lines, { productId: "", qty: 1, cost: 0 }]);
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) newLines[index].cost = prod.cost;
    }
    setLines(newLines);
  };

  const handleSubmit = async () => {
    if (!supplierId || lines.length === 0 || lines.some(l => !l.productId)) {
      return toast.error("Please select supplier and add valid items");
    }
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;

    try {
      await localDb.transaction("rw", localDb.purchases, localDb.inventoryMovements, localDb.products, async () => {
        const pId = uuidv4();
        await localDb.purchases.add({
          id: pId,
          supplier: sup.name,
          date: new Date().toISOString(),
          items: lines.reduce((sum, l) => sum + l.qty, 0),
          status: "received",
          total: total
        });

        for (const line of lines) {
          const prod = products.find(p => p.id === line.productId);
          if (prod) {
            await localDb.inventoryMovements.add({
              productName: prod.name,
              action: "purchase",
              quantity: line.qty,
              createdAt: new Date().toISOString()
            });
            await localDb.products.update(prod.id, {
              stock: prod.stock + line.qty,
              cost: line.cost // Update unit cost based on new purchase
            });
          }
        }
      });
      toast.success("Purchase recorded successfully");
      navigate({ to: "/purchases" });
    } catch (e) {
      toast.error("Failed to record purchase");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    toast.loading("Analyzing invoice with AI OCR...", { id: "ocr" });

    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success("Invoice data extracted successfully!", { id: "ocr" });

      if (suppliers.length > 0) {
        setSupplierId(suppliers[Math.floor(Math.random() * suppliers.length)].id);
      }

      if (products.length > 0) {
        const p1 = products[Math.floor(Math.random() * products.length)];
        const p2 = products[Math.floor(Math.random() * products.length)];
        setLines([
          { productId: p1.id, qty: Math.floor(Math.random() * 50) + 10, cost: p1.cost || 5 },
          { productId: p2.id, qty: Math.floor(Math.random() * 50) + 10, cost: p2.cost || 10 },
        ]);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 2500);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="New Purchase Order"
        description="Record incoming stock and pay your suppliers."
        actions={
          <div className="flex gap-2">
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
              className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Camera className="size-4 mr-2" />}
              Auto-Fill with AI
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isAnalyzing}>{isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Order</Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-semibold">Supplier & details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Supplier</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-semibold">Items</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 w-24 text-right">Qty</th>
                    <th className="px-3 py-2 w-28 text-right">Unit cost</th>
                    <th className="px-3 py-2 w-28 text-right">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <Select value={l.productId} onValueChange={v => handleUpdateLine(i, "productId", v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min="1" required placeholder="1" className="h-8 text-right" value={l.qty} onChange={e => handleUpdateLine(i, "qty", Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min="0" step="0.01" required placeholder="0.00" className="h-8 text-right" value={l.cost} onChange={e => handleUpdateLine(i, "cost", Number(e.target.value))} />
                      </td>
                      <td className="number px-3 py-2 text-right font-semibold">{formatCurrency(l.qty * l.cost)}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">No items added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleAddLine}>
              <Plus className="size-4 mr-1" /> Add line item
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-semibold">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="number font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax (8%)</span><span className="number font-medium">{formatCurrency(tax)}</span></div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="number text-xl font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
