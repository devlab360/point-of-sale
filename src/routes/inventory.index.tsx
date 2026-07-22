import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { Download, Filter, Brain } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/inventory/")({
  component: StockList,
});

function StockList() {
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];
  const lowCount = products.filter(p => p.stock <= p.reorderLevel).length;
  const outCount = products.filter(p => p.stock <= 0).length;

  const [showForecast, setShowForecast] = useState(false);

  const forecasts = useMemo(() => {
    if (!showForecast) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = sales.filter(s => new Date(s.date) >= thirtyDaysAgo);
    
    const salesMap: Record<string, number> = {};
    recentSales.forEach(sale => {
      sale.saleItems?.forEach(item => {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
      });
    });

    return products.map(p => {
      const qtySold30d = salesMap[p.id] || 0;
      const dailyVelocity = qtySold30d / 30;
      const daysRemaining = dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : 999;
      return { ...p, dailyVelocity, daysRemaining };
    }).filter(p => p.daysRemaining <= 14).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [sales, products, showForecast]);

  const isExpired = (date?: string) => date ? new Date(date) < new Date() : false;
  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff > 0 && diff <= 30;
  };

  const expiringCount = products.filter(p => isExpiringSoon(p.expiryDate) || isExpired(p.expiryDate)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{products.length} SKUs</span> · {lowCount} low ·{" "}
          <span className="text-destructive">{outCount} out of stock</span>
          {expiringCount > 0 && <span className="text-warning ml-2">· {expiringCount} expiring</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Export not available offline yet.")}>
            <Filter className="size-4" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20" onClick={() => setShowForecast(true)}>
            <Brain className="size-4 mr-1.5" /> AI Forecast
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const csv = ["Product,SKU,Stock,Reorder,Value"];
            products.forEach(p => csv.push(`${p.name},${p.sku},${p.stock},${p.reorderLevel},${p.stock * p.cost}`));
            const blob = new Blob([csv.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            toast.success("Inventory exported");
          }}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">On hand</th>
              <th className="px-4 py-3 text-right">Reorder</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted">
                        <img src={p.image} alt="" className="size-6" />
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className={cn("number px-4 py-3 text-right font-semibold", low && "text-destructive")}>
                    {p.stock} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{p.reorderLevel}</td>
                  <td className="number px-4 py-3 text-right">${(p.stock * p.cost).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {isExpired(p.expiryDate) && <Badge variant="destructive">Expired</Badge>}
                      {isExpiringSoon(p.expiryDate) && <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20">Expiring</Badge>}
                      {out ? (
                        <Badge variant="destructive">Out</Badge>
                      ) : low ? (
                        <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20">Low</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success hover:bg-success/15">In stock</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={showForecast} onOpenChange={setShowForecast}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="size-5 text-primary" /> AI Demand Forecast
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 text-sm">
            <p className="text-muted-foreground">
              Based on sales velocity over the last 30 days, these items are predicted to run out of stock soon.
            </p>
            {forecasts.length === 0 ? (
              <div className="rounded-lg bg-muted p-4 text-center text-muted-foreground">
                No items are at risk of running out in the next 14 days.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {forecasts.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.stock} left · sells {f.dailyVelocity.toFixed(1)}/day
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-bold text-sm", f.daysRemaining <= 3 ? "text-destructive" : "text-warning")}>
                        {f.daysRemaining === 0 ? "Runs out today" : `Runs out in ${f.daysRemaining} days`}
                      </div>
                      <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => { setShowForecast(false); /* Add routing if needed */ }}>
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
