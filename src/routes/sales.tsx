import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
import { Eye, Printer, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { OfflineSale } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales · Grocer.Pro" }] }),
  component: SalesPage,
});

function SalesPage() {
  const sales = useLiveQuery(() => localDb.offlineSales.reverse().toArray()) || [];
  const settings = useLiveQuery(() => localDb.settings.get("default"));

  const [query, setQuery] = useState("");
  const [viewSale, setViewSale] = useState<OfflineSale | null>(null);

  const storeName = settings?.storeName || "GROCER.PRO";
  const storeAddress = settings?.address || "";
  const storePhone = settings?.phone || "";

  const filtered = sales.filter(s =>
    s.id.toLowerCase().includes(query.toLowerCase()) ||
    (s.customerName || "walk-in").toLowerCase().includes(query.toLowerCase())
  );

  const printReceipt = (s: OfflineSale) => {
    setViewSale(s);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Sales History"
        description="Every transaction across all your registers."
        actions={
          <Button size="sm" asChild>
            <Link to="/pos"><Plus className="size-4" /> New Sale</Link>
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by invoice or customer..."
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Sync</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No sales found.</td></tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{s.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-semibold">{s.customerName || "Walk-in"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{s.items}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{s.paymentMethod || "cash"}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn(s.synced ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground")}>
                      {s.synced ? "Synced" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn(
                      s.status === "completed" && "bg-success/10 text-success hover:bg-success/15",
                      s.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                      s.status === "refunded" && "bg-muted text-muted-foreground hover:bg-muted",
                    )}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="number px-4 py-3 text-right font-semibold">${s.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="View details" onClick={() => setViewSale(s)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Reprint receipt" onClick={() => printReceipt(s)}>
                        <Printer className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Detail Dialog */}
      <Dialog open={!!viewSale} onOpenChange={open => !open && setViewSale(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice #{viewSale?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {viewSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <strong>{viewSale.customerName || "Walk-in"}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewSale.date).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Payment:</span> <strong className="capitalize">{viewSale.paymentMethod}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className="bg-success/10 text-success">{viewSale.status}</Badge></div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewSale.saleItems?.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">${item.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                {viewSale.subtotal !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${viewSale.subtotal.toFixed(2)}</span></div>}
                {viewSale.discountAmt !== undefined && viewSale.discountAmt > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-${viewSale.discountAmt.toFixed(2)}</span></div>}
                {viewSale.taxAmt !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${viewSale.taxAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Total</span><span>${viewSale.total.toFixed(2)}</span></div>
              </div>
              <Button className="w-full" onClick={() => { setViewSale(null); printReceipt(viewSale); }}>
                <Printer className="size-4 mr-2" /> Reprint Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print receipt */}
      {viewSale && (
        <div className="hidden print:block fixed inset-0 z-[200] bg-white text-black text-[12px] font-mono leading-tight p-4">
          <div className="max-w-[300px] mx-auto">
            <div className="text-center mb-3">
              <h1 className="text-xl font-bold">{storeName}</h1>
              <p>{storeAddress}</p>
              <p>Tel: {storePhone}</p>
            </div>
            <div className="border-t border-black pt-2 mb-2 text-[11px]">
              <div className="flex justify-between"><span>Receipt #:</span><span>{viewSale.id.slice(0, 8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{new Date(viewSale.date).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span>{viewSale.customerName || "Walk-in"}</span></div>
            </div>
            <div className="border-t border-b border-black py-2 mb-2">
              {viewSale.saleItems?.map((item, i) => (
                <div key={i} className="flex justify-between"><span className="truncate max-w-[160px]">{item.productName} x{item.quantity}</span><span>${item.total.toFixed(2)}</span></div>
              ))}
            </div>
            <div className="flex justify-between font-bold"><span>TOTAL:</span><span>${viewSale.total.toFixed(2)}</span></div>
            <p className="mt-3 text-center text-[10px]">Thank you for your business!</p>
          </div>
        </div>
      )}
    </div>
  );
}
