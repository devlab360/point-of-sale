import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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
  head: () => ({ meta: [{ title: "Brands · Grocer.Pro" }] }),
  component: BrandsPage,
});

function BrandsPage() {
  const rawBrands = useLiveQuery(() => localDb.brands.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  
  const brandsWithCounts = useMemo(() => {
    return rawBrands.map(b => ({
      ...b,
      products: products.filter(p => p.brand === b.name).length
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

  const brands = useMemo(() => {
    let filtered = brandsWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(b => b.name.toLowerCase().includes(lower));
    }
    return filtered;
  }, [brandsWithCounts, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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

  const { errors: brandErrors, validate: validateBrand, clearError: clearBrandError, clearAll: clearBrandAll } = useFormValidation({
    name: { required: "Brand name is required" },
  });

  const save = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const isValid = validateBrand({ name });
    if (!isValid) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (editingBrand) {
        await localDb.brands.update(editingBrand.id, { name });
        toast.success("Brand updated");
      } else {
        await localDb.brands.add({
          id: uuidv4(),
          name,
          products: 0,
        });
        toast.success("Brand created");
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
      await localDb.brands.delete(deleteId);
      toast.success("Brand deleted");
    } catch (error) {
      toast.error("Failed to delete brand");
    } finally {
      setDeleteId(null);
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
      >
        {brands.length === 0 ? (
          <EmptyState 
            icon={Tag} 
            title="No brands found" 
            description={search ? "Try adjusting your search." : "You haven't created any brands yet."} 
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Products</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedBrands.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {b.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.products || 0}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-success/10 text-success hover:bg-success/15">Active</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(b)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(b.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) { setModalOpen(false); clearBrandAll(); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} noValidate>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name" value={name}
                  onChange={(e) => { setName(e.target.value); clearBrandError("name"); }}
                  placeholder="e.g. Nestle"
                  className={brandErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={brandErrors.name} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); clearBrandAll(); }}>Cancel</Button>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

