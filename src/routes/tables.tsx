import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";
import { Utensils, Plus, Loader2, Users, CheckCircle2, AlertCircle, Clock, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTablesFn, createTableFn, updateTableStatusFn, deleteTableFn } from "@/api/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/tables")({
  head: () => ({ meta: [{ title: "Restaurant Tables & Floor Plan · OneDesk360" }] }),
  component: TablesPage,
});

function TablesPage() {
  const queryClient = useQueryClient();
  const orgId = PersistStore.getOrgId() || "default";

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tables", orgId],
    queryFn: () => getTablesFn({ data: {} }),
  });

  const rawTables = data?.success ? data.data : [];

  const filteredTables = useMemo(() => {
    let list = rawTables;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((t: any) => t.name?.toLowerCase().includes(lower));
    }
    if (filters.status) {
      list = list.filter((t: any) => t.status === filters.status);
    }
    return list;
  }, [rawTables, debouncedSearch, filters.status]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = rawTables.length;
    const available = rawTables.filter((t: any) => t.status === "available").length;
    const occupied = rawTables.filter((t: any) => t.status === "occupied").length;
    const reserved = rawTables.filter((t: any) => t.status === "reserved").length;
    const totalCapacity = rawTables.reduce((sum: number, t: any) => sum + (Number(t.capacity) || 0), 0);
    return { total, available, occupied, reserved, totalCapacity };
  }, [rawTables]);

  const createTable = useMutation({
    mutationFn: (data: { name: string; capacity: number }) => createTableFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Table created successfully");
        setIsCreateOpen(false);
        setNewTableName("");
        setNewTableCapacity(4);
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      } else {
        toast.error("Failed to create table");
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: string; status: "available" | "occupied" | "reserved" }) =>
      updateTableStatusFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Table status updated");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      } else {
        toast.error("Failed to update status");
      }
    },
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => deleteTableFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Table removed");
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setDeleteId(null);
    },
  });

  const handleCreate = () => {
    if (!newTableName.trim()) {
      toast.error("Table name / number is required");
      return;
    }
    createTable.mutate({ name: newTableName.trim(), capacity: newTableCapacity });
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Restaurant Floor Plan & Tables"
        description="Real-time table seating capacity, dine-in status, and reservations."
        primaryAction={{ label: "Add Table", onClick: () => setIsCreateOpen(true) }}
        searchPlaceholder="Search tables..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[40vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Tables" },
                    { value: "available", label: "Available (Free)" },
                    { value: "occupied", label: "Occupied (Dining)" },
                    { value: "reserved", label: "Reserved" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full font-bold shadow-soft"
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
      topContent={
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Tables
                  </p>
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Utensils className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">
                  {metrics.total} <span className="text-xs font-normal text-muted-foreground">({metrics.totalCapacity} seats)</span>
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-success/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Available (Free)
                  </p>
                  <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-success">
                  {metrics.available}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-rose-500/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Occupied (Dining)
                  </p>
                  <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Users className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  {metrics.occupied}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-amber-500/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reserved
                  </p>
                  <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="size-4" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {metrics.reserved}
                </p>
              </div>
            </div>
          }
        >
        <div className="space-y-6">
          {/* Tables Grid Layout */}
          {isLoading ? (
            <CardGridSkeleton cards={8} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : filteredTables.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-soft p-12 text-center">
              <EmptyState
                icon={Utensils}
                title="No tables found"
                description={
                  search
                    ? "No tables matched your search query."
                    : "Add your first dining table to manage floor seating."
                }
                actionLabel="Add Table"
                onAction={() => setIsCreateOpen(true)}
                className="border-none bg-transparent my-0 py-4 shadow-none"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTables.map((table: any) => {
                const isOccupied = table.status === "occupied";
                const isReserved = table.status === "reserved";

                return (
                  <div
                    key={table.id}
                    className={`relative rounded-2xl border p-5 shadow-soft flex flex-col justify-between transition-all duration-300 group ${
                      isOccupied
                        ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                        : isReserved
                          ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                          : "border-border/80 bg-card hover:border-primary/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`grid size-10 place-items-center rounded-xl font-black text-sm border ${
                              isOccupied
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                : isReserved
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            }`}
                          >
                            {table.name.replace(/[^0-9]/g, "") || "T"}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                              {table.name}
                            </h3>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                              <Users className="size-3" /> Seats: {table.capacity}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isOccupied
                              ? "bg-rose-500/15 text-rose-500 border-rose-500/25"
                              : isReserved
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
                          }`}
                        >
                          {table.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center gap-2">
                      <Select
                        value={table.status}
                        onValueChange={(val: any) =>
                          updateStatus.mutate({ id: table.id, status: val })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger className="h-9 text-xs flex-1 bg-background/80 rounded-xl font-bold">
                          <SelectValue placeholder="Change Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="available" className="text-xs font-bold text-emerald-500">
                            Available (Free)
                          </SelectItem>
                          <SelectItem value="occupied" className="text-xs font-bold text-rose-500">
                            Occupied (Dining)
                          </SelectItem>
                          <SelectItem value="reserved" className="text-xs font-bold text-amber-500">
                            Reserved
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setDeleteId(table.id)}
                        title="Delete Table"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DataPage>

      {/* Add Table Drawer */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Utensils className="size-5 text-primary" />
              <span>Add Restaurant Table</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add floor tables for dine-in seating and kitchen order routing.
            </p>
          </SheetHeader>
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Table Name / Number *</Label>
                <Input
                  placeholder="e.g. Table 1, Window Booth 2, Patio 4"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seating Capacity *</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTable.isPending || !newTableName.trim()}
                className="min-w-[140px]"
              >
                {createTable.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Save Table
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Table Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove this dining table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteTable.mutate(deleteId)}
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
