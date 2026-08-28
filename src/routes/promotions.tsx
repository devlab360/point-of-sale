import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Megaphone,
  Tag,
  Percent,
  TrendingUp,
  Clock,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  Store,
  Layers,
  ShoppingBag,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
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
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions & Campaigns · OneDesk360" }] }),
  component: PromotionsPage,
});

function getPromotionVisuals(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "percentage") {
    return {
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      accent: "text-amber-600 dark:text-amber-400",
      icon: <Percent className="size-4 text-amber-500" />,
      border: "border-amber-500/30",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
      tag: "Percentage Discount",
    };
  }
  if (t === "fixed") {
    return {
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      accent: "text-emerald-600 dark:text-emerald-400",
      icon: <Tag className="size-4 text-emerald-500" />,
      border: "border-emerald-500/30",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
      tag: "Fixed Cash Discount",
    };
  }
  if (t === "storewide") {
    return {
      gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
      badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
      accent: "text-purple-600 dark:text-purple-400",
      icon: <Store className="size-4 text-purple-500" />,
      border: "border-purple-500/30",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.12)]",
      tag: "Storewide Sale",
    };
  }
  if (t === "category") {
    return {
      gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
      badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
      accent: "text-blue-600 dark:text-blue-400",
      icon: <Layers className="size-4 text-blue-500" />,
      border: "border-blue-500/30",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.12)]",
      tag: "Category Promo",
    };
  }
  // Product / Default
  return {
    gradient: "from-primary/20 via-primary/10 to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    accent: "text-primary",
    icon: <ShoppingBag className="size-4 text-primary" />,
    border: "border-primary/30",
    glow: "shadow-[0_0_20px_rgba(var(--primary),0.12)]",
    tag: "Product Specific",
  };
}

function getDaysRemainingStatus(startDateStr: string, endDateStr: string) {
  if (!endDateStr) return { label: "No expiry", color: "text-muted-foreground bg-muted" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = startDateStr ? new Date(startDateStr) : null;
  if (start) start.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  if (start && now < start) {
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: `Starts in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
    };
  }

  if (now > end) {
    return {
      label: "Campaign Ended",
      color: "bg-muted text-muted-foreground border-border",
    };
  }

  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return {
      label: "Expires Today!",
      color: "bg-destructive/15 text-destructive border-destructive/25 animate-pulse",
    };
  }
  if (diffDays <= 3) {
    return {
      label: `🔥 Ends in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
    };
  }

  return {
    label: `Active · ${diffDays} days left`,
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  };
}

function PromotionsPage() {
  const { formatDate } = usePreferences();
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
    queryFn: async () => {
      const res = (await getPromotionsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const promotions = Array.isArray(promotionsData) ? promotionsData : [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Live State
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("percentage");
  const [formValue, setFormValue] = useState("15");
  const [formConditions, setFormConditions] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sync drawer form state on edit/open
  useEffect(() => {
    if (editItem) {
      setFormTitle(editItem.title || "");
      setFormType(editItem.type || "percentage");
      setFormValue(String(editItem.value ?? 15));
      setFormConditions(editItem.conditions || "");
      setFormStatus(editItem.status || "active");
      setStartDate(editItem.startDate || "");
      setEndDate(editItem.endDate || "");
    } else if (isAddOpen) {
      setFormTitle("");
      setFormType("percentage");
      setFormValue("15");
      setFormConditions("Minimum purchase of $50 on eligible items");
      setFormStatus("active");
      const today = new Date().toISOString().split("T")[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(nextMonth);
    }
  }, [editItem, isAddOpen]);

  // Key KPI metrics
  const totalCampaigns = promotions.length;
  const activeCampaigns = useMemo(() => promotions.filter((p) => p.status === "active").length, [promotions]);
  const scheduledCampaigns = useMemo(() => promotions.filter((p) => p.status === "scheduled").length, [promotions]);
  const storewideCount = useMemo(() => promotions.filter((p) => p.type === "storewide" || p.type === "percentage").length, [promotions]);

  const filteredPromotions = useMemo(() => {
    let list = Array.isArray(promotions) ? promotions : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(lower) ||
          p.conditions?.toLowerCase().includes(lower) ||
          p.type?.toLowerCase().includes(lower)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((p) => p.type?.toLowerCase() === typeFilter.toLowerCase());
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    return list;
  }, [promotions, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredPromotions.length / pageSize) || 1;
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
    value: { required: "Discount value is required", positive: "Value must be positive" },
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
    <div className="page-container space-y-7 pb-16">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/10 p-6 sm:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold tracking-wide backdrop-blur-md">
              <Megaphone className="size-3.5 animate-pulse text-amber-500" />
              <span>MARKETING & AUTOMATED CAMPAIGNS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Promotions & Discount Rules
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Drive sales momentum, launch automated seasonal campaigns, manage percentage discounts, and reward shoppers with instant cart incentives.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              size="lg"
              onClick={() => {
                setEditItem(null);
                clearPromoAll();
                setIsAddOpen(true);
              }}
              className="gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all text-xs font-bold rounded-xl"
            >
              <Plus className="size-4" />
              Create New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Campaigns */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Campaigns
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
              <Megaphone className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {totalCampaigns}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>{activeCampaigns} active in POS checkouts</span>
            </div>
          </div>
        </div>

        {/* Live Active Deals */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Live & Active Deals
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Zap className="size-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              {activeCampaigns}
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Applied automatically when terms match
            </div>
          </div>
        </div>

        {/* Scheduled Sales */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Scheduled / Upcoming
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Clock className="size-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {scheduledCampaigns}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Starts on programmed dates
            </div>
          </div>
        </div>

        {/* Storewide & Tier Offers */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Percentage & Storewide
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Percent className="size-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {storewideCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              High-impact volume drivers
            </div>
          </div>
        </div>
      </div>

      {/* Main Campaign Directory */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card space-y-5">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              Promotional Campaigns Directory
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filter by campaign scope, status, or search titles to review and manage your automated rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background/80"
              />
            </div>

            {/* Scope Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-xl bg-background/80">
                <SelectValue placeholder="All Scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="storewide">Storewide</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-xl bg-background/80">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {isPromotionsLoading ? (
          <CardGridSkeleton cards={6} columns="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
        ) : isPromotionsError ? (
          <ErrorState onRetry={refetchPromotions} />
        ) : filteredPromotions.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No promotions found"
            description={
              search ? "Try adjusting your search query or clear filters." : "No promotional campaigns created yet."
            }
            actionLabel="Create First Campaign"
            onAction={() => {
              setEditItem(null);
              clearPromoAll();
              setIsAddOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedPromotions.map((p) => {
              const visuals = getPromotionVisuals(p.type);
              const daysInfo = getDaysRemainingStatus(p.startDate, p.endDate);

              return (
                <div
                  key={p.id}
                  className={`rounded-3xl border ${visuals.border} bg-gradient-to-br ${visuals.gradient} bg-card/70 backdrop-blur p-5.5 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-all duration-200 ${visuals.glow} group relative`}
                >
                  <div className="space-y-3.5">
                    {/* Header bar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-2xl bg-background/90 text-primary border border-border/80 shadow-sm shrink-0">
                          {visuals.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {p.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${visuals.badge} mt-0.5`}
                          >
                            {visuals.tag}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditItem(p);
                            }}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            <Edit2 className="mr-2 size-3.5 text-primary" /> Edit Campaign
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive text-xs font-semibold cursor-pointer"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Discount Value Hero Badge */}
                    <div className="p-3.5 rounded-2xl bg-background/80 border border-border/80 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Discount Incentive
                        </span>
                        <span className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                          {p.type === "percentage"
                            ? `${p.value}% OFF`
                            : `${formatCurrency(p.value)} OFF`}
                        </span>
                      </div>
                      <Badge
                        className={`text-[10px] font-extrabold capitalize px-2.5 py-1 rounded-xl border ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : p.status === "scheduled"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Eligibility Rule:
                      </span>
                      <p className="text-xs text-foreground/90 font-medium leading-relaxed line-clamp-2">
                        {p.conditions || "Applies to all eligible cart items"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Timeline */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium truncate">
                      <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${daysInfo.color}`}
                    >
                      {daysInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/80 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 pl-5">Campaign Name & Scope</th>
                  <th className="p-4">Discount Value</th>
                  <th className="p-4 min-w-[200px]">Conditions & Rules</th>
                  <th className="p-4">Validity Duration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-5">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedPromotions.map((p) => {
                  const visuals = getPromotionVisuals(p.type);
                  const daysInfo = getDaysRemainingStatus(p.startDate, p.endDate);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setEditItem(p)}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-xl bg-background text-primary border border-border/80 font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                            {visuals.icon}
                          </div>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {p.title}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {visuals.tag}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-black text-sm text-foreground">
                          {p.type === "percentage"
                            ? `${p.value}% OFF`
                            : `${formatCurrency(p.value)} OFF`}
                        </span>
                      </td>

                      <td className="p-4 text-muted-foreground font-medium">
                        <span className="line-clamp-1">{p.conditions}</span>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] font-medium text-foreground">
                          {formatDate(p.startDate)} → {formatDate(p.endDate)}
                        </div>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${daysInfo.color}`}>
                          {daysInfo.label}
                        </span>
                      </td>

                      <td className="p-4">
                        <Badge
                          className={`text-[10px] font-extrabold capitalize ${
                            p.status === "active"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : p.status === "scheduled"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>

                      <td className="p-4 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditItem(p)}
                            className="h-8 text-xs gap-1 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Edit2 className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(p.id)}
                            className="h-8 text-xs gap-1 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredPromotions.length)} of {filteredPromotions.length}{" "}
              campaigns
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs px-3 rounded-xl"
              >
                Previous
              </Button>
              <div className="flex items-center px-2 text-xs font-bold text-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs px-3 rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Promotion Side Drawer */}
      <Sheet
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearPromoAll();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl overflow-hidden"
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Hero */}
            <SheetHeader className="bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-6 border-b border-border/80 pr-12 text-left shrink-0">
              <SheetTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 text-foreground">
                <Megaphone className="size-5 text-primary" />
                {editItem ? "Edit Promotional Campaign" : "Create New Campaign"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5 font-medium">
                Configure discount rules, scope targets, validity duration, and campaign status.
              </SheetDescription>
            </SheetHeader>

            <form
              noValidate
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Live Real-time Preview Card */}
                {(() => {
                  const previewVisuals = getPromotionVisuals(formType);
                  const previewVal = parseFloat(formValue) || 0;
                  return (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="size-3 text-amber-500" />
                        Live Customer Voucher Preview
                      </Label>
                      <div
                        className={`rounded-2xl border ${previewVisuals.border} bg-gradient-to-br ${previewVisuals.gradient} bg-card/80 p-4.5 shadow-sm space-y-3`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-9 place-items-center rounded-xl bg-background text-primary border border-border shadow-xs">
                              {previewVisuals.icon}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {formTitle || "Sample Campaign Title"}
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {previewVisuals.tag}
                              </span>
                            </div>
                          </div>
                          <Badge className="text-xs font-black px-2.5 py-1 bg-primary text-primary-foreground">
                            {formType === "percentage" ? `${previewVal}% OFF` : `${formatCurrency(previewVal)} OFF`}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/80 font-medium">
                          {formConditions || "Terms and conditions apply"}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Promotion Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold">
                    Promotion Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      clearPromoError("title");
                    }}
                    placeholder="e.g. Summer Mega Weekend Sale"
                    className={`rounded-xl text-xs ${
                      promoErrors.title ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <FieldError message={promoErrors.title} />
                </div>

                {/* Scope Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Scope / Promotion Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "percentage", label: "Percentage (%)", icon: <Percent className="size-3.5" /> },
                      { id: "fixed", label: "Fixed Cash ($)", icon: <Tag className="size-3.5" /> },
                      { id: "storewide", label: "Storewide", icon: <Store className="size-3.5" /> },
                      { id: "category", label: "Category", icon: <Layers className="size-3.5" /> },
                      { id: "product", label: "Product", icon: <ShoppingBag className="size-3.5" /> },
                    ].map((typeOption) => (
                      <button
                        key={typeOption.id}
                        type="button"
                        onClick={() => setFormType(typeOption.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          formType === typeOption.id
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/30 hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {typeOption.icon}
                        <span className="truncate">{typeOption.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount Value & Quick Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="value" className="text-xs font-bold">
                      Discount Value ({formType === "percentage" ? "%" : "Amount"}) <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-1">
                      {formType === "percentage"
                        ? [5, 10, 15, 20, 25, 50].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                setFormValue(v.toString());
                                clearPromoError("value");
                              }}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                            >
                              {v}%
                            </button>
                          ))
                        : [5, 10, 25, 50, 100].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                setFormValue(v.toString());
                                clearPromoError("value");
                              }}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                            >
                              +{v}
                            </button>
                          ))}
                    </div>
                  </div>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValue}
                    onChange={(e) => {
                      setFormValue(e.target.value);
                      clearPromoError("value");
                    }}
                    placeholder="e.g. 15"
                    className={`rounded-xl text-xs font-bold ${
                      promoErrors.value ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <FieldError message={promoErrors.value} />
                </div>

                {/* Eligibility Conditions */}
                <div className="space-y-1.5">
                  <Label htmlFor="conditions" className="text-xs font-bold">
                    Conditions & Eligibility Rules <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="conditions"
                    name="conditions"
                    value={formConditions}
                    onChange={(e) => {
                      setFormConditions(e.target.value);
                      clearPromoError("conditions");
                    }}
                    placeholder="e.g. Minimum purchase of $50 on all items"
                    className={`rounded-xl text-xs ${
                      promoErrors.conditions ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  <FieldError message={promoErrors.conditions} />
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      Start Date <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={startDate}
                      onDateChange={(d) => {
                        setStartDate(d ? d.toISOString().split("T")[0] : "");
                        clearPromoError("startDate");
                      }}
                    />
                    <FieldError message={promoErrors.startDate} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      End Date <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={endDate}
                      onDateChange={(d) => {
                        setEndDate(d ? d.toISOString().split("T")[0] : "");
                        clearPromoError("endDate");
                      }}
                    />
                    <FieldError message={promoErrors.endDate} />
                  </div>
                </div>

                {/* Campaign Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Campaign Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Live in Checkouts)</SelectItem>
                      <SelectItem value="scheduled">Scheduled (Upcoming)</SelectItem>
                      <SelectItem value="expired">Expired (Inactive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Drawer Footer */}
              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditItem(null);
                    clearPromoAll();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {editItem ? "Update Campaign" : "Publish Campaign"}
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-2xl bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/25 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Delete Campaign
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
              className="rounded-xl text-xs font-semibold h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="rounded-xl text-xs font-bold h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
