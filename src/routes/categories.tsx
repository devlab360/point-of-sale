import { createFileRoute } from "@tanstack/react-router";
import {
  Pencil,
  Tag,
  Trash2,
  Plus,
  LayoutGrid,
  Loader2,
  Search,
  Package,
  Layers,
  Table as TableIcon,
  CheckCircle2,
  Palette,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { appName } from "@/lib/env";
import { IconPicker } from "@/components/ui/icon-picker";
import { useLanguage } from "@/contexts/LanguageContext";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategoriesFn,
  createCategoryFn,
  updateCategoryFn,
  deleteCategoryFn,
} from "@/api/categories";
import { getProductsFn } from "@/api/products";
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

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: `Product Categories · ${appName}` }] }),
  component: CategoriesPage,
});

const PREDEFINED_COLORS = [
  { value: "#3b82f6", label: "Blue", bg: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  {
    value: "#10b981",
    label: "Emerald",
    bg: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  { value: "#f59e0b", label: "Amber", bg: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  {
    value: "#8b5cf6",
    label: "Purple",
    bg: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  },
  { value: "#ec4899", label: "Pink", bg: "bg-pink-500/15 text-pink-600 border-pink-500/30" },
  { value: "#14b8a6", label: "Teal", bg: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  { value: "#ef4444", label: "Rose", bg: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  {
    value: "#6366f1",
    label: "Indigo",
    bg: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  },
];

function CategoriesPage() {
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawCategoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const rawCategories = Array.isArray(rawCategoriesData) ? rawCategoriesData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const categoriesWithCounts = useMemo(() => {
    return rawCategories.map((c: any) => ({
      ...c,
      count: products.filter((p: any) => p.category === c.name || p.category === c.id).length,
    }));
  }, [rawCategories, products]);

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("ShoppingCart");
  const [color, setColor] = useState("#3b82f6");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [usageFilter, setUsageFilter] = useState<"all" | "in_use" | "unused">("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // KPI Calculations
  const totalCategories = categoriesWithCounts.length;
  const inUseCount = useMemo(
    () => categoriesWithCounts.filter((c) => c.count > 0).length,
    [categoriesWithCounts],
  );
  const totalLinkedProducts = useMemo(
    () => categoriesWithCounts.reduce((sum, c) => sum + c.count, 0),
    [categoriesWithCounts],
  );

  const filteredCategories = useMemo(() => {
    let list = categoriesWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((c: any) => c.name?.toLowerCase().includes(lower));
    }
    if (usageFilter === "in_use") list = list.filter((c: any) => c.count > 0);
    if (usageFilter === "unused") list = list.filter((c: any) => c.count === 0);
    return list;
  }, [categoriesWithCounts, debouncedSearch, usageFilter]);

  const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page, pageSize]);

  const {
    errors: catErrors,
    validate: validateCat,
    clearError: clearCatError,
    clearAll: clearCatAll,
  } = useFormValidation({
    name: { required: "Category name is required" },
  });

  const openNew = () => {
    setEditingCat(null);
    setName("");
    setIcon("");
    setColor("");
    clearCatAll();
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingCat(cat);
    setName(cat.name || "");
    setIcon(cat.icon || "");
    setColor(cat.color || "");
    clearCatAll();
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateCat({ name: name.trim() });
    if (!isValid) return;

    setIsSaving(true);
    try {
      if (editingCat) {
        const res = (await updateCategoryFn({
          data: {
            id: editingCat.id,
            updates: { name: name.trim(), icon, color },
          },
        })) as any;
        if (res?.success) {
          toast.success(t("categoryUpdatedSuccess", "Category updated successfully"));
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["categories", orgId] });
        } else throw new Error(res?.error);
      } else {
        const res = (await createCategoryFn({
          data: {
            category: {
              id: uuidv4(),
              name: name.trim(),
              icon,
              color,
            },
          },
        })) as any;
        if (res?.success) {
          toast.success(t("categoryAddedToCatalog", "Category added to catalog"));
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["categories", orgId] });
        } else throw new Error(res?.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = (await deleteCategoryFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success(t("categoryDeleted", "Category deleted"));
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["categories", orgId] });
        } else throw new Error(res?.error);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete category");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("productCategories", "Product Categories")}
        description={t("manageCategoriesDesc", "Group inventory items into structured departments and color-coded touch buttons for POS terminal registers.")}
        actions={
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="size-4" /> {t("addCategory", "Add Category")}
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalCategories", "Total Categories")}
          value={String(totalCategories)}
          hint={t("taxonomyDepartments", "Taxonomy departments")}
          icon={Layers}
          accent="primary"
        />
        <StatCard
          label={t("inUseDepartments", "In-Use Departments")}
          value={String(inUseCount)}
          hint={t("hasLinkedSkus", "Has linked SKUs")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("linkedProducts", "Linked Products")}
          value={`${totalLinkedProducts} ${t("items", "items")}`}
          hint={t("assignedInCatalog", "Assigned in catalog")}
          icon={Package}
          accent="info"
        />
        <StatCard
          label={t("posQuickTiles", "POS Quick Tiles")}
          value="100% Configured"
          hint={t("colorCodedButtons", "Color-coded buttons")}
          icon={Palette}
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
              placeholder={t("searchCategories", "Search categories...")}
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
                <SelectItem value="all">{t("allCategoriesCount", "All Categories")} ({totalCategories})</SelectItem>
                <SelectItem value="in_use">{t("inUse", "In Use")} ({inUseCount})</SelectItem>
                <SelectItem value="unused">{t("unused", "Unused")} ({totalCategories - inUseCount})</SelectItem>
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
        {isCategoriesLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={4} rows={6} />
          )
        ) : isCategoriesError ? (
          <ErrorState onRetry={refetchCategories} />
        ) : viewMode === "grid" ? (
          filteredCategories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={t("noCategoriesFound", "No categories found")}
              description={
                search
                  ? t("adjustSearch", "Try adjusting your search criteria.")
                  : t("noCategoriesYet", "You haven't created any product categories yet.")
              }
              actionLabel={t("addCategory", "Add Category")}
              onAction={openNew}
            />
          ) : (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedCategories.map((c: any) => {
                const catIcon = c.icon || "";

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div
                          className="grid size-12 place-items-center rounded-xl transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${c.color || "#3b82f6"}20`,
                            color: c.color || "#3b82f6",
                          }}
                        >
                          {catIcon ? (
                            <span className="text-2xl leading-none">{catIcon}</span>
                          ) : (
                            <Tag className="size-6" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {c.count} {c.count === 1 ? "Product" : "Products"}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {c.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("posTouchDepartment", "POS Touch Department")}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="h-8 text-xs font-semibold"
                      >
                        <Pencil className="size-3.5 mr-1" /> {t("edit", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(c.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredCategories.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCategories.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
          )
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("categoryName", "Category Name")}</TableHead>
                    <TableHead>{t("posColorIcon", "POS Color & Icon")}</TableHead>
                    <TableHead>{t("linkedProducts", "Linked Products")}</TableHead>
                    <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <EmptyState
                          icon={Tag}
                          title={t("noCategoriesFound", "No categories found")}
                          description={
                            search
                              ? t("adjustSearch", "Try adjusting your search criteria.")
                              : t("noCategoriesYet", "You haven't created any product categories yet.")
                          }
                          actionLabel={t("addCategory", "Add Category")}
                          onAction={openNew}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCategories.map((c: any) => {
                    const catIcon = c.icon || "";

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="grid size-8 place-items-center rounded-lg"
                              style={{
                                backgroundColor: `${c.color || "#3b82f6"}20`,
                                color: c.color || "#3b82f6",
                              }}
                            >
                              {catIcon ? (
                                <span className="text-base leading-none">{catIcon}</span>
                              ) : (
                                <Tag className="size-4" />
                              )}
                            </div>
                            <span className="font-semibold text-foreground">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-3 rounded-full border border-black/10"
                              style={{ backgroundColor: c.color || "#e2e8f0" }}
                            />
                            <span className="text-xs font-mono text-muted-foreground">
                              {c.color || "none"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {c.count} {t("items", "items")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(c)}
                              className="h-8 text-xs font-semibold"
                            >
                              <Pencil className="size-3.5 mr-1" /> {t("edit", "Edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(c.id)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }))}
                </TableBody>
              </Table>
            </div>
            {filteredCategories.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCategories.length}
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
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {editingCat ? t("editCategory", "Edit Category") : t("addCategory", "Add Category")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("manageCategoriesDesc", "Configure taxonomy department details and POS register touch styles.")}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category-name" className="text-xs font-semibold">
                    {t("categoryName", "Category Name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearCatError("name");
                    }}
                    placeholder={t("categoryNamePlaceholder", "e.g. Beverages, Electronics, Apparel")}
                    className={catErrors.name ? "border-destructive" : ""}
                  />
                  <FieldError message={catErrors.name} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("categoryIcon", "Category Icon")} (optional)</Label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("buttonColor", "POS Touch Button Color")} (optional)</Label>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setColor("")}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                        color === ""
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-border/60 hover:bg-muted/50"
                      }`}
                    >
                      <span className="grid size-4 place-items-center rounded-full border border-dashed border-foreground/30">
                        <X className="size-2.5 text-muted-foreground" />
                      </span>
                      <span className="truncate">{t("none", "None")}</span>
                    </button>
                    {PREDEFINED_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                          color === c.value
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border/60 hover:bg-muted/50"
                        }`}
                      >
                        <span
                          className="size-4 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: c.value }}
                        />
                        <span className="truncate">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {editingCat ? t("saveCategory", "Update Category") : t("saveCategory", "Create Category")}
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
                  {t("deleteCategory", "Delete Category")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("confirmDeleteCategory", "Are you sure you want to delete this category? Products assigned to it will remain in your catalog.")}
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
