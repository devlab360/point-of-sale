import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { exportToCSV, parseCSV } from "@/lib/csv";
import {
  Grid3x3,
  List,
  LayoutGrid,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    meta: [{ title: "Products · OneDesk360" }],
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

      products.forEach((p) => {
        const catName = categories.find((c) => c.id === p.category)?.name || "General";
        const brandName = brands.find((b) => b.id === p.brand)?.name || "N/A";
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
                VariantSKU: v.sku || "",
                VariantBarcode: v.barcode || "",
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
            VariantSKU: p.sku || "",
            VariantBarcode: p.barcode || "",
          });
        }
      });

      exportToCSV(
        exportData,
        [
          { key: "Name", label: "Name" },
          { key: "Category", label: "Category" },
          { key: "Brand", label: "Brand" },
          { key: "BasePrice", label: "Base Price" },
          { key: "BaseCost", label: "Base Cost" },
          { key: "Stock", label: "Stock" },
          { key: "ReorderLevel", label: "Reorder Level" },
          { key: "VariantName", label: "Variant Name" },
          { key: "VariantSKU", label: "Variant SKU" },
          { key: "VariantBarcode", label: "Variant Barcode" },
          { key: "VariantPrice", label: "Variant Price" },
          { key: "VariantCost", label: "Variant Cost" },
          { key: "Option1Name", label: "Option1 Name" },
          { key: "Option1Value", label: "Option1 Value" },
          { key: "Option2Name", label: "Option2 Name" },
          { key: "Option2Value", label: "Option2 Value" },
          { key: "Option3Name", label: "Option3 Name" },
          { key: "Option3Value", label: "Option3 Value" },
        ],
        "products-with-variants",
      );
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
      data.forEach((row) => {
        if (row["Name"]) {
          if (!groupedData[row["Name"]]) {
            groupedData[row["Name"]] = [];
          }
          groupedData[row["Name"]].push(row);
        }
      });

      let count = 0;
      for (const [name, rows] of Object.entries(groupedData)) {
        const firstRow = rows[0];
        const hasVariants = rows.length > 1 || !!firstRow["VariantName"];

        const variantsToCreate = hasVariants
          ? rows.map((row) => {
              const attributes: { name: string; value: string }[] = [];
              for (let i = 1; i <= 3; i++) {
                if (row[`Option${i}Name`] && row[`Option${i}Value`]) {
                  attributes.push({
                    name: row[`Option${i}Name`],
                    value: row[`Option${i}Value`],
                  });
                }
              }
              return {
                name: row["VariantName"] || "Default",
                sku: row["VariantSKU"] || "",
                barcode: row["VariantBarcode"] || "",
                price: parseFloat(row["VariantPrice"] || row["BasePrice"] || "0"),
                cost: parseFloat(row["VariantCost"] || row["BaseCost"] || "0"),
                attributes,
              };
            })
          : [];

        await createProductFn({
          data: {
            product: {
              id: uuidv4(),
              name: name,
              sku: !hasVariants
                ? firstRow["VariantSKU"] ||
                  firstRow["SKU"] ||
                  `SKU-${Math.floor(Math.random() * 100000)}`
                : `SKU-${Math.floor(Math.random() * 100000)}`,
              barcode: !hasVariants ? firstRow["VariantBarcode"] || firstRow["Barcode"] || "" : "",
              category:
                categories.find(
                  (c) => c.name.toLowerCase() === (firstRow["Category"] || "").toLowerCase(),
                )?.id ||
                categories[0]?.id ||
                "General",
              brand:
                brands.find((b) => b.name.toLowerCase() === (firstRow["Brand"] || "").toLowerCase())
                  ?.id ||
                brands[0]?.id ||
                "",
              cost: parseFloat(firstRow["BaseCost"] || firstRow["Cost"] || "0"),
              price: parseFloat(firstRow["BasePrice"] || firstRow["Price"] || "0"),
              stock: parseInt(firstRow["Stock"] || "0"),
              reorderLevel: parseInt(firstRow["ReorderLevel"] || firstRow["Reorder Level"] || "0"),
              hasVariants,
              variants: variantsToCreate,
              type: "standard",
              unit: "pcs",
              status: "active",
            },
          },
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
    <div>
      <DataPage
        title={t("products") || "Products"}
        description={
          t("manageCatalog") || "Manage your full SKU catalog, pricing, and stock thresholds."
        }
        primaryAction={{ label: t("addProduct") || "Add Product", onClick: openNew }}
        searchPlaceholder={t("searchProducts") || "Search by name, SKU, or barcode..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onImport={handleImport}
        toolbar={
          <div className="inline-flex rounded-xl border border-border/80 bg-muted/30 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-all",
                view === "list"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-all",
                view === "grid"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-4" />
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
                    { value: "", label: "All Stock Levels" },
                    { value: "in_stock", label: "In Stock" },
                    { value: "low_stock", label: "Low Stock Alert" },
                    { value: "out_of_stock", label: "Out of Stock" },
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
        ) : (
          <div className="space-y-4">
            {view === "list" ? (
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
                <TableView
                  products={products}
                  categories={categories}
                  brands={brands}
                  units={units}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                  onNew={openNew}
                  onPrint={(p) => {
                    setPrintProduct(p);
                    setPrintCount(1);
                  }}
                />
                {products.length > 0 && (
                  <div className="border-t border-border/60 p-2 sm:p-3">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      totalItems={products.length}
                    />
                  </div>
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
                  onNew={openNew}
                  onPrint={(p) => {
                    setPrintProduct(p);
                    setPrintCount(1);
                  }}
                />
                {products.length > 0 && (
                  <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      totalItems={products.length}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DataPage>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This SKU and its history will be removed from your
              catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Setup Dialog */}
      <Dialog
        open={!!printProduct && !isPrinting}
        onOpenChange={(open) => !open && setPrintProduct(null)}
      >
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Printer className="size-4 text-primary" /> Print Barcode Labels
            </DialogTitle>
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
              <Label className="text-xs font-semibold">Number of Labels</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={printCount}
                onChange={(e) => setPrintCount(parseInt(e.target.value) || 1)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setPrintProduct(null)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
            >
              <Printer className="size-4" /> Print Labels
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
  onNew,
  onPrint,
}: {
  products: any[];
  categories: any[];
  brands: any[];
  units: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onNew?: () => void;
  onPrint: (p: any) => void;
}) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  return (
    <>
      {/* Desktop Table View (>= 768px) */}
      <div className="table-desktop overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3">{t("product") || "Product"}</TableHead>
              <TableHead className="px-4 py-3">{t("sku") || "SKU"}</TableHead>
              <TableHead className="px-4 py-3">{t("category") || "Category"}</TableHead>
              <TableHead className="px-4 py-3 text-right">{t("price") || "Price"}</TableHead>
              <TableHead className="px-4 py-3 text-right">{t("stock") || "Stock"}</TableHead>
              <TableHead className="px-4 py-3">{t("status") || "Status"}</TableHead>
              <TableHead className="px-4 py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <EmptyState
                    icon={PackageSearch}
                    title={t("noProductsFound") || "No products found"}
                    description={
                      t("noProductsYet") || "You haven't added any products to your catalog yet."
                    }
                    actionLabel="Add Product"
                    onAction={onNew}
                    className="border-none bg-transparent my-0 py-8 shadow-none"
                  />
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const brandObj = brands.find((b) => b.id === p.brand);
                const catObj = categories.find((c) => c.id === p.category);
                const unitObj = units.find((u) => u.id === p.unit);
                const isLow = Number(p.stock) <= Number(p.reorderLevel);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                          {p.image ? (
                            <img src={p.image} alt="" className="size-full object-cover" />
                          ) : (
                            <PackageSearch className="size-5 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={() => onEdit(p)}
                          >
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {brandObj?.name || p.brand || "Standard SKU"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {p.sku || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs font-medium">
                      {catObj?.name || p.category || "-"}
                    </TableCell>
                    <TableCell className="number px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-extrabold text-foreground">{formatCurrency(p.price)}</div>
                      {(p.wholesalePrice > 0 || p.dealerPrice > 0) && (
                        <div className="flex flex-col items-end gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                          {p.wholesalePrice > 0 && (
                            <span className="text-info font-medium">
                              WS: {formatCurrency(p.wholesalePrice)}
                            </span>
                          )}
                          {p.dealerPrice > 0 && (
                            <span className="text-warning font-medium">
                              DLR: {formatCurrency(p.dealerPrice)}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={cn(
                          "number font-bold text-sm",
                          isLow ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {p.stock}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {unitObj?.name || p.unit || "units"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 items-center">
                        {isLow ? (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Low stock
                          </Badge>
                        ) : (
                          <Badge className="bg-success/12 text-success hover:bg-success/20 border-success/25 text-[10px] font-bold">
                            In stock
                          </Badge>
                        )}
                        {p.expiryDate && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                            Exp: {p.expiryDate}
                          </span>
                        )}
                        {p.hasSerial && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            IMEI: {p.serials?.length || 0}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={() => onEdit(p)}
                            className="text-xs font-semibold"
                          >
                            <Pencil className="size-3.5 mr-2" /> Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onPrint(p)}
                            className="text-xs font-semibold"
                          >
                            <Printer className="size-3.5 mr-2" /> Print Barcode
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive text-xs font-semibold"
                            onClick={() => onDelete(p.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Feed (< 768px) */}
      <div className="table-mobile-cards p-3 space-y-2.5">
        {products.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t("noProductsFound") || "No products found"}
            description={
              t("noProductsYet") || "You haven't added any products to your catalog yet."
            }
            actionLabel="Add Product"
            onAction={onNew}
            className="border-none bg-transparent my-0 py-6 shadow-none"
          />
        ) : (
          products.map((p) => {
            const brandObj = brands.find((b) => b.id === p.brand);
            const catObj = categories.find((c) => c.id === p.category);
            const isLow = Number(p.stock) <= Number(p.reorderLevel);

            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                onClick={() => onEdit(p)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted/60 overflow-hidden border border-border/50">
                    {p.image ? (
                      <img src={p.image} alt="" className="size-full object-cover" />
                    ) : (
                      <PackageSearch className="size-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {p.name}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.sku} · {catObj?.name || p.category || "General"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {isLow ? (
                        <span className="text-[9px] font-extrabold text-destructive bg-destructive/10 px-1.5 py-0.2 rounded-md">
                          {p.stock} left
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.2 rounded-md">
                          {p.stock} in stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="number text-sm font-black text-primary">
                    {formatCurrency(p.price)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-semibold text-muted-foreground mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrint(p);
                    }}
                  >
                    <Printer className="size-3 mr-1" /> Label
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function GridView({
  products,
  categories,
  brands,
  units,
  onEdit,
  onNew,
  onPrint,
}: {
  products: any[];
  categories: any[];
  brands: any[];
  units: any[];
  onEdit: (p: any) => void;
  onNew?: () => void;
  onPrint: (p: any) => void;
}) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={t("noProductsFound") || "No products found"}
        description={
          t("noProductsYet") || "You haven't added any products to your catalog yet."
        }
        actionLabel="Add Product"
        onAction={onNew}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => {
        const categoryName = categories.find((c) => c.id === p.category)?.name || p.category || "-";
        const unitName = units.find((u) => u.id === p.unit)?.name || p.unit || "";
        const isLow = Number(p.stock) <= Number(p.reorderLevel);

        return (
          <div
            key={p.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-card-hover card-interactive"
          >
            <div
              className="aspect-square bg-muted/40 cursor-pointer overflow-hidden relative flex items-center justify-center border-b border-border/50"
              onClick={() => onEdit(p)}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt=""
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                  <PackageSearch className="size-10" strokeWidth={1.5} />
                </div>
              )}

              {/* Status pill overlay */}
              {isLow && (
                <span className="absolute left-2 top-2 rounded-full bg-warning/90 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-warning-foreground shadow-sm backdrop-blur-sm">
                  {p.stock} left
                </span>
              )}

              {/* Edit overlay */}
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-black/60 py-1.5 text-center text-[11px] font-bold text-white backdrop-blur-sm transition-transform duration-200 group-hover:translate-y-0 flex items-center justify-center gap-1 shadow-inner">
                <Pencil className="size-3.5" /> Edit Product
              </div>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-xl shadow-soft bg-background/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint(p);
                }}
                title="Print Barcode"
              >
                <Printer className="size-3.5" />
              </Button>
            </div>

            <div
              className="p-3 cursor-pointer flex flex-col justify-between flex-1"
              onClick={() => onEdit(p)}
            >
              <div>
                <h4
                  className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight"
                  title={p.name}
                >
                  {p.name}
                </h4>
                <div className="mt-0.5 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">{p.sku}</span>
                  <span className="truncate max-w-[50%] text-right">{categoryName}</span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-col gap-1 border-t border-border/40 pt-2">
                <div className="flex items-center justify-between">
                  <span className="number text-sm sm:text-base font-black text-primary">
                    {formatCurrency(p.price)}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                      isLow
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.stock} {unitName || "stock"}
                  </span>
                </div>

                {(p.wholesalePrice > 0 || p.dealerPrice > 0) && (
                  <div className="flex items-center justify-between text-[9px] mt-0.5 font-bold">
                    <span className="text-info/80">
                      {p.wholesalePrice > 0 ? `WS: ${formatCurrency(p.wholesalePrice)}` : ""}
                    </span>
                    <span className="text-warning/80">
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

void Link;
