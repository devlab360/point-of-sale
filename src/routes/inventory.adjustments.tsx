import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/inventory/adjustments")({
  component: AdjustmentsPage,
});

function AdjustmentsPage() {
  const adjustments = useLiveQuery(() => localDb.adjustments.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ product: "", reason: "", net: 0 });
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(adjustments.length / itemsPerPage);
  const paginatedAdjustments = adjustments.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSave = async () => {
    if (!formData.product || !formData.reason || formData.net === undefined || formData.net === null || formData.net === "") return toast.error("Please fill all fields");
    if (formData.net === 0) return toast.error("Adjustment quantity cannot be zero");
    
    const prod = products.find(p => p.id === formData.product);
    if (!prod) return;

    try {
      await localDb.transaction("rw", localDb.adjustments, localDb.inventoryMovements, localDb.products, async () => {
        const adj = {
          id: uuidv4(),
          ref: `ADJ-${Math.floor(Math.random() * 10000)}`,
          date: new Date().toISOString(),
          reason: formData.reason,
          items: Math.abs(formData.net),
          net: Number(formData.net),
          status: "approved"
        };
        await localDb.adjustments.add(adj);
        await localDb.inventoryMovements.add({
          productName: prod.name,
          action: "adjustment",
          quantity: Number(formData.net),
          createdAt: new Date().toISOString()
        });
        await localDb.products.update(prod.id, { stock: prod.stock + Number(formData.net) });
      });
      toast.success("Adjustment added successfully");
      setOpen(false);
      setFormData({ product: "", reason: "", net: 0 });
    } catch (e) {
      toast.error("Error saving adjustment");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manual stock changes from audits, damage, or shrinkage.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">New Adjustment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Stock Adjustment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={formData.product} onValueChange={v => setFormData({ ...formData, product: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} in stock)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="e.g. Damage in transit" />
              </div>
              <div className="space-y-2">
                <Label>Net Change (Use - for removing stock)</Label>
                <Input type="number" value={formData.net} onChange={e => setFormData({ ...formData, net: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Apply Adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {adjustments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No adjustments recorded"
          description="Stock adjustments from audits, damages, or shrinkage will appear here."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Net change</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedAdjustments.map((r) => (
                  <tr key={r.ref} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.items}</td>
                    <td className={cn("number px-4 py-3 text-right font-semibold", r.net < 0 ? "text-destructive" : "text-success")}>
                      {r.net > 0 ? "+" : ""}{r.net}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-success/10 text-success hover:bg-success/15">{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
