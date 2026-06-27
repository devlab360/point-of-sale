import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { Download, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory/")({
  component: StockList,
});

function StockList() {
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const lowCount = products.filter(p => p.stock <= p.reorderLevel).length;
  const outCount = products.filter(p => p.stock <= 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{products.length} SKUs</span> · {lowCount} low ·{" "}
          <span className="text-destructive">{outCount} out of stock</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Export not available offline yet.")}>
            <Filter className="size-4" /> Filters
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
                    {out ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : low ? (
                      <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20">Low</Badge>
                    ) : (
                      <Badge className="bg-success/10 text-success hover:bg-success/15">In stock</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
