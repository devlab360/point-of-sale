import { createLazyFileRoute } from "@tanstack/react-router";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAppFormatter } from "@/hooks/useAppFormatter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { formatAppDate } = useAppFormatter();

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
            reason: formData.reason ? `${prod.name} - ${formData.reason}` : prod.name,
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
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
            Stock Adjustments
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manual stock changes from audits, damage, or shrinkage.
          </p>
        </div>
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
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            {/* Desktop Table */}
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref Number</TableHead>
                    <TableHead>Audit Date</TableHead>
                    <TableHead>Adjustment Reason</TableHead>
                    <TableHead>SKU Affected</TableHead>
                    <TableHead className="text-right">Net Quantity Delta</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAdjustments.map((r) => (
                    <TableRow key={r.ref}>
                      <TableCell className="font-mono text-xs font-bold text-foreground whitespace-nowrap">
                        {r.ref}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatAppDate(r.date)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                        {r.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs font-medium">
                        {r.items}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "number text-right font-black whitespace-nowrap text-sm",
                          r.net < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {r.net > 0 ? `+${r.net}` : r.net}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className="bg-success/12 text-success hover:bg-success/20 border-success/20 text-[10px] font-bold">
                          {r.status || "Completed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Feed (< 768px) */}
            <div className="table-mobile-cards p-3 space-y-2.5">
              {paginatedAdjustments.map((r) => (
                <div
                  key={r.ref}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{r.ref}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatAppDate(r.date)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground mt-0.5">{r.reason}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.items}</p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div
                      className={cn(
                        "number text-sm font-black",
                        r.net < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {r.net > 0 ? `+${r.net}` : r.net}
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                      units
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredAdjustments.length > 0 && (
              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredAdjustments.length}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
