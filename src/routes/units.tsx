import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { localDb } from "@/lib/db";
import { PersistStore } from "@/lib/session-store";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units · Grocer.Pro" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  const rawUnits = useLiveQuery(() => localDb.units.filter(u => !u._deleted).toArray()) || [];
  const products = useLiveQuery(() => localDb.products.filter(p => !p._deleted).toArray()) || [];

  const unitsWithCounts = useMemo(() => {
    return rawUnits.map(u => ({
      ...u,
      products: products.filter(p => p.unit === u.id || p.unit === u.name).length
    }));
  }, [rawUnits, products]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
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

  const units = useMemo(() => {
    let filtered = unitsWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(lower) || u.short.toLowerCase().includes(lower));
    }
    if (filters.usage === "in-use") {
      filtered = filtered.filter(u => u.products > 0);
    } else if (filters.usage === "empty") {
      filtered = filtered.filter(u => u.products === 0);
    }
    return filtered;
  }, [unitsWithCounts, debouncedSearch, filters.usage]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(units.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [units.length, page]);

  const totalPages = Math.ceil(units.length / itemsPerPage);
  const paginatedUnits = units.slice((page - 1) * itemsPerPage, page * itemsPerPage);


  const openNew = () => {
    setEditingUnit(null);
    setName("");
    setShort("");
    setModalOpen(true);
  };

  const openEdit = (unit: any) => {
    setEditingUnit(unit);
    setName(unit.name);
    setShort(unit.short);
    setModalOpen(true);
  };

  const { errors: unitErrors, validate: validateUnit, clearError: clearUnitError, clearAll: clearUnitAll } = useFormValidation({
    name: { required: "Unit name is required" },
    short: { required: "Short code is required" },
  });

  const save = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const isValid = validateUnit({ name, short });
    if (!isValid) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (editingUnit) {
        await localDb.units.update(editingUnit.id, { name, short, synced: false });
        toast.success("Unit updated");
      } else {
        await localDb.units.add({
          id: uuidv4(),
          orgId: PersistStore.getOrgId() || "default",
          name,
          short,
          synced: false
        });
        toast.success("Unit created");
      }
      setModalOpen(false);
      clearUnitAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.units.update(deleteId, { _deleted: true, synced: false });
      toast.success("Unit deleted");
    } catch (error) {
      toast.error("Failed to delete unit");
    } finally {
      setDeleteId(null);
    }
  };


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Units of Measure"
        description="Define how products are sold — piece, kilogram, litre, pack and more."
        primaryAction={{ label: "New Unit", onClick: openNew }}
        searchPlaceholder="Search units..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawUnits.length === 0}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Usage Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Units" },
                    { value: "in-use", label: "In Use (Has products)" },
                    { value: "empty", label: "Empty (No products)" },
                  ]}
                  value={draftFilters.usage}
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, usage: val }))}
                  placeholder="Filter by Usage"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button className="w-full" onClick={() => { setFilters(draftFilters); close(); }}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {units.length === 0 ? (
          <EmptyState 
            icon={Scale} 
            title="No units found" 
            description={search ? "Try adjusting your search." : "You haven't created any units yet."} 
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Unit</th>
                      <th className="px-4 py-3 whitespace-nowrap">Short code</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-border">
                  {paginatedUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 group">
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{u.short}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(u)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(u.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) { setModalOpen(false); clearUnitAll(); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "New Unit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} noValidate>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name" value={name}
                    onChange={(e) => { setName(e.target.value); clearUnitError("name"); }}
                    placeholder="e.g. Kilogram"
                    className={unitErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={unitErrors.name} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="short">Short Code <span className="text-destructive">*</span></Label>
                  <Input
                    id="short" value={short}
                    onChange={(e) => { setShort(e.target.value); clearUnitError("short"); }}
                    placeholder="e.g. kg"
                    className={unitErrors.short ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={unitErrors.short} />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); clearUnitAll(); }}>Cancel</Button>
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
              This action cannot be undone. This will permanently delete the unit.
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

