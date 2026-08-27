import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUnitsFn, createUnitFn, updateUnitFn, deleteUnitFn } from "@/api/units";
import { getProductsFn } from "@/api/products";
import { PersistStore } from "@/lib/session-store";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units · OneDesk360" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawUnitsData,
    isLoading: isUnitsLoading,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => ((await getUnitsFn({ data: {} })) as any)?.data || [],
  });
  const rawUnits = rawUnitsData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = productsData || [];

  const unitsWithCounts = useMemo(() => {
    return rawUnits.map((u) => ({
      ...u,
      products: products.filter((p) => p.unit === u.id || p.unit === u.name).length,
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
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(lower) || u.short.toLowerCase().includes(lower),
      );
    }
    if (filters.usage === "in-use") {
      filtered = filtered.filter((u) => u.products > 0);
    } else if (filters.usage === "empty") {
      filtered = filtered.filter((u) => u.products === 0);
    }
    return filtered;
  }, [unitsWithCounts, debouncedSearch, filters.usage]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.usage]);

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

  const {
    errors: unitErrors,
    validate: validateUnit,
    clearError: clearUnitError,
    clearAll: clearUnitAll,
  } = useFormValidation({
    name: { required: "Unit name is required" },
    short: { required: "Short code is required" },
  });

  const save = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const isValid = validateUnit({ name, short });
    if (!isValid) return;

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      if (editingUnit) {
        const res = await updateUnitFn({ data: { id: editingUnit.id, updates: { name, short } } });
        if (res?.success) toast.success("Unit updated");
        else throw new Error(res?.error);
      } else {
        const res = await createUnitFn({
          data: {
            unit: {
              name,
              short,
            },
          },
        });
        if (res?.success) toast.success("Unit created");
        else throw new Error(res?.error);
      }
      queryClient.invalidateQueries({ queryKey: ["units"] });
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
      const res = await deleteUnitFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Unit deleted");
        queryClient.invalidateQueries({ queryKey: ["units"] });
      } else throw new Error(res?.error);
    } catch (error) {
      toast.error("Failed to delete unit");
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawUnits,
      [
        { key: "name", label: "Unit Name" },
        { key: "shortName", label: "Short Name" },
      ],
      "units",
    );
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
        if (row["Unit Name"]) {
          await createUnitFn({
            data: {
              unit: {
                id: uuidv4(),
                name: row["Unit Name"],
                shortName: row["Short Name"] || "",
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(`Successfully imported ${count} units`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div>
      <DataPage
        title="Units of Measure"
        description="Define how products are sold — piece, kilogram, litre, pack and more."
        primaryAction={{ label: "New Unit", onClick: openNew }}
        searchPlaceholder="Search units..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Unit Usage</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Units" },
                    { value: "in-use", label: "In Use (Has Products)" },
                    { value: "empty", label: "Empty (No Products)" },
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
        {isUnitsLoading ? (
          <TableSkeleton columns={3} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isUnitsError ? (
          <ErrorState onRetry={refetchUnits} />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Name</TableHead>
                      <TableHead>Short Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUnits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center">
                          <EmptyState
                            icon={Scale}
                            title="No units found"
                            description={
                              search ? "Try adjusting your search." : "You haven't created any units yet."
                            }
                            actionLabel="Add Unit"
                            onAction={() => {
                              setEditingUnit(null);
                              setName("");
                              setShort("");
                              setModalOpen(true);
                            }}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUnits.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-bold text-foreground whitespace-nowrap">
                            {u.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap font-bold">
                            <span className="rounded-md bg-muted px-2 py-0.5 border border-border/50">
                              {u.short}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(u.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards View (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {paginatedUnits.length === 0 ? (
                  <EmptyState
                    icon={Scale}
                    title="No units found"
                    description={
                      search ? "Try adjusting your search." : "You haven't created any units yet."
                    }
                    actionLabel="Add Unit"
                    onAction={() => {
                      setEditingUnit(null);
                      setName("");
                      setShort("");
                      setModalOpen(true);
                    }}
                    className="border-none bg-transparent my-0 py-6 shadow-none"
                  />
                ) : (
                  paginatedUnits.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    >
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-foreground">{u.name}</div>
                        <span className="inline-block mt-1 font-mono text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/50">
                          {u.short}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {units.length > 0 && (
                <div className="border-t border-border/60 p-2 sm:p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={units.length}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      {/* Add / Edit Unit Drawer */}
      <Sheet
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false);
            clearUnitAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold text-foreground">
              {editingUnit ? "Edit Measurement Unit" : "Add New Unit"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define standard measurement units and abbreviations for products.
            </p>
          </SheetHeader>
          <form
            onSubmit={save}
            noValidate
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Unit Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearUnitError("name");
                    }}
                    placeholder="e.g. Kilogram"
                    className={
                      unitErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  <FieldError message={unitErrors.name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="short">
                    Short Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="short"
                    value={short}
                    onChange={(e) => {
                      setShort(e.target.value);
                      clearUnitError("short");
                    }}
                    placeholder="e.g. kg, pcs, ltr"
                    className={
                      unitErrors.short ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  <FieldError message={unitErrors.short} />
                </div>
              </div>
            </div>
            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  clearUnitAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="min-w-[130px]">
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Unit
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

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
