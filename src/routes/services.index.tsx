import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  List,
  Pencil,
  Plus,
  Trash2,
  PackageSearch,
  Clock,
  Layers,
  DollarSign,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Download,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { useState, useMemo } from "react";
import { exportToCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServicesListFn, deleteServiceItemFn, getAllServiceVariantsFn } from "@/api/services";
import { isImageUrl } from "@/lib/upload-service";
import { getCategoriesFn } from "@/api/categories";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [{ title: "Services Catalog · OneDesk360" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: catData } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = Array.isArray(catData) ? catData : [];

  const {
    data: servicesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["services", orgId],
    queryFn: async () => ((await getServicesListFn({ data: {} })) as any)?.data || [],
  });
  const rawServices: any[] = Array.isArray(servicesData) ? servicesData : [];

  const { data: variantsData } = useQuery({
    queryKey: ["serviceVariants", orgId],
    queryFn: async () => ((await getAllServiceVariantsFn({ data: {} })) as any)?.data || [],
  });
  const allVariants: any[] = Array.isArray(variantsData) ? variantsData : [];

  const filtered = useMemo(() => {
    let list = rawServices;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((s: any) => s.name?.toLowerCase().includes(lower));
    }
    if (categoryFilter !== "all") {
      list = list.filter((s: any) => s.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((s: any) => (s.status || "active") === statusFilter);
    }
    return list;
  }, [rawServices, debouncedSearch, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalItems = rawServices.length;
  const activeCount = useMemo(
    () => rawServices.filter((s) => (s.status || "active") === "active").length,
    [rawServices],
  );
  const categoriesCount = categories.length;

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteServiceItemFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", orgId] });
      toast.success("Service deleted successfully");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete service"),
  });

  const handleExport = () => {
    const exportData: any[] = [];
    filtered.forEach((s: any) => {
      const catName = categories.find((c: any) => c.id === s.category)?.name || "General";
      exportData.push({
        Name: s.name,
        Category: catName,
        Price: s.price,
        Cost: s.cost || "0",
        Duration: s.duration || "30",
        Status: s.status || "active",
      });
    });

    exportToCSV(
      exportData,
      [
        { key: "Name", label: "Service Name" },
        { key: "Category", label: "Category" },
        { key: "Price", label: "Price" },
        { key: "Cost", label: "Cost" },
        { key: "Duration", label: "Duration (min)" },
        { key: "Status", label: "Status" },
      ],
      "services-catalog",
    );
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Services & Appointment Items"
        description="Configure billable services, session durations, multi-tier pricing variants, and staff commission rules."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => navigate({ to: "/services/new" })} className="gap-1.5">
              <Plus className="size-4" /> Add Service
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Services"
          value={String(totalItems)}
          hint="Registered billable offerings"
          icon={Wrench}
          accent="primary"
        />
        <StatCard
          label="Service Categories"
          value={String(categoriesCount)}
          hint="Active classifications"
          icon={Layers}
          accent="info"
        />
        <StatCard
          label="Active Offerings"
          value={String(activeCount)}
          hint="Available in POS & Booking"
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Multi-Tier Variants"
          value={`${allVariants.length} Variants`}
          hint="Tiered pricing options"
          icon={DollarSign}
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
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
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
        </div>

        {/* Content View */}
        {isLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={5} rows={6} />
          )
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No services found"
            description={
              search
                ? "Try adjusting your search criteria."
                : "You haven't created any service items yet."
            }
            actionLabel="Add Service"
            onAction={() => navigate({ to: "/services/new" })}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedServices.map((s: any) => {
                const catObj = categories.find((c: any) => c.id === s.category);
                const sVariants = allVariants.filter((v) => v.serviceId === s.id);

                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        {isImageUrl(s.image) ? (
                          <div className="size-11 rounded-xl border border-border/80 bg-muted/30 overflow-hidden">
                            <img
                              src={s.image}
                              alt={s.name}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                            <Wrench className="size-5" />
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs font-semibold">
                          <Clock className="size-3 mr-1 text-muted-foreground" />
                          {s.duration || "30"} mins
                        </Badge>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-primary block">
                          {catObj?.name || "General Service"}
                        </span>
                        <h3
                          onClick={() => navigate({ to: `/services/${s.id}` })}
                          className="font-bold text-base text-foreground group-hover:text-primary transition-colors cursor-pointer truncate mt-0.5"
                        >
                          {s.name}
                        </h3>
                        {sVariants.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sVariants.length} pricing variants
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Base Price
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(s.price || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: `/services/${s.id}` })}
                          className="h-8 text-xs font-semibold"
                        >
                          <Pencil className="size-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(s.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedServices.map((s: any) => {
                    const catObj = categories.find((c: any) => c.id === s.category);

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div
                            onClick={() => navigate({ to: `/services/${s.id}` })}
                            className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
                          >
                            {s.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{catObj?.name || "General"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="size-3 mr-1 text-muted-foreground" />
                            {s.duration || "30"} min
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(s.price || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate({ to: `/services/${s.id}` })}
                              className="h-8 text-xs font-semibold"
                            >
                              <Pencil className="size-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(s.id)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        )}
      </div>

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
                  Delete Service Offering
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete this service? Historical appointments will retain
                  their records.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
