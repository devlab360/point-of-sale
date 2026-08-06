import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrandsFn, createBrandFn, updateBrandFn, deleteBrandFn } from "@/api/brands";
import { getProductsFn } from "@/api/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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

export const Route = createFileRoute("/brands")({
  head: () => ({ meta: [{ title: "Brands · NexisPOS" }] }),
  component: BrandsPage,
});

function BrandsPage() {
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
  const rawBrands = rawBrandsData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const brandsWithCounts = useMemo(() => {
    return rawBrands.map((b) => ({
      ...b,
      products: products.filter((p) => p.brand === b.name).length,
    }));
  }, [rawBrands, products]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const brands = useMemo(() => {
    let filtered = brandsWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(lower));
    }
    if (filters.usage === "in-use") {
      filtered = filtered.filter((b) => b.products > 0);
    } else if (filters.usage === "empty") {
      filtered = filtered.filter((b) => b.products === 0);
    }
    return filtered;
  }, [brandsWithCounts, debouncedSearch, filters.usage]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.usage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(brands.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [brands.length, page]);

  const totalPages = Math.ceil(brands.length / itemsPerPage);
  const paginatedBrands = brands.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const openNew = () => {
    setEditingBrand(null);
    setName("");
    setModalOpen(true);
  };

  const openEdit = (brand: any) => {
    setEditingBrand(brand);
    setName(brand.name);
    setModalOpen(true);
  };

  const {
    errors: brandErrors,
    validate: validateBrand,
    clearError: clearBrandError,
    clearAll: clearBrandAll,
  } = useFormValidation({
    name: { required: "Brand name is required" },
  });

  const save = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const isValid = validateBrand({ name });
    if (!isValid) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      if (editingBrand) {
        const res = await updateBrandFn({ data: { id: editingBrand.id, updates: { name } } });
        if (res?.success) {
          toast.success("Brand updated");
          queryClient.invalidateQueries({ queryKey: ["brands"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createBrandFn({ data: { brand: { id: uuidv4(), name: name } } });
        if (res?.success) {
          toast.success("Brand created");
          queryClient.invalidateQueries({ queryKey: ["brands"] });
        } else throw new Error(res?.error);
      }
      setModalOpen(false);
      clearBrandAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteBrandFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Brand deleted");
        queryClient.invalidateQueries({ queryKey: ["brands"] });
      } else throw new Error(res?.error);
    } catch (error) {
      toast.error("Failed to delete brand");
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(rawBrands, [{ key: 'name', label: 'Brand Name' }], 'brands');
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
        if (row['Brand Name']) {
          await createBrandFn({ data: { brand: { id: uuidv4(), name: row['Brand Name'] } } });
          count++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(`Successfully imported ${count} brands`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Brands"
        description="Track suppliers' brands and surface them in product search and filters."
        primaryAction={{ label: "Add Brand", onClick: openNew }}
        searchPlaceholder="Search brands..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawBrands.length === 0}
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
                    { value: "", label: "All Brands" },
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
        {isBrandsLoading ? (
          <TableSkeleton columns={3} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isBrandsError ? (
          <ErrorState onRetry={refetchBrands} />
        ) : brands.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No brands found"
            description={
              search ? "Try adjusting your search." : "You haven't created any brands yet."
            }
            actionLabel="Add Brand"
            onAction={() => {
              setEditingBrand(null);
              setName("");
              setModalOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Brand</th>
                        <th className="px-4 py-3 whitespace-nowrap">Products</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedBrands.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30 group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                {b.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold">{b.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {b.products || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className="bg-success/10 text-success hover:bg-success/15">
                              Active
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openEdit(b)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                onClick={() => setDeleteId(b.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={brands.length}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false);
            clearBrandAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} noValidate>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">
                  Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearBrandError("name");
                  }}
                  placeholder="e.g. Nestle"
                  className={
                    brandErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                />
                <FieldError message={brandErrors.name} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  clearBrandAll();
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
              This action cannot be undone. This will permanently delete the brand.
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
