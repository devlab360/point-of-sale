import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Star,
  Loader2,
  MoreVertical,
  Megaphone,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPromotionsFn,
  createPromotionFn,
  updatePromotionFn,
  deletePromotionFn,
} from "@/api/promotions";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions · OneDesk360" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: promotionsData,
    isLoading: isPromotionsLoading,
    isError: isPromotionsError,
    refetch: refetchPromotions,
  } = useQuery({
    queryKey: ["promotions", orgId],
    queryFn: async () => ((await getPromotionsFn({ data: {} })) as any)?.data || [],
  });
  const promotions = promotionsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({ type: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "", status: "" });
  const activeFilterCount = (filters.type ? 1 : 0) + (filters.status ? 1 : 0);

  const handleResetFilters = () => {
    setFilters({ type: "", status: "" });
    setDraftFilters({ type: "", status: "" });
  };

  const filteredPromotions = useMemo(() => {
    let list = promotions;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(lower));
    }
    if (filters.type) {
      list = list.filter((p) => p.type === filters.type);
    }
    if (filters.status) {
      list = list.filter((p) => p.status === filters.status);
    }
    return list;
  }, [promotions, debouncedSearch, filters.type, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredPromotions.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredPromotions.length, page]);

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const {
    errors: promoErrors,
    validate: validatePromo,
    clearError: clearPromoError,
    clearAll: clearPromoAll,
  } = useFormValidation({
    title: { required: "Promotion title is required" },
    value: { required: "Discount value is required", positive: "Value must be positive" },
    conditions: { required: "Conditions are required" },
    startDate: { required: "Start date is required" },
    endDate: { required: "End date is required" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const title = (formData.get("title") as string)?.trim();
      const type = formData.get("type") as string;
      const valueStr = (formData.get("value") as string)?.trim();
      const conditions = (formData.get("conditions") as string)?.trim();
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      const status = formData.get("status") as string;

      const isValid = validatePromo({ title, value: valueStr, conditions, startDate, endDate });
      if (!isValid) return;

      const value = parseFloat(valueStr);

      if (editItem) {
        const res = await updatePromotionFn({
          data: {
            id: editItem.id,
            updates: { title, type, value, conditions, startDate, endDate, status },
          },
        });
        if (res?.success) {
          toast.success("Promotion updated successfully");
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
        } else throw new Error(res?.error);
      } else {
        const res = await createPromotionFn({
          data: {
            promotion: { title, type, value, conditions, startDate, endDate, status },
          },
        });
        if (res?.success) {
          toast.success("Promotion added successfully");
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
        } else throw new Error(res?.error);
      }
      clearPromoAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deletePromotionFn({ data: { id: deleteId } });
        if (res?.success) {
          toast.success("Promotion deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
        } else throw new Error(res?.error);
      } catch (error) {
        toast.error("Failed to delete promotion");
      }
    }
  };

  return (
    <div>
      <DataPage
        title="Promotions & Campaigns"
        description="Automated discount rules, seasonal campaigns, and bundle offers."
        primaryAction={{ label: "New Campaign", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search promotions..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={promotions.length === 0}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "ended", label: "Ended" },
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
      >
        {isPromotionsLoading ? (
          <CardGridSkeleton cards={6} columns="grid-cols-1 md:grid-cols-2" />
        ) : isPromotionsError ? (
          <ErrorState onRetry={refetchPromotions} />
        ) : filteredPromotions.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No promotions found"
            description={search ? "Try adjusting your search query." : "No promotional campaigns created yet."}
            actionLabel="New Campaign"
            onAction={() => {
              setEditItem(null);
              setStartDate("");
              setEndDate("");
              setIsAddOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {paginatedPromotions.map((p) => (
                <div
                  key={p.id}
                  className="relative rounded-2xl border border-border/80 bg-card p-5 shadow-card card-interactive flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pr-10">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <Sparkles className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-foreground">{p.title}</h3>
                          <p className="text-[11px] text-muted-foreground capitalize font-medium">Type: {p.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-success/12 text-success hover:bg-success/20 border-success/20 text-[10px] font-bold"
                            : "bg-info/12 text-info hover:bg-info/20 border-info/20 text-[10px] font-bold"
                        }
                      >
                        {p.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => setEditItem(p)} className="text-xs font-semibold">
                            <Edit2 className="mr-2 size-3.5" /> Edit Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive text-xs font-semibold"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2.5 text-xs font-bold text-primary flex items-center justify-between">
                      <span>{p.type === "percentage" ? `${p.value}% OFF` : `${formatCurrency(p.value)} OFF`}</span>
                      <span className="text-[11px] text-foreground font-semibold truncate max-w-[200px]">{p.conditions}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground/60" />
                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filteredPromotions.length}
            />
          </div>
        )}
      </DataPage>

      <Dialog
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearPromoAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Promotion" : "Add Promotion"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Promotion Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={editItem?.title}
                placeholder="e.g. Campaign Name"
                className={
                  promoErrors.title ? "border-destructive focus-visible:ring-destructive" : ""
                }
                onChange={() => clearPromoError("title")}
              />
              <FieldError message={promoErrors.title} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Scope Type</Label>
                <Select name="type" defaultValue={editItem?.type || "storewide"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="storewide">Storewide</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="product">Specific Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">
                  Discount Value (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 10.00"
                  defaultValue={editItem?.value}
                  className={
                    promoErrors.value ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearPromoError("value")}
                />
                <FieldError message={promoErrors.value} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditions">
                Conditions <span className="text-destructive">*</span>
              </Label>
              <Input
                id="conditions"
                name="conditions"
                defaultValue={editItem?.conditions}
                placeholder="e.g. Conditions or Rules"
                className={
                  promoErrors.conditions ? "border-destructive focus-visible:ring-destructive" : ""
                }
                onChange={() => clearPromoError("conditions")}
              />
              <FieldError message={promoErrors.conditions} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <div className="hidden">
                  <Input
                    name="startDate"
                    value={startDate || (editItem ? editItem.startDate : "")}
                    readOnly
                  />
                </div>
                <DatePicker
                  name="startDate"
                  date={startDate || (editItem ? editItem.startDate : "")}
                  onDateChange={(d) => {
                    setStartDate(d ? d.toISOString().split("T")[0] : "");
                    clearPromoError("startDate");
                  }}
                />
                <FieldError message={promoErrors.startDate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <div className="hidden">
                  <Input
                    name="endDate"
                    value={endDate || (editItem ? editItem.endDate : "")}
                    readOnly
                  />
                </div>
                <DatePicker
                  name="endDate"
                  date={endDate || (editItem ? editItem.endDate : "")}
                  onDateChange={(d) => {
                    setEndDate(d ? d.toISOString().split("T")[0] : "");
                    clearPromoError("endDate");
                  }}
                />
                <FieldError message={promoErrors.endDate} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editItem?.status || "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearPromoAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Promotion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
