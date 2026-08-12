import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductsFn, createProductFn, updateProductFn, deleteProductFn } from "@/api/products";
import { getCategoriesFn, createCategoryFn } from "@/api/categories";
import { getBrandsFn, createBrandFn } from "@/api/brands";
import { getUnitsFn, createUnitFn } from "@/api/units";
import { getSettingsFn } from "@/api/settings";

export const Route = createFileRoute("/products")({
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

  // Filters moved up

  const handleResetFilters = () => {
    setFilters({ category: "", brand: "", stock: "" });
    setDraftFilters({ category: "", brand: "", stock: "" });
  };

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data,
  });
  const settings = settingsData?.[0] || null;

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    brand: "",
    unit: "",
    price: 0,
    cost: 0,
    stock: 0,
    reorderLevel: 5,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150",
    expiryDate: "",
    wholesalePrice: 0,
    dealerPrice: 0,
    minWholesaleQty: 1,
    hasSerial: false,
    serialsInput: "",
    hasBatch: false,
    batchNoInput: "",
    batchExpiryInput: "",
    batchStockInput: 0,
    locationRack: "",
    locationShelf: "",
    locationBin: "",
    hsnCode: "",
    gstRate: 0,
    taxInclusive: false,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Printing state
  const [printProduct, setPrintProduct] = useState<any>(null);
  const [printCount, setPrintCount] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    errors: prodErrors,
    validate: validateProd,
    clearError: clearProdError,
    clearAll: clearProdAll,
  } = useFormValidation({
    name: {
      required: "Product name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    sku: { required: "SKU is required" },
    price: {
      required: "Retail price is required",
      positive: "Price must be a valid positive number",
    },
    cost: { required: "Cost price is required", positive: "Cost must be a valid positive number" },
    stock: { required: "Stock is required", positive: "Stock cannot be negative" },
    reorderLevel: {
      required: "Reorder level is required",
      positive: "Reorder level cannot be negative",
    },
  });

  useEffect(() => {
    if (isPrinting) {
      window.print();
      setIsPrinting(false);
      setPrintProduct(null);
    }
  }, [isPrinting]);

  const openNew = () => {
    // Check Limits
    const limitsObj =
      typeof saasPlan?.limits === "string" ? JSON.parse(saasPlan.limits) : saasPlan?.limits;
    const maxProducts = Number(limitsObj?.maxProducts || 500);
    if (maxProducts > 0 && products.length >= maxProducts) {
      return toast.error(
        `Plan Limit Reached: Your current plan only allows ${maxProducts} products. Please upgrade to add more.`,
      );
    }

    setEditingProd(null);
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      brand: "",
      unit: "",
      price: 0,
      cost: 0,
      stock: 0,
      reorderLevel: 5,
      image:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150",
      expiryDate: "",
      wholesalePrice: 0,
      dealerPrice: 0,
      minWholesaleQty: 1,
      hasSerial: false,
      serialsInput: "",
      hasBatch: false,
      batchNoInput: "",
      batchExpiryInput: "",
      batchStockInput: 0,
      locationRack: "",
      locationShelf: "",
      locationBin: "",
      hsnCode: "",
      gstRate: 0,
      taxInclusive: false,
    });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProd(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      brand: p.brand,
      unit: p.unit,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      reorderLevel: p.reorderLevel,
      image: p.image,
      expiryDate: p.expiryDate || "",
      wholesalePrice: p.wholesalePrice || 0,
      dealerPrice: p.dealerPrice || 0,
      minWholesaleQty: p.minWholesaleQty || 1,
      hasSerial: !!p.hasSerial,
      serialsInput: (p.serials || []).join(", "),
      hasBatch: !!p.hasBatch,
      batchNoInput: p.batches?.[0]?.batchNo || "",
      batchExpiryInput: p.batches?.[0]?.expiryDate || "",
      batchStockInput: p.batches?.[0]?.stock || 0,
      locationRack: p.locationRack || "",
      locationShelf: p.locationShelf || "",
      locationBin: p.locationBin || "",
      hsnCode: p.hsnCode || "",
      gstRate: p.gstRate || 0,
      taxInclusive: !!p.taxInclusive,
    });
    setModalOpen(true);
  };

  const save = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();

    const isValid = validateProd({
      name: formData.name,
      sku: formData.sku,
      price: String(formData.price),
      cost: String(formData.cost),
      stock: String(formData.stock),
      reorderLevel: String(formData.reorderLevel),
    });

    if (!isValid) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Parse serials
    const serialsList = formData.hasSerial
      ? formData.serialsInput
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      : [];

    const computedStock =
      formData.hasSerial && serialsList.length > 0 ? serialsList.length : formData.stock;

    const batchesList =
      formData.hasBatch && formData.batchNoInput
        ? [
          {
            batchNo: formData.batchNoInput,
            expiryDate: formData.batchExpiryInput,
            stock: formData.batchStockInput || computedStock,
          },
        ]
        : [];

    const payload = {
      ...formData,
      stock: computedStock,
      serials: serialsList,
      batches: batchesList,
      expiryDate: formData.expiryDate ? formData.expiryDate : null,
      wholesalePrice: String(formData.wholesalePrice) === "" ? null : formData.wholesalePrice,
      dealerPrice: String(formData.dealerPrice) === "" ? null : formData.dealerPrice,
      minWholesaleQty: String(formData.minWholesaleQty) === "" ? null : formData.minWholesaleQty,
      gstRate: String(formData.gstRate) === "" ? null : formData.gstRate,
      synced: false,
    };

    try {
      if (editingProd) {
        const res = await updateProductFn({
          data: {
            id: editingProd.id,
            updates: payload,
          },
        });
        if (res?.success) {
          toast.success("Product updated");
          queryClient.invalidateQueries({ queryKey: ["products"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createProductFn({
          data: {
            product: payload,
          },
        });
        if (res?.success) {
          toast.success("Product created");
          queryClient.invalidateQueries({ queryKey: ["products"] });
        } else throw new Error(res?.error);
      }
      setModalOpen(false);
      clearProdAll();
    } catch (e: any) {
      console.error("Product Save Error:", e);
      toast.error(e.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProd = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteProductFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Product deleted");
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else throw new Error(res?.error);
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setDeleteId(null);
    }
  };

  const handlePrint = () => {
    if (!printProduct || printCount < 1) return;
    setIsPrinting(true);
  };

  const handleExport = () => {
    const exportData = products.map(p => ({
      ...p,
      category: categories.find(c => c.id === p.category)?.name || 'General',
      brand: brands.find(b => b.id === p.brand)?.name || 'N/A'
    }));
    exportToCSV(exportData, [
      { key: 'name', label: 'Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'brand', label: 'Brand' },
      { key: 'cost', label: 'Cost' },
      { key: 'price', label: 'Price' },
      { key: 'stock', label: 'Stock' },
      { key: 'reorderLevel', label: 'Reorder Level' },
    ], 'products');
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      let count = 0;
      for (const row of data) {
        if (row['Name'] && row['Price']) {
          await createProductFn({
            data: {
              product: {
                id: uuidv4(),
                name: row['Name'],
                sku: row['SKU'] || `SKU-${Math.floor(Math.random() * 100000)}`,
                barcode: row['Barcode'] || '',
                category: categories.find(c => c.name.toLowerCase() === (row['Category'] || '').toLowerCase())?.id || categories[0]?.id || 'General',
                brand: brands.find(b => b.name.toLowerCase() === (row['Brand'] || '').toLowerCase())?.id || brands[0]?.id || '',
                cost: parseFloat(row['Cost'] || '0'),
                price: parseFloat(row['Price'] || '0'),
                stock: parseInt(row['Stock'] || '0'),
                reorderLevel: parseInt(row['Reorder Level'] || '0'),
                type: 'standard',
                unit: 'pcs',
                status: 'active'
              }
            }
          });
          count++;
        }
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
                  onEdit={openEdit}
                  onDelete={deleteProd}
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
                  onEdit={openEdit}
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProd ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="grid gap-1.5 col-span-1 md:col-span-2">
                <Label>
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Item Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearProdError("name");
                  }}
                  className={
                    prodErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={prodErrors.name} />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. SKU-001"
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value });
                    clearProdError("sku");
                  }}
                  className={
                    prodErrors.sku ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={prodErrors.sku} />
              </div>
              <div className="grid gap-1.5">
                <Label>Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 123456789012"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const randomBarcode = Math.floor(
                        1000000000000 + Math.random() * 9000000000000,
                      ).toString();
                      setFormData({ ...formData, barcode: randomBarcode });
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">{t("category") || "Category"}</Label>
                <SearchableSelect
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  placeholder={t("selectCategory") || "Select category..."}
                  onCreate={async (name) => {
                    const res = await createCategoryFn({ data: { category: { name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["categories"] });
                      return res.data?.id;
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">{t("brand") || "Brand"}</Label>
                <SearchableSelect
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  value={formData.brand}
                  onChange={(val) => setFormData({ ...formData, brand: val })}
                  placeholder={t("selectBrand") || "Select brand..."}
                  onCreate={async (name) => {
                    const res = await createBrandFn({ data: { brand: { name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["brands"] });
                      return res.data?.id;
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">{t("unitType") || "Unit Type"}</Label>
                <SearchableSelect
                  options={units.map((u) => ({ value: u.id, label: u.name }))}
                  value={formData.unit}
                  onChange={(val) => setFormData({ ...formData, unit: val })}
                  placeholder={t("selectUnit") || "Select unit..."}
                  onCreate={async (name) => {
                    const res = await createUnitFn({ data: { unit: { name, shortName: name } } });
                    if (res?.success) {
                      queryClient.invalidateQueries({ queryKey: ["units"] });
                      return res.data?.id;
                    }
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Retail Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price === 0 ? "" : formData.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                    clearProdError("price");
                  }}
                  className={
                    prodErrors.price ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={prodErrors.price} />
              </div>
              <div className="grid gap-1.5">
                <Label>Wholesale Price (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 45.00"
                  value={formData.wholesalePrice || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Dealer Price (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 40.00"
                  value={formData.dealerPrice || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Cost Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost === 0 ? "" : formData.cost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 });
                    clearProdError("cost");
                  }}
                  className={
                    prodErrors.cost ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={prodErrors.cost} />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Stock <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.stock === 0 ? "" : formData.stock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                    clearProdError("stock");
                  }}
                  className={
                    prodErrors.stock ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={prodErrors.stock} />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Reorder Level <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 5"
                  value={formData.reorderLevel === 0 ? "" : formData.reorderLevel}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 });
                    clearProdError("reorderLevel");
                  }}
                  className={
                    prodErrors.reorderLevel
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                <FieldError message={prodErrors.reorderLevel} />
              </div>
              <div className="grid gap-1.5">
                <Label>Expiry Date (Optional)</Label>
                <DatePicker
                  date={formData.expiryDate}
                  onDateChange={(d) =>
                    setFormData({ ...formData, expiryDate: d ? d.toISOString().split("T")[0] : "" })
                  }
                  placeholder="Select expiry date"
                />
              </div>
              <div className="grid gap-2 col-span-1 md:col-span-2">
                <Label>Product Image</Label>
                <FileUpload
                  value={
                    formData.image && !formData.image.includes("unsplash.com")
                      ? formData.image
                      : undefined
                  }
                  onChange={(url: string) =>
                    setFormData({
                      ...formData,
                      image:
                        url ||
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150",
                    })
                  }
                  folder="products"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  allowedTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                  maxSizeMB={3}
                  label=""
                  description="PNG, JPG, WEBP or GIF • Max 3MB"
                />
              </div>

              {/* Warehouse Rack / Shelf Location Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 col-span-1 md:col-span-2 rounded-xl border p-3 bg-muted/20">
                <div>
                  <Label className="text-xs">Rack No.</Label>
                  <Input
                    placeholder="e.g. A2"
                    value={formData.locationRack}
                    onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Shelf No.</Label>
                  <Input
                    placeholder="e.g. 3"
                    value={formData.locationShelf}
                    onChange={(e) => setFormData({ ...formData, locationShelf: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bin Position</Label>
                  <Input
                    placeholder="e.g. B4"
                    value={formData.locationBin}
                    onChange={(e) => setFormData({ ...formData, locationBin: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Electronics IMEI / Serial Tracking Toggle */}
              <div className="col-span-1 md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasSerial"
                    checked={formData.hasSerial}
                    onChange={(e) => setFormData({ ...formData, hasSerial: e.target.checked })}
                    className="rounded border-primary text-primary"
                  />
                  <Label
                    htmlFor="hasSerial"
                    className="font-semibold text-xs text-primary cursor-pointer"
                  >
                    Track Serial / IMEI Numbers (Mobile & Electronics)
                  </Label>
                </div>
                {formData.hasSerial && (
                  <div className="space-y-1 pl-6">
                    <Label className="text-xs">
                      Enter Available IMEI / Serial Numbers (Comma or Newline separated)
                    </Label>
                    <textarea
                      rows={2}
                      value={formData.serialsInput}
                      onChange={(e) => setFormData({ ...formData, serialsInput: e.target.value })}
                      placeholder="e.g. SN-001, SN-002, SN-003"
                      className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {settings?.enableGST && (
                <div className="col-span-1 md:col-span-2 rounded-xl border border-border bg-card p-4 space-y-4">
                  <h3 className="text-sm font-semibold mb-2">Tax & Compliance (GST)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">HSN / SAC Code</Label>
                      <Input
                        placeholder="e.g. 8517"
                        value={formData.hsnCode}
                        onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">GST Rate (%)</Label>
                      <Select
                        value={formData.gstRate.toString()}
                        onValueChange={(v) =>
                          setFormData({ ...formData, gstRate: parseInt(v) || 0 })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (Nil Rated)</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="taxInclusive"
                        checked={formData.taxInclusive}
                        onChange={(e) =>
                          setFormData({ ...formData, taxInclusive: e.target.checked })
                        }
                        className="rounded border-border text-primary"
                      />
                      <Label htmlFor="taxInclusive" className="text-xs cursor-pointer">
                        Price is Tax Inclusive
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy Batch & Expiry Tracking Toggle */}
              <div className="col-span-1 md:col-span-2 rounded-xl border border-info/20 bg-info/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasBatch"
                    checked={formData.hasBatch}
                    onChange={(e) => setFormData({ ...formData, hasBatch: e.target.checked })}
                    className="rounded border-info text-info"
                  />
                  <Label
                    htmlFor="hasBatch"
                    className="font-semibold text-xs text-info cursor-pointer"
                  >
                    Track Batches & Batch Expiry (Pharmacy & FMCG Food)
                  </Label>
                </div>
                {formData.hasBatch && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-0 md:pl-6">
                    <div>
                      <Label className="text-xs">Batch Number</Label>
                      <Input
                        placeholder="e.g. BATCH-2026A"
                        value={formData.batchNoInput}
                        onChange={(e) => setFormData({ ...formData, batchNoInput: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Batch Expiry</Label>
                      <div className="mt-1">
                        <DatePicker
                          date={formData.batchExpiryInput}
                          onDateChange={(d) =>
                            setFormData({
                              ...formData,
                              batchExpiryInput: d ? d.toISOString().split("T")[0] : "",
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Batch Stock Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        required
                        value={formData.batchStockInput}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            batchStockInput: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  clearProdAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                    p.stock <= p.reorderLevel && "text-destructive",
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
                  {p.stock <= p.reorderLevel ? (
                    <Badge variant="destructive">Low stock</Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success hover:bg-success/15">
                      In stock
                    </Badge>
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
                      p.stock <= p.reorderLevel ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {p.stock} {unitName || "in stock"}
                  </span>
                </div>

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
