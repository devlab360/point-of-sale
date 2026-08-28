import { createLazyFileRoute } from "@tanstack/react-router";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventoryTransfersFn, createInventoryTransferFn } from "@/api/inventory";
import { getProductsFn } from "@/api/products";
import { getSuppliersFn } from "@/api/suppliers";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { PersistStore } from "@/lib/session-store";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Search,
  Loader2,
  Plus,
  Truck,
  Package,
  Calendar,
  Building2,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";
import { useCurrency } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export const Route = createLazyFileRoute("/inventory/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();
  const { formatCurrency } = useCurrency();

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const { data: transfersData, isLoading: isTransfersLoading } = useQuery({
    queryKey: ["inventoryTransfers", orgId],
    queryFn: async () => ((await getInventoryTransfersFn({ data: {} })) as any)?.data || [],
  });
  const transfers = Array.isArray(transfersData) ? transfersData : [];

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers", orgId],
    queryFn: async () => ((await getSuppliersFn({ data: {} })) as any)?.data || [],
  });
  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [totalAmount, setTotalAmount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p: any) => p.id === productId),
    [products, productId]
  );

  // KPI Calculations
  const totalTransferCount = transfers.length;
  const totalUnitsTransferred = useMemo(
    () => transfers.reduce((acc, t: any) => acc + (Number(t.quantity) || 0), 0),
    [transfers]
  );
  const totalTransferAssetValue = useMemo(
    () => transfers.reduce((acc, t: any) => acc + (Number(t.totalAmount) || 0), 0),
    [transfers]
  );

  const filtered = useMemo(() => {
    let list = transfers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (t: any) =>
          t.productName?.toLowerCase().includes(lower) ||
          t.supplierName?.toLowerCase().includes(lower) ||
          t.id?.toLowerCase().includes(lower)
      );
    }
    return [...list].reverse();
  }, [transfers, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedTransfers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Please select a product");
      return;
    }
    if (!supplierId) {
      toast.error("Please select a destination vendor/branch");
      return;
    }
    const q = parseInt(transferQty, 10);
    if (!q || q <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const prod = products.find((p: any) => p.id === productId);
    const supp = suppliers.find((s: any) => s.id === supplierId);

    if (prod && Number(prod.stock) < q) {
      toast.error(`Insufficient stock! Only ${prod.stock} units available.`);
      return;
    }

    setIsSaving(true);
    try {
      const res = (await createInventoryTransferFn({
        data: {
          transfer: {
            id: uuidv4(),
            productId,
            productName: prod?.name || "Product",
            supplierId,
            supplierName: supp?.name || "Branch / Vendor",
            quantity: q,
            totalAmount,
            paidAmount,
            paymentMethod,
            date: new Date().toISOString(),
          },
        },
      })) as any;

      if (res?.success) {
        toast.success("Stock transfer registered");
        setOpen(false);
        setProductId("");
        setSupplierId("");
        setTransferQty("1");
        setTotalAmount("0");
        setPaidAmount("0");
        queryClient.invalidateQueries({ queryKey: ["inventoryTransfers"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["posItems"] });
        queryClient.invalidateQueries({ queryKey: ["posBootstrap"] });
        queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
      } else {
        throw new Error(res?.error || "Transfer failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute transfer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Stock Transfers & Branch Dispatches"
        description="Dispatch inventory between store locations, satellite warehouse nodes, and return items to suppliers."
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> New Transfer
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Transfers"
          value={String(totalTransferCount)}
          hint="Dispatch records"
          icon={Truck}
          accent="primary"
        />
        <StatCard
          label="Units Transferred"
          value={`${totalUnitsTransferred} units`}
          hint="Inventory moved"
          icon={Package}
          accent="info"
        />
        <StatCard
          label="Transfer Asset Value"
          value={formatCurrency(totalTransferAssetValue)}
          hint="Total manifest valuation"
          icon={DollarSign}
          accent="success"
        />
        <StatCard
          label="Partner / Branch Nodes"
          value={`${suppliers.length} Destinations`}
          hint="Active dispatch routes"
          icon={Building2}
          accent="warning"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search transfers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`grid size-8 place-items-center rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`grid size-8 place-items-center rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Content View */}
        {isTransfersLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={5} rows={6} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No transfers found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't recorded any inventory transfers yet."
            }
            actionLabel="New Transfer"
            onAction={() => setOpen(true)}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedTransfers.map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="font-mono text-xs font-bold">
                        {t.quantity} units
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatAppDate(t.date)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {t.productName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <span>Central Store</span>
                        <ArrowRight className="size-3 text-primary" />
                        <span className="font-semibold text-foreground truncate">{t.supplierName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase">Asset Value</span>
                      <span className="font-bold text-foreground">{formatCurrency(Number(t.totalAmount) || 0)}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {t.paymentMethod || "Cash"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Destination Route</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                    <TableHead className="text-right">Dispatch Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((t: any) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-foreground">{t.productName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Main Store</span>
                          <ArrowRight className="size-3 text-primary" />
                          <span className="font-semibold text-foreground">{t.supplierName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-bold">
                          {t.quantity} units
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatCurrency(Number(t.totalAmount) || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatAppDate(t.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Dispatch Stock Transfer
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Transfer on-hand inventory units to branch nodes or return to suppliers.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Product *</Label>
                  <SearchableSelect
                    options={products.map((p: any) => ({
                      value: p.id,
                      label: `${p.name} (Stock: ${p.stock ?? 0})`,
                    }))}
                    value={productId}
                    onChange={(val) => {
                      setProductId(val);
                      const prod = products.find((p: any) => p.id === val);
                      if (prod) {
                        setTotalAmount(String((Number(prod.cost) || 0) * parseInt(transferQty || "1", 10)));
                      }
                    }}
                    placeholder="Search product SKU..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Destination Partner / Branch *</Label>
                  <SearchableSelect
                    options={suppliers.map((s: any) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    value={supplierId}
                    onChange={setSupplierId}
                    placeholder="Select branch or supplier..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-qty" className="text-xs font-semibold">Transfer Units *</Label>
                  <Input
                    id="t-qty"
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock : undefined}
                    value={transferQty}
                    onChange={(e) => {
                      const q = e.target.value;
                      setTransferQty(q);
                      if (selectedProduct) {
                        setTotalAmount(String((Number(selectedProduct.cost) || 0) * parseInt(q || "1", 10)));
                      }
                    }}
                    className="font-bold text-base"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="t-total" className="text-xs font-semibold">Transfer Valuation ($)</Label>
                    <Input
                      id="t-total"
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="t-paid" className="text-xs font-semibold">Settled Amount ($)</Label>
                    <Input
                      id="t-paid"
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Settlement Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Direct Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="credit">Store Credit / Khata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Confirm Dispatch
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
