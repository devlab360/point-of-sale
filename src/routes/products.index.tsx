import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import {
  List,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  PackageSearch,
  Printer,
  Search,
  Download,
  Upload,
  Package,
  Layers,
  AlertTriangle,
  DollarSign,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import Barcode from "react-barcode";
import { printReceiptIframe } from "@/lib/printIframe";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductsFn,
  createProductFn,
  deleteProductFn,
  getAllProductVariantsFn,
} from "@/api/products";
import { getCategoriesFn } from "@/api/categories";
import { getBrandsFn } from "@/api/brands";
import { getUnitsFn } from "@/api/units";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [{ title: "Products & SKU Catalog · OneDesk360" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { saasPlan } = useAuth();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", orgId, page, pageSize, debouncedSearch, categoryFilter],
    queryFn: async () =>
      ((await getProductsFn({
        data: {
          page,
          pageSize,
          query: debouncedSearch,
          categoryId: categoryFilter === "all" ? "" : categoryFilter,
        },
      })) as any) || {},
  });

  const rawProducts = productsResponse?.data || [];
  const totalCount = productsResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => ((await getBrandsFn({ data: {} })) as any)?.data || [],
  });
  const brands = Array.isArray(brandsData) ? brandsData : [];

  const { data: unitsData } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => ((await getUnitsFn({ data: {} })) as any)?.data || [],
  });
  const units = Array.isArray(unitsData) ? unitsData : [];

  const products = useMemo(() => {
    let list = rawProducts;
    if (brandFilter !== "all") {
      list = list.filter((p: any) => p.brand === brandFilter);
    }
    if (stockFilter === "in_stock") {
      list = list.filter((p: any) => Number(p.stock) > Number(p.reorderLevel || 0));
    } else if (stockFilter === "low_stock") {
      list = list.filter((p: any) => Number(p.stock) <= Number(p.reorderLevel || 0) && Number(p.stock) > 0);
    } else if (stockFilter === "out_of_stock") {
      list = list.filter((p: any) => Number(p.stock) <= 0);
    }
    return list;
  }, [rawProducts, brandFilter, stockFilter]);

  const totalSkus = totalCount || products.length;
  const lowStockCount = useMemo(
    () => products.filter((p: any) => Number(p.stock) <= Number(p.reorderLevel || 0)).length,
    [products]
  );
  const totalInventoryValue = useMemo(
    () => products.reduce((sum, p: any) => sum + (Number(p.stock || 0) * Number(p.cost || 0)), 0),
    [products]
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Printing state
  const [printProduct, setPrintProduct] = useState<any>(null);
  const [printCount, setPrintCount] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isPrinting) {
      printReceiptIframe(".pos-print-labels");
      setIsPrinting(false);
      setPrintProduct(null);
    }
  }, [isPrinting]);

  const openNew = () => {
    navigate({ to: "/products/new" });
  };

  const handleEdit = (p: any) => {
    navigate({ to: `/products/${p.id}` });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteProductFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const confirmDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId);
  };

  const handlePrint = () => {
    if (!printProduct || printCount < 1) return;
    setIsPrinting(true);
  };

  const handleExport = async () => {
    try {
      const variantsRes = (await getAllProductVariantsFn()) as any;
      const allVariants = variantsRes?.success ? variantsRes.data : [];

      const exportData: any[] = [];
      products.forEach((p: any) => {
        const catName = categories.find((c: any) => c.id === p.category)?.name || "General";
        const brandName = brands.find((b: any) => b.id === p.brand)?.name || "N/A";
        exportData.push({
          Name: p.name,
          SKU: p.sku || "",
          Barcode: p.barcode || "",
          Category: catName,
          Brand: brandName,
          Price: p.price,
          Cost: p.cost,
          Stock: p.stock,
          ReorderLevel: p.reorderLevel,
        });
      });

      exportToCSV(
        exportData,
        [
          { key: "Name", label: "Product Name" },
          { key: "SKU", label: "SKU" },
          { key: "Barcode", label: "Barcode" },
          { key: "Category", label: "Category" },
          { key: "Brand", label: "Brand" },
          { key: "Price", label: "Price" },
          { key: "Cost", label: "Cost" },
          { key: "Stock", label: "Stock" },
          { key: "ReorderLevel", label: "Reorder Level" },
        ],
        "products-catalog"
      );
    } catch (e) {
      toast.error("Failed to export products");
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Products & Master Catalog"
        description="Manage your full SKU catalog, tiered pricing rules, and stock reorder thresholds."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1.5"
            >
              <Download className="size-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="size-4" /> Add Product
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Catalog SKUs"
          value={String(totalSkus)}
          hint="Active items in system"
          icon={Package}
          accent="primary"
        />
        <StatCard
          label="Low Stock Warnings"
          value={`${lowStockCount} items`}
          hint="Below reorder threshold"
          icon={AlertTriangle}
          accent="warning"
        />
        <StatCard
          label="Inventory Asset Value"
          value={formatCurrency(totalInventoryValue)}
          hint="Holding cost valuation"
          icon={DollarSign}
          accent="success"
        />
        <StatCard
          label="Active Departments"
          value={`${categories.length} Categories`}
          hint="Product classifications"
          icon={Layers}
          accent="info"
        />
      </div>

      {/* Main Directory Area */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock Alert</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`grid size-8 place-items-center rounded-md transition-all ${view === "list"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                title="Table View"
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${view === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isProductsLoading ? (
          view === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={7} rows={6} />
          )
        ) : isProductsError ? (
          <ErrorState onRetry={refetchProducts} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't added any products to your catalog yet."
            }
            actionLabel="Add Product"
            onAction={openNew}
          />
        ) : view === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p: any) => {
                const catObj = categories.find((c: any) => c.id === p.category);
                const brandObj = brands.find((b: any) => b.id === p.brand);
                const unitObj = units.find((u: any) => u.id === p.unit);
                const isLow = Number(p.stock) <= Number(p.reorderLevel || 0);

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between space-y-3 hover:border-border transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-video w-full rounded-xl bg-muted/40 overflow-hidden border border-border/50 grid place-items-center">
                        {p.image ? (
                          <img src={p.image} alt="" className="size-full object-cover" />
                        ) : (
                          <PackageSearch className="size-8 text-muted-foreground/40" />
                        )}
                        <div className="absolute top-2 left-2">
                          {isLow ? (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              Low Stock ({p.stock})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px] font-bold">
                              {p.stock} {unitObj?.short || "pcs"} in stock
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold truncate">
                            {p.sku || "NO-SKU"}
                          </span>
                          <span className="text-[10px] font-bold text-primary truncate">
                            {catObj?.name || "General"}
                          </span>
                        </div>
                        <h3
                          onClick={() => handleEdit(p)}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate mt-0.5"
                        >
                          {p.name}
                        </h3>
                        {brandObj && (
                          <p className="text-xs text-muted-foreground truncate">{brandObj.name}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Price</span>
                        <span className="text-base font-bold text-foreground">{formatCurrency(p.price || 0)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPrintProduct(p);
                            setPrintCount(1);
                          }}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Print Barcode Label"
                        >
                          <Printer className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(p)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {products.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalCount}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead className="text-right">Retail Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => {
                    const catObj = categories.find((c: any) => c.id === p.category);
                    const isLow = Number(p.stock) <= Number(p.reorderLevel || 0);

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div
                            onClick={() => handleEdit(p)}
                            className="cursor-pointer hover:text-primary transition-colors flex items-center gap-2.5"
                          >
                            <div className="grid size-8 place-items-center rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/50">
                              {p.image ? (
                                <img src={p.image} alt="" className="size-full object-cover" />
                              ) : (
                                <PackageSearch className="size-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <span className="font-semibold text-foreground">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.sku || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {catObj?.name || "General"}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              Low: {p.stock}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px] font-bold">
                              {p.stock} in stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(p.price || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPrintProduct(p);
                                setPrintCount(1);
                              }}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Printer className="size-3.5 mr-1" /> Label
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(p)}
                              className="h-8 text-xs"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(p.id)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {products.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalCount}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Delete Product
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete this product? All catalog mappings will be removed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Barcode Dialog */}
      <Dialog open={!!printProduct && !isPrinting} onOpenChange={(open) => !open && setPrintProduct(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="font-bold flex items-center gap-2 text-foreground">
              <Printer className="size-4 text-primary" /> Print Barcode Labels
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate ready-to-stick thermal adhesive barcode labels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="text-xs rounded-xl bg-muted/40 p-3 border border-border/60 space-y-1">
              <div>
                Product: <strong className="text-foreground">{printProduct?.name}</strong>
              </div>
              <div>
                Barcode:{" "}
                <strong className="font-mono text-foreground">
                  {printProduct?.barcode || printProduct?.sku}
                </strong>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Number of Adhesive Labels</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={printCount}
                onChange={(e) => setPrintCount(parseInt(e.target.value) || 1)}
                className="h-9 text-xs font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex flex-row items-center justify-end">
            <Button
              variant="outline"
              onClick={() => setPrintProduct(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
            >
              <Printer className="size-3.5 mr-1" /> Print Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Layout */}
      {isPrinting && printProduct && (
        <div className="pos-print-labels">
          {Array.from({ length: printCount }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center p-2 border border-black border-dashed w-[200px] h-[100px]"
            >
              <div className="text-[10px] font-bold truncate w-full text-center">
                {printProduct.name}
              </div>
              <div className="scale-75 -my-2 origin-center">
                <Barcode
                  value={printProduct.barcode || printProduct.sku}
                  width={1.5}
                  height={40}
                  displayValue={true}
                />
              </div>
              <div className="text-[12px] font-bold mt-1">{formatCurrency(printProduct.price)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
