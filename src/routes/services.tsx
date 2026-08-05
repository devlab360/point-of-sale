import { createFileRoute } from "@tanstack/react-router";
import { List, MoreHorizontal, Pencil, Plus, Trash2, PackageSearch, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
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
  updateServiceItemFn,
  deleteServiceItemFn,
} from "@/api/services";
import { getCategoriesFn } from "@/api/categories";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [{ title: "Services · NexisPOS" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

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

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState("active");

  const resetForm = () => {
    setName("");
    setCategoryId("");
    setPrice("");
    setCost("");
    setDuration("");
    setImage("");
    setStatus("active");
    setActiveItem(null);
  };

  const handleEdit = (item: any) => {
    setActiveItem(item);
    setName(item.name || "");
    setCategoryId(item.category || "");
    setPrice(item.price || "");
    setCost(item.cost || "");
    setDuration(item.duration ? String(item.duration) : "");
    setImage(item.image || "");
    setStatus(item.status || "active");
    setShowEdit(true);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => await createServiceItemFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service created successfully");
      setShowAdd(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create service"),
    onSettled: () => setIsSubmitting(false),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => await updateServiceItemFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service updated successfully");
      setShowEdit(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update service"),
    onSettled: () => setIsSubmitting(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteServiceItemFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted");
      setShowDelete(false);
      setActiveItem(null);
    },
    onError: () => toast.error("Failed to delete service"),
    onSettled: () => setIsSubmitting(false),
  });

  const handleSave = () => {
    if (!name.trim()) return toast.error("Name is required");
    setIsSubmitting(true);

    const payload = {
      name,
      category: categoryId,
      price,
      cost,
      duration,
      image,
      status,
    };

    if (activeItem) {
      updateMutation.mutate({ ...payload, id: activeItem.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Services"
        description="Manage your billable services and durations"
        searchPlaceholder="Search services..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Add Service",
          icon: Plus,
          onClick: () => {
            resetForm();
            setShowAdd(true);
          },
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
                !search && !filters.category
                  ? () => {
                    resetForm();
                    setShowAdd(true);
                  }
                  : undefined
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

        <Dialog
          open={showAdd || showEdit}
          onOpenChange={(val) => {
            if (!val) {
              setShowAdd(false);
              setShowEdit(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{activeItem ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="mb-2">
                <FileUpload
                  label="Service Image"
                  description="Upload an image for this service"
                  value={image || ""}
                  onChange={(url) => setImage(url)}
                  folder="services"
                  maxSizeMB={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Service Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haircut"
                />
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                  placeholder="Select category..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cost (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setShowEdit(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {activeItem ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-bold">{activeItem?.name}</span>?
                This action cannot be undone.
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
