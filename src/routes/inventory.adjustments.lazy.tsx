import { createLazyFileRoute } from "@tanstack/react-router";
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
import { useState } from "react";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventoryAdjustmentsFn, createInventoryAdjustmentFn } from "@/api/inventory";
import { getProductsFn } from "@/api/products";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useMemo } from "react";

export const Route = createLazyFileRoute("/inventory/adjustments")({
  component: AdjustmentsPage,
});

function AdjustmentsPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: adjustmentsData } = useQuery({
    queryKey: ["inventoryAdjustments", orgId],
    queryFn: async () => ((await getInventoryAdjustmentsFn({ data: {} })) as any)?.data || [],
  });
  const adjustments = adjustmentsData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ product: "", reason: "", net: 0 });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredAdjustments = useMemo(() => {
    let list = adjustments;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) => a.ref.toLowerCase().includes(lower) || a.reason.toLowerCase().includes(lower),
      );
    }
    return list;
  }, [adjustments, debouncedSearch]);

  const totalPages = Math.ceil(filteredAdjustments.length / pageSize);
  const paginatedAdjustments = filteredAdjustments.slice((page - 1) * pageSize, page * pageSize);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (
      !formData.product ||
      !formData.reason ||
      formData.net === undefined ||
      formData.net === null ||
      isNaN(formData.net)
    )
      return toast.error("Please fill all fields");
    if (formData.net === 0) return toast.error("Adjustment quantity cannot be zero");

    const prod = products.find((p) => p.id === formData.product);
    if (!prod) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const ref = `ADJ-${Math.floor(Math.random() * 10000)}`;
      const adjId = uuidv4();
      const res = await createInventoryAdjustmentFn({
        data: {
          adjustment: {
            id: adjId,
            ref,
            date: new Date().toISOString(),
            reason: formData.reason,
            items: Math.abs(formData.net),
            net: Number(formData.net),
            status: "approved",
          },
          lines: [
            {
              productId: prod.id,
              productName: prod.name,
              qty: Math.abs(Number(formData.net)),
              type: Number(formData.net) >= 0 ? "addition" : "deduction",
            },
          ],
        },
      });
      if (!res?.success) throw new Error(res?.error);
      queryClient.invalidateQueries({ queryKey: ["inventoryAdjustments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Adjustment added successfully");
      setOpen(false);
      setFormData({ product: "", reason: "", net: 0 });
    } catch (e: any) {
      toast.error(e.message || "Error saving adjustment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manual stock changes from audits, damage, or shrinkage.
        </p>
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
                <Select
                  value={formData.product}
                  onValueChange={(v) => setFormData({ ...formData, product: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.stock} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Damage in transit"
                />
              </div>
              <div className="space-y-2">
                <Label>Net Change (Use - for removing stock)</Label>
                <Input
                  type="number"
                  value={formData.net}
                  onChange={(e) => setFormData({ ...formData, net: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {adjustments.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search adjustments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      )}
      {filteredAdjustments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No adjustments recorded"
          description={
            search
              ? "Try adjusting your search."
              : "Stock adjustments from audits, damages, or shrinkage will appear here."
          }
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
                    <th className="px-4 py-3 whitespace-nowrap">Reason</th>
                    <th className="px-4 py-3 whitespace-nowrap">Items</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Net change</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedAdjustments.map((r) => (
                    <tr key={r.ref} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.ref}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.items}
                      </td>
                      <td
                        className={cn(
                          "number px-4 py-3 text-right font-semibold whitespace-nowrap",
                          r.net < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {r.net > 0 ? "+" : ""}
                        {r.net}
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
           totalItems={filteredAdjustments.length}/>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}
