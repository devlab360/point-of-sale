import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Megaphone,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Plus,
  Search,
  Calendar,
  Percent,
  Tag,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPromotionsFn,
  createPromotionFn,
  updatePromotionFn,
  deletePromotionFn,
} from "@/api/promotions";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions & Discounts · OneDesk360" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed" | "bogo" | "storewide">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formConditions, setFormConditions] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "scheduled" | "expired" | "inactive">("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const {
    data: promotionsData,
    isLoading: isPromotionsLoading,
    isError: isPromotionsError,
    refetch: refetchPromotions,
  } = useQuery({
    queryKey: ["promotions", orgId],
    queryFn: async () => {
      const res = (await getPromotionsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const promotions = promotionsData || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (editItem) {
      setFormTitle(editItem.title || "");
      setFormType(editItem.type || "percentage");
      setFormValue(String(editItem.value || ""));
      setFormConditions(editItem.conditions || "");
      setFormStatus(editItem.status || "active");
      setStartDate(editItem.startDate || "");
      setEndDate(editItem.endDate || "");
    } else {
      setFormTitle("");
      setFormType("percentage");
      setFormValue("");
      setFormConditions("");
      setFormStatus("active");
      const today = new Date().toISOString().split("T")[0];
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(nextMonth);
    }
  }, [editItem, isAddOpen]);

  // KPI metrics
  const totalCampaigns = promotions.length;
  const activeCampaigns = useMemo(() => promotions.filter((p: any) => p.status === "active").length, [promotions]);
  const scheduledCampaigns = useMemo(() => promotions.filter((p: any) => p.status === "scheduled").length, [promotions]);
  const storewideCount = useMemo(() => promotions.filter((p: any) => p.type === "storewide" || p.type === "percentage").length, [promotions]);

  const filteredPromotions = useMemo(() => {
    let list = Array.isArray(promotions) ? promotions : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(lower) ||
          p.conditions?.toLowerCase().includes(lower) ||
          p.type?.toLowerCase().includes(lower)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((p: any) => p.type?.toLowerCase() === typeFilter.toLowerCase());
    }
    if (statusFilter !== "all") {
      list = list.filter((p: any) => p.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    return [...list].reverse();
  }, [promotions, debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / pageSize));
  const paginatedPromotions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPromotions.slice(start, start + pageSize);
  }, [filteredPromotions, page, pageSize]);

  const {
    errors: promoErrors,
    validate: validatePromo,
    clearError: clearPromoError,
    clearAll: clearPromoAll,
  } = useFormValidation({
    title: { required: "Promotion title is required" },
    value: { required: "Discount value is required" },
    conditions: { required: "Conditions are required" },
    startDate: { required: "Start date is required" },
    endDate: { required: "End date is required" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const title = formTitle.trim();
      const type = formType;
      const valueStr = formValue.trim();
      const conditions = formConditions.trim();
      const status = formStatus;

      const isValid = validatePromo({ title, value: valueStr, conditions, startDate, endDate });
      if (!isValid) return;

      const value = parseFloat(valueStr);

      if (editItem) {
        const res = (await updatePromotionFn({
          data: {
            id: editItem.id,
            updates: { title, type, value, conditions, startDate, endDate, status },
          },
        })) as any;
        if (res?.success) {
          toast.success("Promotion updated successfully");
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ["promotions", orgId] });
        } else throw new Error(res?.error || "Failed to update promotion");
      } else {
        const res = (await createPromotionFn({
          data: {
            promotion: { title, type, value, conditions, startDate, endDate, status },
          },
        })) as any;
        if (res?.success) {
          toast.success("Promotion campaign published successfully");
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["promotions", orgId] });
        } else throw new Error(res?.error || "Failed to create promotion");
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
        const res = (await deletePromotionFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success("Promotion deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["promotions", orgId] });
        } else throw new Error(res?.error);
      } catch (error) {
        toast.error("Failed to delete promotion");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Promotions & Discount Rules"
        description="Launch seasonal campaigns, automated discount rules, BOGO bundles, and cart checkout incentives."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null);
              clearPromoAll();
              setIsAddOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Create Promotion
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={String(totalCampaigns)}
          hint="All configured promo rules"
          icon={Megaphone}
          accent="primary"
        />
        <StatCard
          label="Live & Active Deals"
          value={String(activeCampaigns)}
          hint="Auto-applied at POS register"
          icon={Zap}
          accent="success"
        />
        <StatCard
          label="Scheduled Upcoming"
          value={String(scheduledCampaigns)}
          hint="Future launch dates"
          icon={Clock}
          accent="info"
        />
        <StatCard
          label="Storewide Rules"
          value={String(storewideCount)}
          hint="Cart-wide percentage benefits"
          icon={Percent}
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
              placeholder="Search promotions by title or terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder="All Scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Flat ($)</SelectItem>
                <SelectItem value="bogo">BOGO Offer</SelectItem>
                <SelectItem value="storewide">Storewide</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
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
        {isPromotionsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={6} rows={6} />
          )
        ) : isPromotionsError ? (
          <ErrorState onRetry={refetchPromotions} />
        ) : filteredPromotions.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No promotions found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't launched any promotional campaigns yet."
            }
            actionLabel="Create Promotion"
            onAction={() => {
              setEditItem(null);
              clearPromoAll();
              setIsAddOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedPromotions.map((p: any) => {
                const isActive = p.status === "active";
                const isPercent = p.type === "percentage" || p.type === "storewide";

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge
                          variant="outline"
                          className="font-bold text-xs capitalize bg-primary/10 text-primary border-primary/20"
                        >
                          {p.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {p.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {p.conditions}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Benefit</span>
                        <span className="text-base font-bold text-foreground">
                          {p.type === "bogo" ? "Buy 1 Get 1 Free" : isPercent ? `${p.value}% OFF` : `${formatCurrency(p.value)} FLAT`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0" />
                        <span className="truncate">{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditItem(p);
                          clearPromoAll();
                          setIsAddOpen(true);
                        }}
                        className="h-8 text-xs font-semibold"
                      >
                        <Edit2 className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(p.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredPromotions.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredPromotions.length}
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
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Title</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Validity Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPromotions.map((p: any) => {
                    const isActive = p.status === "active";
                    const isPercent = p.type === "percentage" || p.type === "storewide";

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-foreground">{p.title}</span>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{p.conditions}</div>
                        </TableCell>
                        <TableCell className="capitalize text-xs font-medium">
                          {p.type}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {p.type === "bogo" ? "BOGO" : isPercent ? `${p.value}% OFF` : `${formatCurrency(p.value)} FLAT`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              isActive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditItem(p);
                                clearPromoAll();
                                setIsAddOpen(true);
                              }}
                              className="h-8 text-xs font-semibold"
                            >
                              <Edit2 className="size-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(p.id)}
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
            {filteredPromotions.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredPromotions.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {editItem ? "Edit Promotion Campaign" : "Create New Promotion"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Define automatic discount calculations, coupon terms, and seasonal schedules.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-title" className="text-xs font-semibold">
                    Promotion Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="promo-title"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      clearPromoError("title");
                    }}
                    placeholder="e.g. Flash Summer Sale 2026"
                    className={promoErrors.title ? "border-destructive" : ""}
                  />
                  <FieldError message={promoErrors.title} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Promotion Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(val: any) => setFormType(val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        <SelectItem value="bogo">Buy 1 Get 1 (BOGO)</SelectItem>
                        <SelectItem value="storewide">Storewide Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="promo-value" className="text-xs font-semibold">
                      Discount Value {formType === "percentage" ? "(%)" : "($)"} *
                    </Label>
                    <Input
                      id="promo-value"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formValue}
                      onChange={(e) => {
                        setFormValue(e.target.value);
                        clearPromoError("value");
                      }}
                      placeholder="e.g. 15"
                      className={promoErrors.value ? "border-destructive" : ""}
                    />
                    <FieldError message={promoErrors.value} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="promo-conditions" className="text-xs font-semibold">
                    Conditions & Thresholds <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="promo-conditions"
                    value={formConditions}
                    onChange={(e) => {
                      setFormConditions(e.target.value);
                      clearPromoError("conditions");
                    }}
                    placeholder="e.g. Min spend $50 across all clothing items"
                    className={promoErrors.conditions ? "border-destructive" : ""}
                  />
                  <FieldError message={promoErrors.conditions} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Start Date *</Label>
                    <DatePicker
                      date={startDate}
                      onDateChange={(d) => {
                        const val = d ? d.toISOString().split("T")[0] : "";
                        setStartDate(val);
                        clearPromoError("startDate");
                      }}
                      placeholder="Start date"
                    />
                    <FieldError message={promoErrors.startDate} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">End Date *</Label>
                    <DatePicker
                      date={endDate}
                      onDateChange={(d) => {
                        const val = d ? d.toISOString().split("T")[0] : "";
                        setEndDate(val);
                        clearPromoError("endDate");
                      }}
                      placeholder="End date"
                    />
                    <FieldError message={promoErrors.endDate} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campaign Status</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(val: any) => setFormStatus(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Live in Register)</SelectItem>
                      <SelectItem value="scheduled">Scheduled (Future)</SelectItem>
                      <SelectItem value="expired">Expired / Ended</SelectItem>
                      <SelectItem value="inactive">Draft / Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {editItem ? "Update Promotion" : "Publish Promotion"}
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
                  Delete Promotion
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to permanently delete this promotion campaign?
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
