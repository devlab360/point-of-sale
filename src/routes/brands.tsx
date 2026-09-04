import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { PersistStore } from "@/lib/session-store";
import { appName } from "@/lib/env";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBrandsFn, createBrandFn, updateBrandFn, deleteBrandFn } from "@/api/brands";
import { getProductsFn } from "@/api/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tag,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Search,
  Package,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Award,
  Layers,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/brands")({
  head: () => ({ meta: [{ title: `Product Brands · ${appName}` }] }),
  component: BrandsPage,
});

function BrandsPage() {
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawBrandsData,
    isLoading: isBrandsLoading,
    isError: isBrandsError,
    refetch: refetchBrands,
  } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => ((await getBrandsFn({ data: {} })) as any)?.data || [],
  });
  const rawBrands = Array.isArray(rawBrandsData) ? rawBrandsData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const brandsWithCounts = useMemo(() => {
    return rawBrands.map((b: any) => ({
      ...b,
      products: products.filter((p: any) => p.brand === b.name || p.brand === b.id).length,
    }));
  }, [rawBrands, products]);

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [usageFilter, setUsageFilter] = useState<"all" | "in_use" | "unused">("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // KPI Calculations
  const totalBrands = brandsWithCounts.length;
  const inUseCount = useMemo(
    () => brandsWithCounts.filter((b) => b.products > 0).length,
    [brandsWithCounts],
  );
  const totalLinkedItems = useMemo(
    () => brandsWithCounts.reduce((sum, b) => sum + b.products, 0),
    [brandsWithCounts],
  );

  const filteredBrands = useMemo(() => {
    let list = brandsWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((b: any) => b.name?.toLowerCase().includes(lower));
    }
    if (usageFilter === "in_use") list = list.filter((b: any) => b.products > 0);
    if (usageFilter === "unused") list = list.filter((b: any) => b.products === 0);
    return list;
  }, [brandsWithCounts, debouncedSearch, usageFilter]);

  const totalPages = Math.ceil(filteredBrands.length / pageSize) || 1;
  const paginatedBrands = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBrands.slice(start, start + pageSize);
  }, [filteredBrands, page, pageSize]);

  const {
    errors: brandErrors,
    validate: validateBrand,
    clearError: clearBrandError,
    clearAll: clearBrandAll,
  } = useFormValidation({
    name: { required: "Brand name is required" },
  });

  const openNew = () => {
    setEditingBrand(null);
    setName("");
    clearBrandAll();
    setModalOpen(true);
  };

  const openEdit = (brand: any) => {
    setEditingBrand(brand);
    setName(brand.name || "");
    clearBrandAll();
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateBrand({ name })) return;

    setIsSaving(true);
    try {
      if (editingBrand) {
        const res = (await updateBrandFn({
          data: {
            id: editingBrand.id,
            updates: { name: name.trim() },
          },
        })) as any;
        if (res?.success) {
          toast.success("Brand updated");
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["brands", orgId] });
        } else throw new Error(res?.error);
      } else {
        const res = (await createBrandFn({
          data: {
            brand: {
              id: uuidv4(),
              name: name.trim(),
            },
          },
        })) as any;
        if (res?.success) {
          toast.success("Brand added to catalog");
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["brands", orgId] });
        } else throw new Error(res?.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save brand");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = (await deleteBrandFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success("Brand deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["brands", orgId] });
        } else throw new Error(res?.error);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete brand");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("productBrands", "Product Brands & Labels")}
        description={t("manageBrandsDesc", "Organize your SKU catalog by manufacturers, registered trademarks, and distributor brands.")}
        actions={
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="size-4" /> {t("addBrand", "Add Brand")}
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalBrands", "Total Brands")}
          value={String(totalBrands)}
          hint={t("registeredLabels", "Registered labels")}
          icon={Award}
          accent="primary"
        />
        <StatCard
          label={t("activeBrands", "Active in Catalog")}
          value={String(inUseCount)}
          hint={t("mappedToInventory", "Mapped to inventory")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("mappedProducts", "Mapped Products")}
          value={`${totalLinkedItems} SKUs`}
          hint={t("catalogInventoryItems", "Catalog inventory items")}
          icon={Package}
          accent="info"
        />
        <StatCard
          label={t("brandDiversity", "Brand Diversity")}
          value="100% Tracked"
          hint={t("verifiedManufacturerData", "Verified manufacturer data")}
          icon={Layers}
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
              placeholder={t("searchBrands", "Search brands...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end sm:self-auto">
            <Select
              value={usageFilter}
              onValueChange={(v) => {
                setUsageFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs rounded-lg">
                <SelectValue placeholder={t("filterByStatus", "Filter by status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBrandsCount", "All Brands")} ({totalBrands})</SelectItem>
                <SelectItem value="in_use">{t("inUse", "In Use")} ({inUseCount})</SelectItem>
                <SelectItem value="unused">{t("unused", "Unused")} ({totalBrands - inUseCount})</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
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
            </div>
          </div>
        </div>

        {/* Content View */}
        {isBrandsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={3} rows={6} />
          )
        ) : isBrandsError ? (
          <ErrorState onRetry={refetchBrands} />
        ) : filteredBrands.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={t("noBrandsFound", "No brands found")}
            description={
              search
                ? t("adjustSearch", "Try adjusting your search criteria.")
                : t("noBrandsYet", "You haven't created any product brands yet.")
            }
            actionLabel={t("addBrand", "Add Brand")}
            onAction={openNew}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedBrands.map((b: any) => {
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-base transition-transform group-hover:scale-105">
                          {b.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {b.products} {b.products === 1 ? t("product", "Product") : t("products", "Products")}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {b.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("trademarkBrand", "Trademark & Brand")}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(b)}
                        className="h-8 text-xs font-semibold"
                      >
                        <Pencil className="size-3.5 mr-1" /> {t("edit", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(b.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredBrands.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredBrands.length}
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
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("brandName", "Brand Name")}</TableHead>
                    <TableHead>{t("catalogItems", "Catalog Items")}</TableHead>
                    <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBrands.map((b: any) => (
                    <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                            {b.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground">{b.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {b.products} {t("products", "products")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(b)}
                            className="h-8 text-xs font-semibold"
                          >
                            <Pencil className="size-3.5 mr-1" /> {t("edit", "Edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(b.id)}
                            className="h-8 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredBrands.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredBrands.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={modalOpen} onOpenChange={setModalOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {editingBrand ? t("editBrand", "Edit Brand") : t("addBrand", "Add Brand")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("manageBrandsDesc", "Manage manufacturer label and product brand identifiers.")}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brand-name" className="text-xs font-semibold">
                    {t("brandName", "Brand Name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="brand-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearBrandError("name");
                    }}
                    placeholder="e.g. Apple, Samsung, Nike, Nestle"
                    className={brandErrors.name ? "border-destructive" : ""}
                  />
                  <FieldError message={brandErrors.name} />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {editingBrand ? t("saveBrand", "Update Brand") : t("saveBrand", "Create Brand")}
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

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
                  {t("deleteBrand", "Delete Brand")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete this brand? Products linked to this brand will
                  remain intact.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel", "Cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              {t("delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
