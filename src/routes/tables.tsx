import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Utensils,
  Plus,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  BedDouble,
  DoorOpen,
  Receipt,
  CreditCard,
  Search,
  Filter,
  X,
  TableIcon,
  LayoutGrid,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTablesFn, createTableFn, updateTableStatusFn, deleteTableFn } from "@/api/restaurant";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { TABLE_STATUSES } from "@/constants";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/tables")({
  head: () => ({ meta: [{ title: `Restaurant Tables & Floor Plan · ${appName}` }] }),
  component: TablesPage,
});

function TablesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const orgId = PersistStore.getOrgId() || "default";
  const { currencySymbol } = useCurrency();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Hotel Room Folio State
  const [selectedRoomForFolio, setSelectedRoomForFolio] = useState<any | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNights, setGuestNights] = useState(1);
  const [guestRoomRate, setGuestRoomRate] = useState(120);
  const [guestRoomServiceAmt, setGuestRoomServiceAmt] = useState(0);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tables", orgId],
    queryFn: () => getTablesFn({ data: {} }),
  });

  const rawTables = Array.isArray((data as any)?.data) ? (data as any).data : [];

  const filteredTables = useMemo(() => {
    let list = [...rawTables];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((t: any) => t.name?.toLowerCase().includes(q));
    }
    if (filters.status) {
      list = list.filter((t: any) => t.status === filters.status);
    }
    return list;
  }, [rawTables, debouncedSearch, filters]);

  const metrics = useMemo(() => {
    const total = rawTables.length;
    const available = rawTables.filter((t: any) => t.status === "available").length;
    const occupied = rawTables.filter((t: any) => t.status === "occupied").length;
    const reserved = rawTables.filter((t: any) => t.status === "reserved").length;
    return { total, available, occupied, reserved };
  }, [rawTables]);

  const createTable = useMutation({
    mutationFn: ({ name, capacity }: { name: string; capacity: number }) =>
      createTableFn({
        data: {
          name,
          capacity,
        },
      }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Table created successfully");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        setIsCreateOpen(false);
        setNewTableName("");
        setNewTableCapacity(4);
      } else {
        toast.error(res?.error || "Failed to create table");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create table"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      updateTableStatusFn({ data: { id, status } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Status updated");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      } else {
        toast.error(res?.error || "Failed to update status");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update status"),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => deleteTableFn({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Table deleted");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        setDeleteId(null);
      } else {
        toast.error(res?.error || "Failed to delete table");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete table"),
  });

  const handleCreate = () => {
    if (!newTableName.trim()) return;
    createTable.mutate({
      name: newTableName.trim(),
      capacity: Number(newTableCapacity),
    });
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("restaurantTablesRooms", "Restaurant Floor Tables & Hotel Rooms")}
        description={t(
          "restaurantTablesRoomsDesc",
          "Live floor plan status, occupancy tracking, and itemized hotel room folio check-in/out.",
        )}
        actions={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="shadow-soft">
            <Plus className="size-4 mr-1.5" />
            {t("addTable", "Add Table")}
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalCapacity", "Total Tables")}
          value={String(metrics.total)}
          icon={Utensils}
          accent="primary"
        />
        <StatCard
          label={t("availableFree", "Available (Free)")}
          value={String(metrics.available)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("occupiedDining", "Occupied (Dining)")}
          value={String(metrics.occupied)}
          icon={Users}
          accent="destructive"
        />
        <StatCard
          label={t("reserved", "Reserved")}
          value={String(metrics.reserved)}
          icon={Clock}
          accent="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchTablesPlaceholder", "Search tables by name...")}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5 mr-1" />
              {t("clearFilters", "Clear")}
            </Button>
          )}

          <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 relative">
                <Filter className="size-3.5 mr-1.5" />
                {t("filters", "Filters")}
                {activeFilterCount > 0 && (
                  <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
              <SheetHeader className="p-5 border-b pr-12 text-left shrink-0">
                <SheetTitle className="text-lg font-bold">{t("filterTables", "Filter Tables")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("status", "Status")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allTables", "All Tables") },
                      ...TABLE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                    ]}
                    value={draftFilters.status}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                    placeholder={t("filterByStatus", "Filter by Status")}
                  />
                </div>
              </div>
              <div className="border-t p-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 font-bold text-xs"
                  onClick={handleResetFilters}
                >
                  {t("reset", "Reset")}
                </Button>
                <Button
                  className="flex-1 font-bold text-xs"
                  onClick={() => {
                    setFilters(draftFilters);
                    setFilterDrawerOpen(false);
                  }}
                >
                  {t("applyFilters", "Apply Filters")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

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
      {isLoading ? (
        viewMode === "grid" ? (
          <CardGridSkeleton cards={8} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
        ) : (
          <TableSkeleton columns={4} rows={6} />
        )
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          {filteredTables.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card shadow-soft">
              <EmptyState
                icon={Utensils}
                title={t("noTablesFound", "No tables found")}
                description={
                  search
                    ? t("noTablesMatchedSearch", "No tables matched your search query.")
                    : t("addFirstDiningTable", "Add your first dining table to manage floor seating.")
                }
                actionLabel={t("addTable", "Add Table")}
                onAction={() => setIsCreateOpen(true)}
                className="border-none bg-transparent my-0 py-12 shadow-none"
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
                            <Users className="size-3" /> {t("seats", "Seats")}: {table.capacity}
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
                        {t(table.status, table.status)}
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
                        <SelectValue placeholder={t("changeStatus", "Change Status")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem
                          value="available"
                          className="text-xs font-bold text-emerald-500"
                        >
                          {t("availableFree", "Available (Free)")}
                        </SelectItem>
                        <SelectItem value="occupied" className="text-xs font-bold text-rose-500">
                          {t("occupiedDining", "Occupied (Guest / Dining)")}
                        </SelectItem>
                        <SelectItem value="reserved" className="text-xs font-bold text-amber-500">
                          {t("reserved", "Reserved")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-2.5 rounded-xl text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => {
                        setSelectedRoomForFolio(table);
                        setGuestName(table.status === "occupied" ? "In-House Guest" : "");
                        setGuestPhone("");
                        setGuestNights(1);
                        setGuestRoomRate(120);
                        setGuestRoomServiceAmt(table.status === "occupied" ? 45.5 : 0);
                      }}
                      title={t("roomFolioAndGuestDetails", "Room Folio & Guest Details")}
                    >
                      <Receipt className="size-3.5" />
                      <span className="hidden sm:inline">{t("folio", "Folio")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDeleteId(table.id)}
                      title={t("deleteTable", "Delete Table")}
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
        ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tableName", "Table Name")}</TableHead>
                  <TableHead>{t("seatingCapacity", "Seating Capacity")}</TableHead>
                  <TableHead>{t("status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <EmptyState
                        icon={Utensils}
                        title={t("noTablesFound", "No tables found")}
                        description={
                          search
                            ? t("noTablesMatchedSearch", "No tables matched your search query.")
                            : t("addFirstDiningTable", "Add your first dining table to manage floor seating.")
                        }
                        actionLabel={t("addTable", "Add Table")}
                        onAction={() => setIsCreateOpen(true)}
                        className="border-none bg-transparent my-0 py-8 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((table: any) => {
                    const isOccupied = table.status === "occupied";
                    const isReserved = table.status === "reserved";
                    return (
                      <TableRow key={table.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`grid size-8 place-items-center rounded-lg font-black text-xs border ${
                                isOccupied
                                  ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                  : isReserved
                                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                              }`}
                            >
                              {table.name.replace(/[^0-9]/g, "") || "T"}
                            </div>
                            <span className="font-semibold text-foreground">{table.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Users className="size-3.5 text-muted-foreground" />
                            {table.capacity}
                          </span>
                        </TableCell>
                        <TableCell>
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
                            {t(table.status, table.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Select
                              value={table.status}
                              onValueChange={(val: any) =>
                                updateStatus.mutate({ id: table.id, status: val })
                              }
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="h-8 text-xs w-[130px] rounded-lg font-bold">
                                <SelectValue placeholder={t("changeStatus", "Change Status")} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="available" className="text-xs font-bold text-emerald-500">
                                  {t("availableFree", "Available")}
                                </SelectItem>
                                <SelectItem value="occupied" className="text-xs font-bold text-rose-500">
                                  {t("occupiedDining", "Occupied")}
                                </SelectItem>
                                <SelectItem value="reserved" className="text-xs font-bold text-amber-500">
                                  {t("reserved", "Reserved")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg"
                              onClick={() => {
                                setSelectedRoomForFolio(table);
                                setGuestName(table.status === "occupied" ? "In-House Guest" : "");
                                setGuestPhone("");
                                setGuestNights(1);
                                setGuestRoomRate(120);
                                setGuestRoomServiceAmt(table.status === "occupied" ? 45.5 : 0);
                              }}
                              title={t("roomFolioAndGuestDetails", "Room Folio & Guest Details")}
                            >
                              <Receipt className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(table.id)}
                              title={t("deleteTable", "Delete Table")}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Table Drawer */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Utensils className="size-5 text-primary" />
              <span>{t("addRestaurantTable", "Add Restaurant Table")}</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("addRestaurantTableDesc", "Add floor tables for dine-in seating and kitchen order routing.")}
            </p>
          </SheetHeader>
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>{t("tableNameNumber", "Table Name / Number")} *</Label>
                <Input
                  placeholder={t("tableNamePlaceholder", "e.g. Table 1, Window Booth 2, Patio 4")}
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("seatingCapacity", "Seating Capacity")} *</Label>
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
                {t("cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTable.isPending || !newTableName.trim()}
                className="min-w-[140px]"
              >
                {createTable.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {t("saveTable", "Save Table")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Table Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTableTitle", "Delete Table?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteTableDesc", "This action cannot be undone. This will permanently remove this dining table.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteTable.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hotel Room Folio & Check-In / Check-Out Management */}
      <Dialog
        open={!!selectedRoomForFolio}
        onOpenChange={(open) => !open && setSelectedRoomForFolio(null)}
      >
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-5 border-b border-border/80 bg-blue-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 grid place-items-center text-blue-600 dark:text-blue-400 shadow-xs">
                <BedDouble className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {t("roomFolioAndGuestBilling", "Room Folio & Guest Billing")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedRoomForFolio?.name} • {t("maxOccupants", "Max")} {selectedRoomForFolio?.capacity || 2} {t("occupants", "Occupants")}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                selectedRoomForFolio?.status === "occupied"
                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold"
                  : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold"
              }
            >
              {selectedRoomForFolio?.status === "occupied" ? t("occupied", "Occupied") : t("vacantAvailable", "Vacant / Available")}
            </Badge>
          </div>

          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {selectedRoomForFolio?.status === "occupied" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs font-bold text-foreground">
                      {t("currentInHouseGuest", "Current In-House Guest")}
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {t("folioNo", "Folio #")}{String(selectedRoomForFolio.id).slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("guestName", "Guest Name")}
                      </span>
                      <span className="font-bold text-foreground">
                        {guestName || "Mr. Robert Vance"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("contactPhone", "Contact Phone")}
                      </span>
                      <span className="font-semibold text-foreground">
                        {guestPhone || "+1 (555) 349-2910"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("duration", "Duration")}
                      </span>
                      <span className="font-semibold text-foreground">
                        {guestNights} {t("nights", "Night(s)")} @ {currencySymbol}
                        {guestRoomRate}/{t("night", "night")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("checkedIn", "Checked In")}
                      </span>
                      <span className="font-semibold text-foreground">{t("today0230Pm", "Today, 02:30 PM")}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 text-xs">
                  <span className="text-xs font-bold text-foreground block border-b border-border/60 pb-2">
                    {t("itemizedFolioBreakdown", "Itemized Room Folio Breakdown")}
                  </span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {t("roomAccommodation", "Room Accommodation")} ({guestNights} {t("nights", "Nights")} × {currencySymbol}
                      {guestRoomRate}):
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {currencySymbol}
                      {(guestNights * guestRoomRate).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("restaurantRoomServiceMinibar", "Restaurant / Room Service & Minibar KOTs")}:</span>
                    <span className="font-mono font-bold text-foreground">
                      {currencySymbol}
                      {guestRoomServiceAmt.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border/60 pt-2 flex justify-between items-center text-sm font-black">
                    <span className="text-foreground">{t("totalFolioBalanceOutstanding", "Total Folio Balance Outstanding")}:</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                      {currencySymbol}
                      {(guestNights * guestRoomRate + guestRoomServiceAmt).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">{t("guestFullName", "Guest Full Name")} *</Label>
                    <Input
                      placeholder={t("guestNamePlaceholder", "e.g. Johnathan Smith")}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-10 rounded-xl font-medium"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">{t("mobilePhone", "Mobile Phone")}</Label>
                    <Input
                      placeholder="e.g. +1 (555) 019-2834"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      {t("nightlyRate", "Nightly Rate")} ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={guestRoomRate}
                      onChange={(e) => setGuestRoomRate(parseFloat(e.target.value) || 0)}
                      className="h-10 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">{t("numberOfNights", "Number of Nights")}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={guestNights}
                      onChange={(e) => setGuestNights(parseInt(e.target.value) || 1)}
                      className="h-10 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-3.5 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">{t("estimatedStayCharges", "Estimated Stay Charges")}:</span>
                  <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                    {currencySymbol}
                    {(guestNights * guestRoomRate).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setSelectedRoomForFolio(null)}
              className="h-11 rounded-xl text-xs font-semibold"
            >
              {t("cancel", "Cancel")}
            </Button>
            {selectedRoomForFolio?.status === "occupied" ? (
              <Button
                onClick={() => {
                  updateStatus.mutate({ id: selectedRoomForFolio.id, status: "available" });
                  toast.success(
                    `✓ Room Folio settled & ${guestName || "Guest"} successfully checked out!`,
                  );
                  setSelectedRoomForFolio(null);
                }}
                className="h-11 px-6 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft gap-2"
              >
                <CreditCard className="size-4" />
                {t("settleFolioAndCheckOut", "Settle Folio & Check-Out Guest ✓")}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (!guestName.trim()) {
                    toast.error(t("enterGuestNameToCheckIn", "Please enter guest name to check in"));
                    return;
                  }
                  updateStatus.mutate({ id: selectedRoomForFolio.id, status: "occupied" });
                  toast.success(`✓ Guest ${guestName} checked in to ${selectedRoomForFolio.name}!`);
                  setSelectedRoomForFolio(null);
                }}
                className="h-11 px-6 rounded-xl font-extrabold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft gap-2"
              >
                <DoorOpen className="size-4" />
                {t("checkInGuestAndOccupy", "Check-In Guest & Occupy Room")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
