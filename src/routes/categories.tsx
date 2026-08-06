import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Tag, Trash2, Plus, LayoutGrid, Loader2 } from "lucide-react";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { IconPicker } from "@/components/ui/icon-picker";
import * as LucideIcons from "lucide-react";

import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategoriesFn,
  createCategoryFn,
  updateCategoryFn,
  deleteCategoryFn,
} from "@/api/categories";
import { getProductsFn } from "@/api/products";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
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
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories · NexisPOS" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
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
  const rawCategories = rawCategoriesData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const categoriesWithCounts = useMemo(() => {
    return rawCategories.map((c) => ({
      ...c,
      count: products.filter((p) => p.category === c.name || p.category === c.id).length,
    }));
  }, [rawCategories, products]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("ShoppingCart");
  const [color, setColor] = useState("var(--color-primary)");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({ usage: "" });
  const [draftFilters, setDraftFilters] = useState({ usage: "" });
  const activeFilterCount = filters.usage ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ usage: "" });
    setDraftFilters({ usage: "" });
  };

  const PREDEFINED_COLORS = [
    { value: "var(--color-primary)", label: "Primary (Brand)" },
    { value: "var(--color-info)", label: "Blue (Info)" },
    { value: "var(--color-success)", label: "Green (Success)" },
    { value: "var(--color-warning)", label: "Orange (Warning)" },
    { value: "var(--color-destructive)", label: "Red (Destructive)" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
    { value: "#14b8a6", label: "Teal" },
  ];

  const categories = useMemo(() => {
    let filtered = categoriesWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(lower));
    }
    if (filters.usage === "in-use") {
      filtered = filtered.filter((c) => c.count > 0);
    } else if (filters.usage === "empty") {
      filtered = filtered.filter((c) => c.count === 0);
    }
    return filtered;
  }, [categoriesWithCounts, debouncedSearch, filters.usage]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(categories.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [categories.length, page]);

  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const paginatedCategories = categories.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const openNew = () => {
    setEditingCat(null);
    setName("");
    setIcon("ShoppingCart");
    setColor("var(--color-primary)");
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingCat(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setModalOpen(true);
  };

  const {
    errors: catErrors,
    validate: validateCat,
    clearError: clearCatError,
    clearAll: clearCatAll,
  } = useFormValidation({
    name: { required: "Category name is required" },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateCat({ name });
    if (!isValid) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      if (editingCat) {
        const res = await updateCategoryFn({
          data: { id: editingCat.id, category: { name, icon, color } },
        } as any);
        if (res?.success) {
          toast.success("Category updated");
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createCategoryFn({
          data: {
            category: { id: uuidv4(), organizationId: PersistStore.getOrgId(), name, icon, color },
          },
        } as any);
        if (res?.success) {
          toast.success("Category created");
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        } else throw new Error(res?.error);
      }
      setModalOpen(false);
      clearCatAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteCategoryFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Category deleted");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } else throw new Error(res?.error);
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(rawCategories, [
      { key: 'name', label: 'Category Name' },
      { key: 'description', label: 'Description' }
    ], 'categories');
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
        if (row['Category Name']) {
          await createCategoryFn({ 
            data: { 
              category: { 
                id: uuidv4(), 
                name: row['Category Name'],
                description: row['Description'] || '',
                color: 'bg-primary/10',
                icon: 'Tag'
              } 
            } 
          });
          count++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Successfully imported ${count} categories`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Categories"
        description="Group products into shoppable sections used across POS, reports, and promotions."
        primaryAction={{ label: "New Category", onClick: openNew }}
        searchPlaceholder="Search categories..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawCategories.length === 0}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        onExport={handleExport}
        onImport={handleImport}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Usage Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Categories" },
                    { value: "in-use", label: "In Use (Has products)" },
                    { value: "empty", label: "Empty (No products)" },
                  ]}
                  value={draftFilters.usage}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, usage: val }))}
                  placeholder="Filter by Usage"
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
        {isCategoriesLoading ? (
          <TableSkeleton columns={3} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isCategoriesError ? (
          <ErrorState onRetry={refetchCategories} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No categories found"
            description={
              search ? "Try adjusting your search." : "You haven't created any categories yet."
            }
            actionLabel="Add Category"
            onAction={() => {
              setEditingCat(null);
              setName("");
              setModalOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedCategories.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated"
                >
                  <div
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
                    style={{ background: `color-mix(in oklch, ${c.color} 18%, transparent)` }}
                  >
                    {c.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.count || 0} products</div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={categories.length}
              className="rounded-xl border"
            />
          </div>
        )}
      </DataPage>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false);
            clearCatAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} noValidate>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearCatError("name");
                  }}
                  placeholder="e.g. Beverages"
                  className={
                    catErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={catErrors.name} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="icon">Category Icon</Label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="color">Theme Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger id="color">
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3.5 rounded-full border border-border"
                              style={{ backgroundColor: c.value }}
                            />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  clearCatAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save changes
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
              This action cannot be undone. This will permanently delete the category.
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
    </div>
  );
}
