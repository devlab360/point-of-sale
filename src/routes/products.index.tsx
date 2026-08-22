import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import {
  Grid3x3,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  PackageSearch,
  Printer,
  Loader2,
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { VariantManager, Variant } from "@/components/products/VariantManager";
import { useState, useMemo, useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { DataPage } from "@/components/layout/DataPage";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { DatePicker } from "@/components/ui/date-picker";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Barcode from "react-barcode";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductsFn,
  createProductFn,
  deleteProductFn,
  getAllProductVariantsFn,
} from "@/api/products";
import { getCategoriesFn, createCategoryFn } from "@/api/categories";
import { getBrandsFn, createBrandFn } from "@/api/brands";
import { getUnitsFn, createUnitFn } from "@/api/units";
import { getSettingsFn } from "@/api/settings";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [{ title: "Products · NexisPOS" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { saasPlan } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [view, setView] = useState<"grid" | "list">("list");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ category: "", brand: "", stock: "" });
  const [draftFilters, setDraftFilters] = useState({ category: "", brand: "", stock: "" });
  const activeFilterCount =
    (filters.category ? 1 : 0) + (filters.brand ? 1 : 0) + (filters.stock ? 1 : 0);

  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", orgId, page, pageSize, debouncedSearch, filters.category],
    queryFn: async () =>
      ((await getProductsFn({
        data: { page, pageSize, query: debouncedSearch, categoryId: filters.category },
      })) as any) || {},
  });

  const products = productsResponse?.data || [];
  const totalCount = productsResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleResetFilters = () => {
    setFilters({ category: "", brand: "", stock: "" });
    setDraftFilters({ category: "", brand: "", stock: "" });
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.category, filters.brand, filters.stock]);
  const { data: categoriesData } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = categoriesData || [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => ((await getBrandsFn({ data: {} })) as any)?.data || [],
  });
  const brands = brandsData || [];

  const { data: unitsData } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => ((await getUnitsFn({ data: {} })) as any)?.data || [],
  });
  const units = unitsData || [];

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Printing state
  const [printProduct, setPrintProduct] = useState<any>(null);
  const [printCount, setPrintCount] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isPrinting) {
      window.print();
      setIsPrinting(false);
      setPrintProduct(null);
    }
  }, [isPrinting]);

  const openNew = () => {
    const limitsObj =
      typeof saasPlan?.limits === "string" ? JSON.parse(saasPlan.limits) : saasPlan?.limits;
    const maxProducts = Number(limitsObj?.maxProducts || 500);
    if (maxProducts > 0 && products.length >= maxProducts) {
      return toast.error(
        `Plan Limit Reached: Your current plan only allows ${maxProducts} products. Please upgrade to add more.`,
      );
    }
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
      const variantsRes = await getAllProductVariantsFn();
      const allVariants = variantsRes?.success ? variantsRes.data : [];

      const exportData: any[] = [];

      products.forEach(p => {
        const catName = categories.find(c => c.id === p.category)?.name || 'General';
        const brandName = brands.find(b => b.id === p.brand)?.name || 'N/A';
        const baseRow = {
          Name: p.name,
          Category: catName,
          Brand: brandName,
          BasePrice: p.price,
          BaseCost: p.cost,
          Stock: p.stock,
          ReorderLevel: p.reorderLevel,
        };

        if (p.hasVariants) {
          const productVariants = allVariants.filter((v: any) => v.productId === p.id);
          if (productVariants.length > 0) {
            productVariants.forEach((v: any) => {
              const row: any = {
                ...baseRow,
                VariantName: v.name,
                VariantSKU: v.sku || '',
                VariantBarcode: v.barcode || '',
                VariantPrice: v.price || baseRow.BasePrice,
                VariantCost: v.cost || baseRow.BaseCost,
              };
              if (v.attributes && v.attributes.length > 0) {
                v.attributes.forEach((attr: any, index: number) => {
                  if (index < 3) {
                    row[`Option${index + 1}Name`] = attr.name;
                    row[`Option${index + 1}Value`] = attr.value;
                  }
                });
              }
              exportData.push(row);
            });
          } else {
            exportData.push(baseRow);
          }
        } else {
          exportData.push({
            ...baseRow,
            VariantSKU: p.sku || '',
            VariantBarcode: p.barcode || ''
          });
        }
      });

      exportToCSV(exportData, [
        { key: 'Name', label: 'Name' },
        { key: 'Category', label: 'Category' },
        { key: 'Brand', label: 'Brand' },
        { key: 'BasePrice', label: 'Base Price' },
        { key: 'BaseCost', label: 'Base Cost' },
        { key: 'Stock', label: 'Stock' },
        { key: 'ReorderLevel', label: 'Reorder Level' },
        { key: 'VariantName', label: 'Variant Name' },
        { key: 'VariantSKU', label: 'Variant SKU' },
        { key: 'VariantBarcode', label: 'Variant Barcode' },
        { key: 'VariantPrice', label: 'Variant Price' },
        { key: 'VariantCost', label: 'Variant Cost' },
        { key: 'Option1Name', label: 'Option1 Name' },
        { key: 'Option1Value', label: 'Option1 Value' },
        { key: 'Option2Name', label: 'Option2 Name' },
        { key: 'Option2Value', label: 'Option2 Value' },
        { key: 'Option3Name', label: 'Option3 Name' },
        { key: 'Option3Value', label: 'Option3 Value' },
      ], 'products-with-variants');
    } catch (e) {
      toast.error("Failed to export products");
      console.error(e);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      const groupedData: Record<string, any[]> = {};
      data.forEach(row => {
        if (row['Name']) {
          if (!groupedData[row['Name']]) {
            groupedData[row['Name']] = [];
          }
          groupedData[row['Name']].push(row);
        }
      });

      let count = 0;
      for (const [name, rows] of Object.entries(groupedData)) {
        const firstRow = rows[0];
        const hasVariants = rows.length > 1 || !!firstRow['VariantName'];
        
        const variantsToCreate = hasVariants ? rows.map(row => {
          const attributes: { name: string; value: string }[] = [];
          for (let i = 1; i <= 3; i++) {
            if (row[`Option${i}Name`] && row[`Option${i}Value`]) {
              attributes.push({
                name: row[`Option${i}Name`],
                value: row[`Option${i}Value`]
              });
            }
          }
          return {
            name: row['VariantName'] || 'Default',
            sku: row['VariantSKU'] || '',
            barcode: row['VariantBarcode'] || '',
            price: parseFloat(row['VariantPrice'] || row['BasePrice'] || '0'),
            cost: parseFloat(row['VariantCost'] || row['BaseCost'] || '0'),
            attributes
          };
        }) : [];

        await createProductFn({
          data: {
            product: {
              id: uuidv4(),
              name: name,
              sku: !hasVariants ? (firstRow['VariantSKU'] || firstRow['SKU'] || `SKU-${Math.floor(Math.random() * 100000)}`) : `SKU-${Math.floor(Math.random() * 100000)}`,
              barcode: !hasVariants ? (firstRow['VariantBarcode'] || firstRow['Barcode'] || '') : '',
              category: categories.find(c => c.name.toLowerCase() === (firstRow['Category'] || '').toLowerCase())?.id || categories[0]?.id || 'General',
              brand: brands.find(b => b.name.toLowerCase() === (firstRow['Brand'] || '').toLowerCase())?.id || brands[0]?.id || '',
              cost: parseFloat(firstRow['BaseCost'] || firstRow['Cost'] || '0'),
              price: parseFloat(firstRow['BasePrice'] || firstRow['Price'] || '0'),
              stock: parseInt(firstRow['Stock'] || '0'),
              reorderLevel: parseInt(firstRow['ReorderLevel'] || firstRow['Reorder Level'] || '0'),
              hasVariants,
              variants: variantsToCreate,
              type: 'standard',
              unit: 'pcs',
              status: 'active'
            }
          }
        });
        count++;
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Successfully imported ${count} products`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title={t("products") || "Products"}
        description={
          t("manageCatalog") || "Manage your full SKU catalog, pricing, and stock thresholds."
        }
        primaryAction={{ label: t("addProduct") || "Add Product", onClick: openNew }}
        searchPlaceholder={t("searchProducts") || "Search by name, SKU, or barcode..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={products.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        toolbar={
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "list" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "grid" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="size-4" />
            </button>
          </div>
        }
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Categories" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={draftFilters.category}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, category: val }))}
                  placeholder="Filter by Category"
                />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Brands" },
                    ...brands.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                  value={draftFilters.brand}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, brand: val }))}
                  placeholder="Filter by Brand"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low-stock", label: "Low Stock" },
                    { value: "out-of-stock", label: "Out of Stock" },
                  ]}
                  value={draftFilters.stock}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, stock: val }))}
                  placeholder="Filter by Stock"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {isProductsLoading ? (
          view === "list" ? (
            <TableSkeleton columns={7} rows={6} showHeaderAction={false} showFilters={false} />
          ) : (
            <CardGridSkeleton cards={8} />
          )
        ) : isProductsError ? (
          <ErrorState onRetry={refetchProducts} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t("noProductsFound") || "No products found"}
            description={
              search
                ? t("adjustSearch") || "Try adjusting your search."
                : t("noProductsYet") || "You haven't added any products yet."
            }
            actionLabel="Add Product"
            onAction={openNew}
          />
        ) : (
          <div className="space-y-4">
            {view === "list" ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <TableView
                  products={products}
                  categories={categories}
                  brands={brands}
                  units={units}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                  onPrint={(p) => {
                    setPrintProduct(p);
                    setPrintCount(1);
                  }}
                />
                {products.length > 0 && (
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    totalItems={products.length}
                  />
                )}
              </div>
            ) : (
              <>
                <GridView
                  products={products}
                  categories={categories}
                  brands={brands}
                  units={units}
                  onEdit={handleEdit}
                  onPrint={(p) => {
                    setPrintProduct(p);
                    setPrintCount(1);
                  }}
                />
                {products.length > 0 && (
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    totalItems={products.length}
                    className="rounded-xl border"
                  />
                )}
              </>
            )}
          </div>
        )}
      </DataPage>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Setup Dialog */}
      <Dialog
        open={!!printProduct && !isPrinting}
        onOpenChange={(open) => !open && setPrintProduct(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Barcode Labels</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm">
              Product: <strong>{printProduct?.name}</strong>
              <br />
              Barcode: <strong>{printProduct?.barcode}</strong>
            </div>
            <div className="space-y-2">
              <Label>Number of Labels</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={printCount}
                onChange={(e) => setPrintCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="size-4 mr-2" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Layout */}
      {isPrinting && printProduct && (
        <div className="hidden print:flex fixed inset-0 z-[100] bg-white flex-wrap content-start gap-4 p-4 print:text-black">
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

function TableView({
  products,
  categories,
  brands,
  units,
  onEdit,
  onDelete,
  onPrint,
}: {
  products: any[];
  categories: any[];
  brands: any[];
  units: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onPrint: (p: any) => void;
}) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm min-w-[1000px]">
        <thead className="sticky top-0 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 whitespace-nowrap">
              <input type="checkbox" className="rounded border-border" />
            </th>
            <th className="px-4 py-3 whitespace-nowrap">{t("product") || "Product"}</th>
            <th className="px-4 py-3 whitespace-nowrap">{t("sku") || "SKU"}</th>
            <th className="px-4 py-3 whitespace-nowrap">{t("category") || "Category"}</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">{t("price") || "Price"}</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">{t("stock") || "Stock"}</th>
            <th className="px-4 py-3 whitespace-nowrap">{t("status") || "Status"}</th>
            <th className="px-4 py-3 whitespace-nowrap"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((p) => (
            <tr key={p.id} className="group hover:bg-muted/30">
              <td className="px-4 py-3 whitespace-nowrap">
                <input type="checkbox" className="rounded border-border" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted overflow-hidden">
                    <img src={p.image} alt="" className="size-full object-cover" />
                  </div>
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {brands.find((b) => b.id === p.brand)?.name || p.brand || ""}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {p.sku}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {categories.find((c) => c.id === p.category)?.name || p.category || "-"}
              </td>
              <td className="number px-4 py-3 text-right whitespace-nowrap">
                <div className="font-semibold">{formatCurrency(p.price)}</div>
                {(p.wholesalePrice > 0 || p.dealerPrice > 0) && (
                  <div className="flex flex-col items-end gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                    {p.wholesalePrice > 0 && (
                      <span className="text-info font-medium">
                        WS: {formatCurrency(p.wholesalePrice)}
                      </span>
                    )}
                    {p.dealerPrice > 0 && (
                      <span className="text-warning font-medium">
                        Dealer: {formatCurrency(p.dealerPrice)}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span
                  className={cn(
                    "number font-semibold",
                    Number(p.stock) <= Number(p.reorderLevel) && "text-destructive",
                  )}
                >
                  {p.stock}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {units.find((u) => u.id === p.unit)?.name || p.unit || ""}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex flex-col gap-1 items-start">
                  {Number(p.stock) <= Number(p.reorderLevel) ? (
                    <Badge variant="destructive">Low stock</Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success hover:bg-success/15">
                      In stock
                    </Badge>
                  )}
                  {p.expiryDate && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      Exp: {p.expiryDate}
                    </span>
                  )}
                  {p.hasSerial && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      IMEI: {p.serials?.length || 0} Avail
                    </span>
                  )}
                  {p.hasBatch && p.batches?.[0] && (
                    <span className="rounded bg-info/10 px-1.5 py-0.5 text-[9px] font-bold text-info">
                      Batch: {p.batches[0].batchNo} ({p.batches[0].expiryDate})
                    </span>
                  )}
                  {p.locationRack && (
                    <span className="rounded bg-muted border px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground font-bold">
                      Rack: {p.locationRack} {p.locationShelf ? `· ${p.locationShelf}` : ""}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrint(p)}>
                      <Printer className="size-4" /> Print Label
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(p.id)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridView({
  products,
  categories,
  brands,
  units,
  onEdit,
  onPrint,
}: {
  products: any[];
  categories: any[];
  brands: any[];
  units: any[];
  onEdit: (p: any) => void;
  onPrint: (p: any) => void;
}) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => {
        const categoryName = categories.find((c) => c.id === p.category)?.name || p.category || "-";
        const unitName = units.find((u) => u.id === p.unit)?.name || p.unit || "";
        return (
          <div
            key={p.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div
              className="aspect-square bg-muted cursor-pointer overflow-hidden"
              onClick={() => onEdit(p)}
            >
              <img src={p.image} alt="" className="size-full object-cover" />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="size-7 shadow-soft"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint(p);
                }}
              >
                <Printer className="size-3.5" />
              </Button>
            </div>
            <div className="p-3.5 cursor-pointer" onClick={() => onEdit(p)}>
              <div className="text-sm font-semibold truncate" title={p.name}>
                {p.name}
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.sku}</span>
                <span className="truncate max-w-[50%] text-right">{categoryName}</span>
              </div>

              <div className="mt-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="number text-base font-bold">{formatCurrency(p.price)}</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      Number(p.stock) <= Number(p.reorderLevel) ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {p.stock} {unitName || "in stock"}
                  </span>
                </div>
                {p.expiryDate && (
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    Exp: {p.expiryDate}
                  </div>
                )}

                {(p.wholesalePrice > 0 || p.dealerPrice > 0) && (
                  <div className="flex items-center justify-between text-[10px] border-t border-border/50 pt-1 mt-0.5">
                    <span className="text-info font-medium">
                      {p.wholesalePrice > 0 ? `WS: ${formatCurrency(p.wholesalePrice)}` : ""}
                    </span>
                    <span className="text-warning font-medium">
                      {p.dealerPrice > 0 ? `DLR: ${formatCurrency(p.dealerPrice)}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Removed fake Pagination component
// avoid unused
void Link;
