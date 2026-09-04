import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  List,
  Pencil,
  Plus,
  Trash2,
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
import { appName } from "@/lib/env";
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
import { getCategoriesFn } from "@/api/categories";
import { isImageUrl } from "@/lib/upload-service";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/services/")({
  head: () => ({ meta: [{ title: `Services Catalog · ${appName}` }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
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
    mutationFn: async (id: string) => (await deleteServiceItemFn({ data: { id } })) as any,
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["services", orgId] });
        toast.success(res.message || "Service deleted successfully");
        setDeleteId(null);
      } else {
        toast.error(res?.error || "Failed to delete service");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete service"),
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
        title={t("servicesCatalog", "Services & Appointment Items")}
        description={t("servicesCatalogDesc", "Configure billable services, session durations, multi-tier pricing variants, and staff commission rules.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-4" /> {t("exportCsv", "Export CSV")}
            </Button>
            <Button size="sm" onClick={() => navigate({ to: "/services/new" })} className="gap-1.5">
              <Plus className="size-4" /> {t("addService", "Add Service")}
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalServices", "Total Services")}
          value={String(totalItems)}
          hint={t("registeredBillableOfferings", "Registered billable offerings")}
          icon={Wrench}
          accent="primary"
        />
        <StatCard
          label={t("serviceCategories", "Service Categories")}
          value={String(categoriesCount)}
          hint={t("activeClassifications", "Active classifications")}
          icon={Layers}
          accent="info"
        />
        <StatCard
          label={t("activeOfferings", "Active Offerings")}
          value={String(activeCount)}
          hint={t("availableInPosBooking", "Available in POS & Booking")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("multiTierVariants", "Multi-Tier Variants")}
          value={`${allVariants.length} ${t("variants", "Variants")}`}
          hint={t("tieredPricingOptions", "Tiered pricing options")}
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
              placeholder={t("searchServices", "Search services...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder={t("allCategories", "All Categories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories", "All Categories")}</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder={t("status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus", "All Status")}</SelectItem>
                <SelectItem value="active">{t("active", "Active")}</SelectItem>
                <SelectItem value="inactive">{t("inactive", "Inactive")}</SelectItem>
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
                title={t("tableView", "Table View")}
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
                title={t("gridView", "Grid View")}
              >
                <LayoutGrid className="size-4" />
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
        ) : viewMode === "grid" ? (
          filtered.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title={t("noServicesFound", "No services found")}
              description={
                search
                  ? t("tryAdjustingSearch", "Try adjusting your search criteria.")
                  : t("noServicesCreatedYet", "You haven't created any service items yet.")
              }
              actionLabel={t("addService", "Add Service")}
              onAction={() => navigate({ to: "/services/new" })}
            />
          ) : (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedServices.map((s: any) => {
                const catObj = categories.find((c: any) => c.id === s.category);
                const sVariants = allVariants.filter((v) => v.serviceId === s.id);

                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft flex flex-col justify-between space-y-3 hover:border-border transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-video w-full rounded-xl bg-muted/40 overflow-hidden border border-border/50 grid place-items-center">
                        {isImageUrl(s.image) ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <Wrench className="size-8 text-muted-foreground/40" />
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge
                            variant="outline"
                            className="bg-background/80 backdrop-blur text-[10px] font-bold"
                          >
                            <Clock className="size-3 mr-1" />
                            {s.duration || "30"} {t("mins", "mins")}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-primary truncate">
                            {catObj?.name || t("generalService", "General Service")}
                          </span>
                          {sVariants.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-semibold truncate">
                              {sVariants.length} {t("variants", "variants")}
                            </span>
                          )}
                        </div>
                        <h3
                          onClick={() => navigate({ to: `/services/${s.id}` })}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate mt-0.5"
                        >
                          {s.name}
                        </h3>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                          {t("basePrice", "Base Price")}
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(s.price || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate({ to: `/services/${s.id}` })}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title={t("edit", "Edit")}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(s.id)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
                          title={t("delete", "Delete")}
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
          )
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("serviceName", "Service Name")}</TableHead>
                    <TableHead>{t("category", "Category")}</TableHead>
                    <TableHead>{t("duration", "Duration")}</TableHead>
                    <TableHead className="text-right">{t("basePrice", "Base Price")}</TableHead>
                    <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <EmptyState
                          icon={Wrench}
                          title={t("noServicesFound", "No services found")}
                          description={
                            search
                              ? t("tryAdjustingSearch", "Try adjusting your search criteria.")
                              : t("noServicesCreatedYet", "You haven't created any service items yet.")
                          }
                          actionLabel={t("addService", "Add Service")}
                          onAction={() => navigate({ to: "/services/new" })}
                          className="border-none bg-transparent my-0 py-8 shadow-none"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedServices.map((s: any) => {
                    const catObj = categories.find((c: any) => c.id === s.category);

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div
                            onClick={() => navigate({ to: `/services/${s.id}` })}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <div className="grid size-9 place-items-center rounded-lg bg-muted/60 overflow-hidden shrink-0 border border-border/50">
                              {isImageUrl(s.image) ? (
                                <img
                                  src={s.image}
                                  alt={s.name}
                                  loading="lazy"
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Wrench className="size-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <span className="font-semibold text-foreground hover:text-primary transition-colors">
                              {s.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{catObj?.name || t("general", "General")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="size-3 mr-1 text-muted-foreground" />
                            {s.duration || "30"} {t("min", "min")}
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
                              <Pencil className="size-3.5 mr-1" /> {t("edit", "Edit")}
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
                  }))}
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
                  {t("deleteServiceOffering", "Delete Service Offering")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("deleteServiceConfirmDesc", "Are you sure you want to delete this service? Historical appointments will retain their records.")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {t("delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
