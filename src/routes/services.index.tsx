import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { List, MoreHorizontal, Pencil, Plus, Trash2, PackageSearch, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { v4 as uuidv4 } from "uuid";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataPage } from "@/components/layout/DataPage";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServicesListFn,
  createServiceItemFn,
  deleteServiceItemFn,
  getAllServiceVariantsFn,
} from "@/api/services";
import { getCategoriesFn } from "@/api/categories";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [{ title: "Services · OneDesk360" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ category: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ category: "", status: "" });

  const { data: catData } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories = catData || [];

  const {
    data: servicesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "services",
      orgId,
      page,
      pageSize,
      debouncedSearch,
      filters.category,
      filters.status,
    ],
    queryFn: async () => {
      const res = await getServicesListFn({
        data: {
          page,
          pageSize,
          query: debouncedSearch,
          categoryId: filters.category,
          status: filters.status,
        },
      });
      return res.success ? { items: res.data, total: (res as any).total } : { items: [], total: 0 };
    },
  });

  const services = servicesData?.items || [];
  const totalItems = servicesData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const [showDelete, setShowDelete] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteServiceItemFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted");
      setShowDelete(false);
      setActiveItem(null);
    },
  });

  const handleEdit = (item: any) => {
    navigate({ to: `/services/${item.id}` });
  };

  const handleExport = async () => {
    try {
      const variantsRes = await getAllServiceVariantsFn();
      const allVariants = variantsRes?.success ? variantsRes.data : [];

      const exportData: any[] = [];

      services.forEach((s: any) => {
        const catName = categories.find((c: any) => c.id === s.category)?.name || "General";
        const baseRow = {
          Name: s.name,
          Category: catName,
          BasePrice: s.price,
          BaseCost: s.cost || "0",
          BaseDuration: s.duration || "",
        };

        if (s.hasVariants) {
          const serviceVariants = allVariants.filter((v: any) => v.serviceId === s.id);
          if (serviceVariants.length > 0) {
            serviceVariants.forEach((v: any) => {
              const row: any = {
                ...baseRow,
                VariantName: v.name,
                VariantPrice: v.price || baseRow.BasePrice,
                VariantCost: v.cost || baseRow.BaseCost,
                VariantDuration: v.duration || baseRow.BaseDuration,
              };

              if (v.attributes && v.attributes.length > 0) {
                v.attributes.forEach((attr: any, index: number) => {
                  if (index < 2) {
                    row[`Option${index + 1}Name`] = attr.name;
                    row[`Option${index + 1}Value`] = attr.value;
                  }
                });
              }
              exportData.push(row);
            });
          } else {
            exportData.push(baseRow);
          }
        } else {
          exportData.push(baseRow);
        }
      });

      exportToCSV(
        exportData,
        [
          { key: "Name", label: "Name" },
          { key: "Category", label: "Category" },
          { key: "BasePrice", label: "Base Price" },
          { key: "BaseCost", label: "Base Cost" },
          { key: "BaseDuration", label: "Base Duration (min)" },
          { key: "VariantName", label: "Variant Name" },
          { key: "VariantPrice", label: "Variant Price" },
          { key: "VariantCost", label: "Variant Cost" },
          { key: "VariantDuration", label: "Variant Duration (min)" },
          { key: "Option1Name", label: "Option1 Name" },
          { key: "Option1Value", label: "Option1 Value" },
          { key: "Option2Name", label: "Option2 Name" },
          { key: "Option2Value", label: "Option2 Value" },
        ],
        "services-with-variants",
      );
    } catch (e) {
      toast.error("Failed to export services");
      console.error(e);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      const groupedData: Record<string, any[]> = {};
      data.forEach((row) => {
        if (row["Name"]) {
          if (!groupedData[row["Name"]]) {
            groupedData[row["Name"]] = [];
          }
          groupedData[row["Name"]].push(row);
        }
      });

      let count = 0;
      for (const [name, rows] of Object.entries(groupedData)) {
        const firstRow = rows[0];
        const hasVariants = rows.length > 1 || !!firstRow["VariantName"];

        const variantsToCreate = hasVariants
          ? rows.map((row) => {
              const attributes: { name: string; value: string }[] = [];
              for (let i = 1; i <= 2; i++) {
                if (row[`Option${i}Name`] && row[`Option${i}Value`]) {
                  attributes.push({
                    name: row[`Option${i}Name`],
                    value: row[`Option${i}Value`],
                  });
                }
              }
              return {
                name: row["VariantName"] || "Default",
                price: parseFloat(row["VariantPrice"] || row["BasePrice"] || "0"),
                cost: parseFloat(row["VariantCost"] || row["BaseCost"] || "0"),
                duration: parseInt(row["VariantDuration"] || row["BaseDuration"] || "30"),
                attributes,
              };
            })
          : [];

        await createServiceItemFn({
          data: {
            id: uuidv4(),
            name: name,
            category:
              categories.find(
                (c: any) => c.name.toLowerCase() === (firstRow["Category"] || "").toLowerCase(),
              )?.id ||
              categories[0]?.id ||
              "General",
            price: parseFloat(firstRow["BasePrice"] || firstRow["Price"] || "0"),
            cost: parseFloat(firstRow["BaseCost"] || firstRow["Cost"] || "0"),
            duration: parseInt(firstRow["BaseDuration"] || firstRow["Duration (min)"] || "30"),
            hasVariants,
            variants: variantsToCreate,
            status: "active",
          },
        });
        count++;
      }

      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success(`Successfully imported ${count} services`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <div>
      <DataPage
        title="Services"
        description="Manage your billable services and durations"
        searchPlaceholder="Search services by name or SKU..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={services.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        primaryAction={{
          label: "Add Service",
          icon: Plus,
          onClick: () => navigate({ to: "/services/new" }),
        }}
        filtersContent={({ close }) => (
          <div className="flex flex-col h-full gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <SearchableSelect
                value={draftFilters.category}
                onChange={(v) => setDraftFilters({ ...draftFilters, category: v })}
                options={[
                  { value: "", label: "All Categories" },
                  ...categories.map((c: any) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Select category..."
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draftFilters.status}
                onValueChange={(v) => setDraftFilters({ ...draftFilters, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-auto border-t pt-4 flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDraftFilters({ category: "", status: "" });
                  setFilters({ category: "", status: "" });
                  setPage(1);
                  close();
                }}
              >
                Clear
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  setFilters(draftFilters);
                  setPage(1);
                  close();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
        onResetFilters={() => {
          setDraftFilters({ category: "", status: "" });
          setFilters({ category: "", status: "" });
          setPage(1);
        }}
        activeFilterCount={
          (filters.category ? 1 : 0) + (filters.status && filters.status !== "all" ? 1 : 0)
        }
      >
        <div className="mt-4 md:mt-6">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : isError ? (
            <ErrorState
              title="Failed to load services"
              description="There was an error fetching the services. Please try again."
              onRetry={() => refetch()}
            />
          ) : services.length === 0 ? (
            <EmptyState
              icon={List}
              title="No Services Found"
              description={
                search || filters.category
                  ? "No services match your current filters."
                  : "Get started by creating your first service."
              }
              actionLabel={!search && !filters.category ? "Add Service" : undefined}
              onAction={
                !search && !filters.category ? () => navigate({ to: "/services/new" }) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-semibold text-muted-foreground w-12">#</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Category</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                        Price
                      </th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-center">
                        Duration
                      </th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-center">
                        Status
                      </th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {services.map((item: any, i: number) => {
                      const catName =
                        categories.find((c: any) => c.id === item.category)?.name || item.category;
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">
                            {(page - 1) * pageSize + i + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{item.name}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{catName}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-bold">{formatCurrency(Number(item.price))}</div>
                            {Number(item.cost) > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                Cost: {formatCurrency(Number(item.cost))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.duration ? `${item.duration} min` : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={item.status === "active" ? "default" : "secondary"}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                  <Pencil className="mr-2 size-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onClick={() => {
                                    setActiveItem(item);
                                    setShowDelete(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 size-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={totalItems}
              />
            </div>
          )}
        </div>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-bold">{activeItem?.name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  deleteMutation.mutate(activeItem?.id);
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DataPage>
    </div>
  );
}
