import { createLazyFileRoute } from "@tanstack/react-router";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventoryTransfersFn, createInventoryTransferFn } from "@/api/inventory";
import { getProductsFn } from "@/api/products";
import { getSuppliersFn } from "@/api/suppliers";
import { useAppFormatter } from "@/hooks/useAppFormatter";
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
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const { data: transfersData } = useQuery({
    queryKey: ["inventoryTransfers", orgId],
    queryFn: async () => ((await getInventoryTransfersFn({ data: {} })) as any)?.data || [],
  });
  const transfers = transfersData || [];
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: async () => ((await getSuppliersFn({ data: {} })) as any)?.data || [],
  });
  const suppliers = suppliersData || [];

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    product: "", 
    supplierId: "", 
    items: 1,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: "cash"
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const itemsPerPage = 10;

  const filteredTransfers = useMemo(() => {
    let list = transfers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (t) => t.ref.toLowerCase().includes(lower) || t.destination.toLowerCase().includes(lower),
      );
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
    if (!formData.product || !formData.supplierId || !formData.items)
      return toast.error("Please fill all required fields (Product, Supplier, Items)");

    const prod = products.find((p) => p.id === formData.product);
    const supp = suppliers.find((s) => s.id === formData.supplierId);
    if (!prod || !supp) return;
    if (!prod) return;

    if (prod.stock < formData.items) return toast.error("Not enough stock for transfer");

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const ref = `TRF-${Math.floor(Math.random() * 10000)}`;
      const transferId = uuidv4();
      const res = await createInventoryTransferFn({
        data: {
          transfer: {
            id: transferId,
            ref,
            date: new Date().toISOString(),
            supplierId: supp.id,
            destination: `${prod.name} ➡️ ${supp.name}`,
            items: Number(formData.items),
            totalAmount: Number(formData.totalAmount),
            paidAmount: Number(formData.paidAmount),
            paymentStatus: Number(formData.paidAmount) >= Number(formData.totalAmount) && Number(formData.totalAmount) > 0 ? "paid" : Number(formData.paidAmount) > 0 ? "partial" : "unpaid",
            paymentMethod: formData.paymentMethod,
            status: "completed",
          },
          lines: [
            {
              productId: prod.id,
              productName: prod.name,
              qty: Number(formData.items),
            },
          ],
        },
      });
      if (!res?.success) throw new Error(res?.error);
      queryClient.invalidateQueries({ queryKey: ["inventoryTransfers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Transfer recorded successfully");
      setOpen(false);
      setFormData({ product: "", supplierId: "", items: 1, totalAmount: 0, paidAmount: 0, paymentMethod: "cash" });
    } catch (e: any) {
      toast.error(e.message || "Error saving transfer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
            Stock Transfers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Move inventory between store locations or warehouses.
          </p>
        </div>
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
                <SearchableSelect
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.stock} in stock)`,
                  }))}
                  value={formData.product}
                  onChange={(v) => setFormData({ ...formData, product: v })}
                  placeholder="Select product"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination (Supplier)</Label>
                <SearchableSelect
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: `${s.name} - ${s.contact} (${s.phone})`,
                  }))}
                  value={formData.supplierId}
                  onChange={(v) => setFormData({ ...formData, supplierId: v })}
                  placeholder="Select supplier"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity to transfer</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.items || ""}
                  onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Value</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.totalAmount || ""}
                  onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Paid Amount</Label>
                <Input
                  type="number"
                  min="0"
                  max={formData.totalAmount}
                  value={formData.paidAmount || ""}
                  onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
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
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatAppDate(r.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Main Store</span>
                            <ArrowRightLeft className="size-3 text-muted-foreground" />
                            <span className="font-medium">{r.destination}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {r.items}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className="bg-success/10 text-success hover:bg-success/15">
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                totalItems={filteredTransfers.length}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
