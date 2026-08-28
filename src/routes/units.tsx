import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUnitsFn, createUnitFn, updateUnitFn, deleteUnitFn } from "@/api/units";
import { getProductsFn } from "@/api/products";
import { PersistStore } from "@/lib/session-store";
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
  Scale,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Search,
  Package,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units of Measurement · OneDesk360" }] }),
  component: UnitsPage,
});

const STANDARD_UNIT_PRESETS = [
  { name: "Pieces", short: "pcs" },
  { name: "Kilograms", short: "kg" },
  { name: "Grams", short: "g" },
  { name: "Liters", short: "ltr" },
  { name: "Milliliters", short: "ml" },
  { name: "Boxes", short: "box" },
  { name: "Packs", short: "pack" },
  { name: "Dozens", short: "doz" },
  { name: "Meters", short: "m" },
];

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
  const rawUnits = Array.isArray(rawUnitsData) ? rawUnitsData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => ((await getProductsFn({ data: {} })) as any)?.data || [],
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const unitsWithCounts = useMemo(() => {
    return rawUnits.map((u: any) => ({
      ...u,
      products: products.filter((p: any) => p.unit === u.id || p.unit === u.name || p.unit === u.short).length,
    }));
  }, [rawUnits, products]);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // KPI Calculations
  const totalUnits = unitsWithCounts.length;
  const inUseCount = useMemo(() => unitsWithCounts.filter((u) => u.products > 0).length, [unitsWithCounts]);
  const totalLinkedItems = useMemo(() => unitsWithCounts.reduce((sum, u) => sum + u.products, 0), [unitsWithCounts]);

  const filteredUnits = useMemo(() => {
    let list = unitsWithCounts;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (u: any) => u.name?.toLowerCase().includes(lower) || u.short?.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [unitsWithCounts, debouncedSearch]);

  const totalPages = Math.ceil(filteredUnits.length / pageSize) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, page, pageSize]);

  const {
    errors: unitErrors,
    validate: validateUnit,
    clearError: clearUnitError,
    clearAll: clearUnitAll,
  } = useFormValidation({
    name: { required: "Unit name is required" },
    short: { required: "Abbreviation is required" },
  });

  const openNew = () => {
    setEditingUnit(null);
    setName("");
    setShort("");
    clearUnitAll();
    setModalOpen(true);
  };

  const openEdit = (unit: any) => {
    setEditingUnit(unit);
    setName(unit.name || "");
    setShort(unit.short || "");
    clearUnitAll();
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateUnit({ name: name.trim(), short: short.trim() });
    if (!isValid) return;

    setIsSaving(true);
    try {
      if (editingUnit) {
        const res = (await updateUnitFn({
          data: {
            id: editingUnit.id,
            updates: { name: name.trim(), short: short.trim() },
          },
        })) as any;
        if (res?.success) {
          toast.success("Unit updated successfully");
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["units", orgId] });
        } else throw new Error(res?.error);
      } else {
        const res = (await createUnitFn({
          data: {
            unit: {
              id: uuidv4(),
              name: name.trim(),
              short: short.trim(),
            },
          },
        })) as any;
        if (res?.success) {
          toast.success("Unit added to system");
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["units", orgId] });
        } else throw new Error(res?.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save unit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = (await deleteUnitFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success("Unit deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["units", orgId] });
        } else throw new Error(res?.error);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete unit");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Units of Measurement (UOM)"
        description="Standardize quantity packaging, bulk measurement scales, and stock unit conversions."
        actions={
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="size-4" /> Add Unit
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Units (UOM)"
          value={String(totalUnits)}
          hint="Registered units"
          icon={Scale}
          accent="primary"
        />
        <StatCard
          label="Active in Use"
          value={String(inUseCount)}
          hint="Has linked SKUs"
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Linked Catalog SKUs"
          value={`${totalLinkedItems} items`}
          hint="Inventory products"
          icon={Package}
          accent="info"
        />
        <StatCard
          label="Standard Presets"
          value="9 Available"
          hint="Common packaging scales"
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
              placeholder="Search units or abbreviations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm self-end sm:self-auto">
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
          </div>
        </div>

        {/* Content View */}
        {isUnitsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={4} rows={6} />
          )
        ) : isUnitsError ? (
          <ErrorState onRetry={refetchUnits} />
        ) : filteredUnits.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No units found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't created any measurement units yet."
            }
            actionLabel="Add Unit"
            onAction={openNew}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedUnits.map((u: any) => {
                return (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm transition-transform group-hover:scale-105">
                          {u.short}
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {u.products} {u.products === 1 ? "Product" : "Products"}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {u.name}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          Symbol: <span className="font-bold text-foreground">{u.short}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(u)}
                        className="h-8 text-xs font-semibold"
                      >
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(u.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredUnits.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredUnits.length}
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
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Name</TableHead>
                    <TableHead>Symbol / Abbreviation</TableHead>
                    <TableHead>Catalog Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUnits.map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-foreground">{u.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-bold">
                          {u.short}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {u.products} products
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="h-8 text-xs font-semibold"
                          >
                            <Pencil className="size-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(u.id)}
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
            {filteredUnits.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredUnits.length}
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
                {editingUnit ? "Edit Unit of Measurement" : "Add New Unit"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Define packaging dimensions and retail measurement scales.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Standard Presets */}
                {!editingUnit && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Quick Presets</Label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {STANDARD_UNIT_PRESETS.map((preset) => (
                        <button
                          key={preset.short}
                          type="button"
                          onClick={() => {
                            setName(preset.name);
                            setShort(preset.short);
                            clearUnitAll();
                          }}
                          className="px-2.5 py-1 rounded-lg border border-border/70 text-xs font-semibold hover:bg-muted/60 transition-colors"
                        >
                          {preset.name} ({preset.short})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="unit-name" className="text-xs font-semibold">
                    Unit Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unit-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearUnitError("name");
                    }}
                    placeholder="e.g. Kilograms, Liters, Boxes"
                    className={unitErrors.name ? "border-destructive" : ""}
                  />
                  <FieldError message={unitErrors.name} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit-short" className="text-xs font-semibold">
                    Abbreviation / Symbol <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unit-short"
                    value={short}
                    onChange={(e) => {
                      setShort(e.target.value);
                      clearUnitError("short");
                    }}
                    placeholder="e.g. kg, ltr, box, pcs"
                    className={unitErrors.short ? "border-destructive" : ""}
                  />
                  <FieldError message={unitErrors.short} />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {editingUnit ? "Update Unit" : "Create Unit"}
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
                  Delete Unit of Measurement
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete this unit? Linked products will keep their unit assignment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
