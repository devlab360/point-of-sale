import { createLazyFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { PersistStore } from "@/lib/session-store";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { ArrowRightLeft, Search, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";

export const Route = createLazyFileRoute("/inventory/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const products = useLiveQuery(() => localDb.products.filter(p => !p._deleted).toArray()) || [];
  const locations = useLiveQuery(() => localDb.locations.filter(l => !l._deleted).toArray()) || [];
  const transfers = useLiveQuery(() => localDb.transfers.filter(t => !t._deleted).toArray()) || [];
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ product: "", destination: "", items: 1 });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const itemsPerPage = 10;

  const filteredTransfers = useMemo(() => {
    let list = transfers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(t => t.ref.toLowerCase().includes(lower) || t.destination.toLowerCase().includes(lower));
    }
    return list;
  }, [transfers, debouncedSearch]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize);
  const paginatedTransfers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.product || !formData.destination || !formData.items) return toast.error("Please fill all fields");
    
    const prod = products.find(p => p.id === formData.product);
    if (!prod) return;

    if (prod.stock < formData.items) return toast.error("Not enough stock for transfer");

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await localDb.transaction("rw", localDb.transfers, localDb.inventoryMovements, localDb.products, async () => {
        const transfer = {
          id: uuidv4(),
          orgId: PersistStore.getOrgId() || "default",
          ref: `TRF-${Math.floor(Math.random() * 10000)}`,
          date: new Date().toISOString(),
          destination: formData.destination,
          items: Number(formData.items),
          status: "completed",
          synced: false
        };
        await localDb.transfers.add(transfer);
        await localDb.inventoryMovements.add({
          productName: prod.name,
          orgId: PersistStore.getOrgId() || "default",
          action: "transfer_out",
          quantity: -Number(formData.items),
          createdAt: new Date().toISOString(),
          synced: false
        });
        await localDb.products.update(prod.id, { stock: prod.stock - Number(formData.items), synced: false });
      });
      toast.success("Transfer recorded successfully");
      setOpen(false);
      setFormData({ product: "", destination: "", items: 1 });
    } catch (e: any) {
      toast.error(e.message || "Error saving transfer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Move inventory between store locations or warehouses.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">New Transfer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Transfer</DialogTitle>
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
                <Label>Destination</Label>
                <Select value={formData.destination} onValueChange={v => setFormData({ ...formData, destination: v })}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {locations.length > 0 ? (
                      locations.map(loc => <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>)
                    ) : (
                      <>
                        <SelectItem value="Warehouse A">Warehouse A (Fallback)</SelectItem>
                        <SelectItem value="Store 02">Store 02 (Fallback)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity to transfer</Label>
                <Input type="number" min="1" value={formData.items} onChange={e => setFormData({ ...formData, items: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {transfers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      )}

      {filteredTransfers.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No transfers found"
          description={search ? "Try adjusting your search." : "No transfers recorded."}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Ref</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">From / To</th>
                  <th className="px-4 py-3 whitespace-nowrap">Items transferred</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTransfers.map((r) => (
                  <tr key={r.ref} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.ref}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Main Store</span>
                        <ArrowRightLeft className="size-3 text-muted-foreground" />
                        <span className="font-medium">{r.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.items}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className="bg-success/10 text-success hover:bg-success/15">{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <PaginationControls 
            currentPage={page} 
            totalPages={totalPages} 
            pageSize={pageSize}
            onPageChange={setPage} 
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
