import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Eye, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { LocalPurchase } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases · Grocer.Pro" }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const purchases = useLiveQuery(() => localDb.purchases.toArray()) || [];
  const [query, setQuery] = useState("");
  const [viewPurchase, setViewPurchase] = useState<LocalPurchase | null>(null);

  const filtered = purchases.filter(p =>
    p.supplier.toLowerCase().includes(query.toLowerCase()) ||
    p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Purchases"
        description="Inbound stock from your suppliers and wholesalers."
        actions={
          <Button size="sm" asChild>
            <Link to="/purchases/new"><Plus className="size-4" /> New Purchase</Link>
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by supplier or PO..." className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No purchases found. <Link to="/purchases/new" className="text-primary hover:underline">Create one</Link>.</td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{p.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-semibold">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">{p.items}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn(
                      p.status === "received" && "bg-success/10 text-success hover:bg-success/15",
                      p.status === "partial" && "bg-info/10 text-info hover:bg-info/15",
                      p.status === "pending" && "bg-warning/15 text-warning-foreground hover:bg-warning/20",
                    )}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="number px-4 py-3 text-right font-semibold">${p.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" title="View details" onClick={() => setViewPurchase(p)}>
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Purchase Detail Dialog */}
      <Dialog open={!!viewPurchase} onOpenChange={open => !open && setViewPurchase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase #{viewPurchase?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {viewPurchase && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Supplier:</span> <strong>{viewPurchase.supplier}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewPurchase.date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Items:</span> {viewPurchase.items}</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge className={cn(viewPurchase.status === "received" && "bg-success/10 text-success")}>{viewPurchase.status}</Badge>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>${viewPurchase.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
