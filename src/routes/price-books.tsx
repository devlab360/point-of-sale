import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/lib/currency";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Building2,
  Percent,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Loader2,
  Save,
  Check,
  Tag,
  Store,
  Filter,
  ArrowUpDown,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocationsFn } from "@/api/locations";
import { getCategoriesFn } from "@/api/categories";
import {
  getPriceBooksFn,
  createPriceBookFn,
  updatePriceBookFn,
  deletePriceBookFn,
  assignBranchPriceBooksFn,
  getPriceBookItemsFn,
  upsertPriceBookItemsFn,
  bulkAdjustPriceBookFn,
} from "@/api/price-books";
import { cn } from "@/lib/utils";

function PriceBooksComponent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const orgId = user?.orgId || "default";

  const [activeTab, setActiveTab] = useState<"books" | "branches" | "matrix">("books");

  // Tab 1 View & Filter State
  const [booksViewMode, setBooksViewMode] = useState<"grid" | "table">("table");
  const [booksSearch, setBooksSearch] = useState("");
  const [booksStatusFilter, setBooksStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");

  // Drawer states (OneDesk360 Design System Standard)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [drawerSearchBranch, setDrawerSearchBranch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "active" as "active" | "draft" | "archived",
    isDefault: false,
    assignedLocationIds: [] as string[],
  });

  // Queries
  const { data: priceBooksRes, isLoading: isBooksLoading, refetch: refetchBooks } = useQuery({
    queryKey: ["priceBooks", orgId],
    queryFn: async () => {
      const res = await getPriceBooksFn();
      return (res as any)?.data || [];
    },
  });
  const priceBooks: any[] = priceBooksRes || [];

  const { data: locationsRes, isLoading: isLocationsLoading } = useQuery({
    queryKey: ["locations", orgId],
    queryFn: async () => {
      const res = await getLocationsFn({ data: {} });
      return (res as any)?.data || [];
    },
  });
  const locations: any[] = locationsRes || [];

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => {
      const res = await getCategoriesFn({ data: {} });
      return (res as any)?.data || [];
    },
  });
  const categories: any[] = categoriesRes || [];

  // Tab 2: Branch Mapping State
  const [branchSearch, setBranchSearch] = useState("");
  const [branchFilterStatus, setBranchFilterStatus] = useState<"all" | "assigned" | "unassigned">(
    "all",
  );
  const [branchMappings, setBranchMappings] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (locations.length > 0 && priceBooks.length > 0) {
      const initialMap: Record<string, string | null> = {};
      locations.forEach((loc) => {
        const assignedBook = priceBooks.find((pb) =>
          pb.branches?.some((b: any) => b.id === loc.id),
        );
        initialMap[loc.id] = assignedBook ? assignedBook.id : null;
      });
      setBranchMappings(initialMap);
    }
  }, [locations, priceBooks]);

  // Tab 3: Rate Matrix State
  const [selectedMatrixBookId, setSelectedMatrixBookId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<
    "percentage_markup" | "percentage_discount"
  >("percentage_markup");
  const [bulkPercentage, setBulkPercentage] = useState<string>("10");
  const [editingItems, setEditingItems] = useState<
    Record<
      string,
      {
        pricingType: "fixed" | "percentage_markup" | "percentage_discount";
        customPrice: string;
        adjustmentValue: string;
      }
    >
  >({});

  useEffect(() => {
    if (!selectedMatrixBookId && priceBooks.length > 0) {
      setSelectedMatrixBookId(priceBooks[0].id);
    }
  }, [priceBooks, selectedMatrixBookId]);

  const { data: matrixItemsRes, isLoading: isMatrixLoading } = useQuery({
    queryKey: ["priceBookItems", selectedMatrixBookId, selectedCategory, matrixSearch],
    queryFn: async () => {
      if (!selectedMatrixBookId) return [];
      const res = await getPriceBookItemsFn({
        data: {
          priceBookId: selectedMatrixBookId,
          categoryId: selectedCategory,
          query: matrixSearch || undefined,
        },
      });
      return (res as any)?.data || [];
    },
    enabled: Boolean(selectedMatrixBookId),
  });
  const matrixItems: any[] = matrixItemsRes || [];

  // Sync editing items when matrix items load
  useEffect(() => {
    if (matrixItems.length > 0) {
      const currentEdits: Record<string, any> = {};
      matrixItems.forEach((it) => {
        currentEdits[it.key] = {
          pricingType: it.pricingType || "fixed",
          customPrice: it.customPrice != null ? String(it.customPrice) : "",
          adjustmentValue: it.adjustmentValue != null ? String(it.adjustmentValue) : "",
        };
      });
      setEditingItems(currentEdits);
    }
  }, [matrixItems]);

  // Mutations
  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      if (editingBook) {
        return await updatePriceBookFn({
          data: { id: editingBook.id, priceBook: formData },
        });
      } else {
        return await createPriceBookFn({ data: { priceBook: formData } });
      }
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(editingBook ? "Rate chart updated" : "New rate chart created");
        queryClient.invalidateQueries({ queryKey: ["priceBooks", orgId] });
        setIsDrawerOpen(false);
      } else {
        toast.error(res?.error || "Operation failed");
      }
    },
    onError: () => toast.error("Failed to save price book"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePriceBookFn({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Rate chart deleted");
        queryClient.invalidateQueries({ queryKey: ["priceBooks", orgId] });
      } else {
        toast.error(res?.error || "Failed to delete rate chart");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete rate chart"),
  });

  const saveBranchMappingsMutation = useMutation({
    mutationFn: async () => {
      const mappings = Object.entries(branchMappings).map(([locId, pbId]) => ({
        locationId: locId,
        priceBookId: pbId,
      }));
      return await assignBranchPriceBooksFn({ data: { mappings } });
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("rateChartAssignmentsUpdated", "All branch rate chart assignments updated successfully"));
        queryClient.invalidateQueries({ queryKey: ["priceBooks", orgId] });
      } else {
        toast.error(res?.error || "Failed to update branch mappings");
      }
    },
  });

  const bulkAdjustMutation = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(bulkPercentage);
      if (isNaN(pct) || pct <= 0) throw new Error("Enter a valid percentage");
      return await bulkAdjustPriceBookFn({
        data: {
          priceBookId: selectedMatrixBookId,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
          adjustmentType: bulkAdjustmentType,
          percentage: pct,
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Bulk adjustment applied");
        queryClient.invalidateQueries({ queryKey: ["priceBookItems"] });
        queryClient.invalidateQueries({ queryKey: ["priceBooks", orgId] });
      } else {
        toast.error(res?.error || "Bulk adjustment failed");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to apply bulk adjustment"),
  });

  const saveMatrixItemsMutation = useMutation({
    mutationFn: async () => {
      const itemsToSave = Object.entries(editingItems).map(([key, val]) => {
        const item = matrixItems.find((m) => m.key === key);
        return {
          productId: item.productId,
          variantId: item.variantId || null,
          pricingType: val.pricingType,
          customPrice: val.pricingType === "fixed" && val.customPrice ? val.customPrice : null,
          adjustmentValue:
            val.pricingType !== "fixed" && val.adjustmentValue ? val.adjustmentValue : null,
        };
      });
      return await upsertPriceBookItemsFn({
        data: {
          priceBookId: selectedMatrixBookId,
          items: itemsToSave,
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("rateChartRulesSaved", "Rate chart rules saved successfully"));
        queryClient.invalidateQueries({ queryKey: ["priceBookItems"] });
        queryClient.invalidateQueries({ queryKey: ["priceBooks", orgId] });
      } else {
        toast.error(res?.error || "Failed to save rate chart rules");
      }
    },
  });

  const handleOpenCreate = () => {
    setEditingBook(null);
    setDrawerSearchBranch("");
    setFormData({
      name: "",
      code: "",
      description: "",
      status: "active",
      isDefault: false,
      assignedLocationIds: [],
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (book: any) => {
    setEditingBook(book);
    setDrawerSearchBranch("");
    setFormData({
      name: book.name,
      code: book.code,
      description: book.description || "",
      status: book.status || "active",
      isDefault: Boolean(book.isDefault),
      assignedLocationIds: (book.branches || []).map((b: any) => b.id),
    });
    setIsDrawerOpen(true);
  };

  // Filtered price books in Tab 1
  const filteredPriceBooks = useMemo(() => {
    return priceBooks.filter((pb) => {
      const matchesSearch =
        !booksSearch.trim() ||
        pb.name?.toLowerCase().includes(booksSearch.toLowerCase()) ||
        pb.code?.toLowerCase().includes(booksSearch.toLowerCase()) ||
        pb.description?.toLowerCase().includes(booksSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (booksStatusFilter === "all") return true;
      return pb.status === booksStatusFilter;
    });
  }, [priceBooks, booksSearch, booksStatusFilter]);

  // Filtered locations in Tab 2
  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      const matchesQuery =
        !branchSearch.trim() ||
        l.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
        (l.type && l.type.toLowerCase().includes(branchSearch.toLowerCase())) ||
        (l.city && l.city.toLowerCase().includes(branchSearch.toLowerCase()));

      if (!matchesQuery) return false;

      const isAssigned = Boolean(branchMappings[l.id]);
      if (branchFilterStatus === "assigned") return isAssigned;
      if (branchFilterStatus === "unassigned") return !isAssigned;
      return true;
    });
  }, [locations, branchSearch, branchFilterStatus, branchMappings]);

  // Drawer branch list filtered by search
  const drawerFilteredLocations = useMemo(() => {
    if (!drawerSearchBranch.trim()) return locations;
    const q = drawerSearchBranch.toLowerCase();
    return locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [locations, drawerSearchBranch]);

  const assignedCount = Object.values(branchMappings).filter(Boolean).length;
  const currentSelectedBook = priceBooks.find((p) => p.id === selectedMatrixBookId);

  return (
    <div className="page-container space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Premium Page Header */}
      <PageHeader
        title={t("priceBooksTitle", "Price Books & Multi-Branch Rate Charts")}
        description={t(
          "priceBooksDesc",
          "Unified pricing zones, franchise tiers, and location rate schedules across all store outlets without product catalog duplication.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchBooks()}
              className="rounded-xl h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs border-border/80"
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
              <span>{t("refresh", "Refresh")}</span>
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl h-9 text-xs font-bold shadow-soft gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              <Plus className="size-4" />
              <span>{t("newRateChart", "New Rate Chart")}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t("priceBooksRateCharts", "Price Books")}
          value={String(priceBooks.length)}
          hint={t("activePricingTiersZones", "Configured pricing tiers")}
          icon={BookOpen}
          accent="primary"
        />
        <StatCard
          label={t("assignedOutlets", "Assigned Outlets")}
          value={`${assignedCount} / ${locations.length}`}
          hint={`${locations.length - assignedCount} ${t("branchesUsingCatalog", "using standard base catalog")}`}
          icon={Building2}
          accent="info"
        />
        <StatCard
          label={t("defaultFallbackBook", "Default Fallback")}
          value={priceBooks.find((p) => p.isDefault)?.code || t("catalogPrice", "Base Catalog")}
          hint={t("systemFallbackUnlisted", "Fallback for unassigned outlets")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("activeTiers", "Active Tiers")}
          value={String(priceBooks.filter((p) => p.status === "active").length)}
          hint={t("outletsOverridingRates", "Live tiers overriding base rates")}
          icon={Layers}
          accent="warning"
        />
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="overflow-x-auto scrollbar-none border-b border-border/60 pb-2">
          <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto gap-1 border border-border/60 inline-flex">
            <TabsTrigger
              value="books"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-xl px-3.5 py-2 text-xs font-bold gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="size-3.5" />
              <span>{t("rateChartTiers", "Rate Chart Tiers")}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-black text-primary">
                {priceBooks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="branches"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-xl px-3.5 py-2 text-xs font-bold gap-2 transition-all cursor-pointer"
            >
              <Store className="size-3.5" />
              <span>{t("outletMappingMatrix", "Outlet Mapping Matrix")}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-black text-primary">
                {locations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="matrix"
              className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs rounded-xl px-3.5 py-2 text-xs font-bold gap-2 transition-all cursor-pointer"
            >
              <Percent className="size-3.5" />
              <span>{t("rateMatrixAndBulkAdjuster", "Rate Matrix & Bulk Adjuster")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: PRICE BOOKS & TIERS ── */}
        <TabsContent value="books" className="space-y-4 pt-1">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder={t("searchRateChartsPlaceholder", "Search by tier name, code, or description...")}
                  value={booksSearch}
                  onChange={(e) => setBooksSearch(e.target.value)}
                  className="pl-9 rounded-xl h-10 text-xs bg-background"
                />
                {booksSearch && (
                  <button
                    onClick={() => setBooksSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                {(["all", "active", "draft", "archived"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBooksStatusFilter(st)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                      booksStatusFilter === st
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(st, st)}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 shrink-0 self-end sm:self-auto">
              <Button
                variant={booksViewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setBooksViewMode("grid")}
                title={t("gridCardsView", "Grid Cards View")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={booksViewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setBooksViewMode("table")}
                title={t("tableView", "Table View")}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>

          {/* Rate Charts Content Display */}
          {isBooksLoading ? (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-muted-foreground">
              <Loader2 className="size-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="font-semibold text-sm">{t("loadingRateCharts", "Loading rate chart tiers...")}</p>
            </div>
          ) : filteredPriceBooks.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center">
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mx-auto mb-3">
                <BookOpen className="size-7" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                {booksSearch || booksStatusFilter !== "all"
                  ? t("noMatchingRateCharts", "No rate charts match your filter")
                  : t("noRateChartsYet", "No rate charts created yet")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {booksSearch || booksStatusFilter !== "all"
                  ? t("tryResettingFilters", "Try adjusting your search terms or clearing status filters.")
                  : t(
                      "noRateChartsDesc",
                      "Create pricing tiers (e.g. Airport Outlets, Franchise Stores, Metro Hubs) to govern prices across locations without duplicating products.",
                    )}
              </p>
              {!booksSearch && booksStatusFilter === "all" && (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
                >
                  <Plus className="size-4" />
                  <span>{t("createFirstRateChart", "Create First Rate Chart")}</span>
                </Button>
              )}
            </div>
          ) : booksViewMode === "grid" ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPriceBooks.map((book) => {
                const branchList = book.branches || [];
                return (
                  <div
                    key={book.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/50 hover:shadow-card transition-all duration-200"
                  >
                    <div>
                      {/* Card Top: Code Badge & Status & Menu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                            {book.code}
                          </span>
                          {book.isDefault && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                              {t("defaultFallback", "Default")}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge
                            variant={book.status === "active" ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] font-bold capitalize",
                              book.status === "active" &&
                                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            )}
                          >
                            {t(book.status, book.status)}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-soft">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(book)}
                                className="gap-2 cursor-pointer text-xs font-medium"
                              >
                                <Edit2 className="size-3.5 text-muted-foreground" />
                                <span>{t("editTierDetails", "Edit Tier Details")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMatrixBookId(book.id);
                                  setActiveTab("matrix");
                                }}
                                className="gap-2 cursor-pointer text-xs font-medium text-primary"
                              >
                                <Percent className="size-3.5" />
                                <span>{t("manageRatesAndMatrix", "Manage Rates & Matrix")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete rate chart "${book.name}"?`)) {
                                    deleteMutation.mutate(book.id);
                                  }
                                }}
                                className="gap-2 cursor-pointer text-xs font-medium text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span>{t("deleteRateChart", "Delete Rate Chart")}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-base text-foreground mt-3 leading-snug">
                        {book.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {book.description || t("noDescriptionProvided", "No description provided.")}
                      </p>

                      {/* Outlets Pill List */}
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                          <span>{t("mappedOutlets", "Mapped Outlets")}</span>
                          <span>{branchList.length} {t("branches", "branches")}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {branchList.length > 0 ? (
                            branchList.map((b: any) => (
                              <span
                                key={b.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/70 text-[10px] font-medium text-foreground"
                              >
                                <Store className="size-2.5 text-primary" />
                                <span>{b.name}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground/70 italic">
                              {t("noOutletsMapped", "No outlets mapped (unassigned)")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Tag className="size-3.5" />
                        <span>{book.itemCount || 0} {t("customRules", "custom rules")}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMatrixBookId(book.id);
                          setActiveTab("matrix");
                        }}
                        className="h-8 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 gap-1 px-2.5"
                      >
                        <span>{t("manageMatrix", "Manage Matrix")}</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold text-xs py-3.5 min-w-[200px]">
                        {t("tierNameAndCode", "Tier Name & Code")}
                      </TableHead>
                      <TableHead className="font-bold text-xs min-w-[200px]">
                        {t("description", "Description")}
                      </TableHead>
                      <TableHead className="font-bold text-xs min-w-[100px]">
                        {t("status", "Status")}
                      </TableHead>
                      <TableHead className="font-bold text-xs min-w-[250px]">
                        {t("assignedOutlets", "Assigned Outlets")}
                      </TableHead>
                      <TableHead className="font-bold text-xs text-right min-w-[120px]">
                        {t("itemsConfigured", "Items Configured")}
                      </TableHead>
                      <TableHead className="w-[80px] text-right font-bold text-xs">
                        {t("actions", "Actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPriceBooks.map((book) => (
                      <TableRow key={book.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary font-bold shrink-0">
                              <Tag className="size-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <span>{book.name}</span>
                                {book.isDefault && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                    {t("defaultFallback", "Default")}
                                  </Badge>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-muted-foreground font-semibold">
                                {book.code}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                          {book.description || <span className="italic text-muted-foreground/60">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={book.status === "active" ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] capitalize font-bold",
                              book.status === "active" &&
                                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            )}
                          >
                            {t(book.status, book.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[340px]">
                            {book.branches && book.branches.length > 0 ? (
                              book.branches.map((b: any) => (
                                <Badge
                                  key={b.id}
                                  variant="outline"
                                  className="text-[10px] font-medium bg-muted/40 border-border/80 text-foreground"
                                >
                                  {b.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {t("noOutletsMapped", "No outlets mapped")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-primary">
                          {book.itemCount || 0} {t("items", "items")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-soft">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(book)}
                                className="gap-2 cursor-pointer text-xs font-medium"
                              >
                                <Edit2 className="size-3.5 text-muted-foreground" />
                                <span>{t("editTierDetails", "Edit Tier Details")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMatrixBookId(book.id);
                                  setActiveTab("matrix");
                                }}
                                className="gap-2 cursor-pointer text-xs font-medium text-primary"
                              >
                                <Percent className="size-3.5" />
                                <span>{t("manageRatesAndMatrix", "Manage Rates & Matrix")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete rate chart "${book.name}"?`)) {
                                    deleteMutation.mutate(book.id);
                                  }
                                }}
                                className="gap-2 cursor-pointer text-xs font-medium text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span>{t("deleteRateChart", "Delete Rate Chart")}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: OUTLET MAPPING MATRIX ── */}
        <TabsContent value="branches" className="space-y-4 pt-1">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder={t("searchOutletsPlaceholder", "Search outlets by name or city...")}
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="pl-9 rounded-xl h-10 text-xs bg-background"
                />
                {branchSearch && (
                  <button
                    onClick={() => setBranchSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setBranchFilterStatus("all")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    branchFilterStatus === "all"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("all", "All")} ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBranchFilterStatus("assigned")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    branchFilterStatus === "assigned"
                      ? "bg-background text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("assigned", "Assigned")} ({assignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBranchFilterStatus("unassigned")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    branchFilterStatus === "unassigned"
                      ? "bg-background text-muted-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("unassigned", "Unassigned")} ({locations.length - assignedCount})
                </button>
              </div>
            </div>

            <Button
              onClick={() => saveBranchMappingsMutation.mutate()}
              disabled={saveBranchMappingsMutation.isPending}
              className="rounded-xl font-bold shadow-soft gap-2 w-full sm:w-auto cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 text-xs"
            >
              {saveBranchMappingsMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>{t("saveAllMappings", "Save All Mappings")}</span>
            </Button>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs py-3.5 min-w-[220px]">
                      {t("branchOutletName", "Branch / Outlet Name")}
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[120px]">
                      {t("outletType", "Outlet Type")}
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[140px]">
                      {t("locationCity", "Location / City")}
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[280px]">
                      {t("assignedPriceBookRateChart", "Assigned Rate Chart Tier")}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right min-w-[140px]">
                      {t("pricingMode", "Pricing Mode")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLocationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>{t("loadingOutlets", "Loading outlets...")}</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                        {t("noBranchesMatched", "No branches matched your filter criteria.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((loc) => {
                      const currentPbId = branchMappings[loc.id] || "default";
                      const assignedPb = priceBooks.find((p) => p.id === currentPbId);
                      return (
                        <TableRow key={loc.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                                <Building2 className="size-4" />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                  <span>{loc.name}</span>
                                  {loc.isHeadOffice && (
                                    <Badge variant="outline" className="text-[10px] font-bold py-0">
                                      HQ
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {loc.code || loc.id.slice(0, 10)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-xs text-muted-foreground">
                            {loc.type || t("storeOutlet", "Store Outlet")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {loc.city || loc.address || <span className="italic">—</span>}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={currentPbId || "default"}
                              onValueChange={(val) =>
                                setBranchMappings((prev) => ({
                                  ...prev,
                                  [loc.id]: val === "default" ? null : val,
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs font-semibold bg-background border-border/80 shadow-2xs">
                                <SelectValue placeholder={t("standardCatalogBasePrice", "Standard Catalog Base Price")} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-soft">
                                <SelectItem value="default" className="text-xs font-medium">
                                  {t("standardCatalogBasePriceNoOverride", "Standard Catalog Base Price (No Tier Override)")}
                                </SelectItem>
                                {priceBooks.map((pb) => (
                                  <SelectItem
                                    key={pb.id}
                                    value={pb.id}
                                    className="text-xs font-medium cursor-pointer"
                                  >
                                    {pb.name} ({pb.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            {assignedPb ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                                {assignedPb.code} {t("active", "Active")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {t("defaultCatalog", "Default Catalog")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: RATE MATRIX & BULK ADJUSTER ── */}
        <TabsContent value="matrix" className="space-y-4 pt-1">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              {/* Select Rate Chart Tier */}
              <div className="flex-1 min-w-[200px] sm:min-w-[220px]">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  {t("selectRateChartTier", "Rate Chart Tier")}
                </Label>
                <Select
                  value={selectedMatrixBookId}
                  onValueChange={(val) => setSelectedMatrixBookId(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-background shadow-2xs">
                    <SelectValue placeholder={t("choosePriceBook", "Choose Rate Chart...")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-soft">
                    {priceBooks.map((pb) => (
                      <SelectItem key={pb.id} value={pb.id} className="text-xs font-bold cursor-pointer">
                        {pb.name} ({pb.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="flex-1 min-w-[160px] sm:min-w-[180px]">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  {t("categoryFilter", "Category Filter")}
                </Label>
                <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold bg-background shadow-2xs">
                    <SelectValue placeholder={t("allCategories", "All Categories")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-soft">
                    <SelectItem value="all">{t("allCategories", "All Categories")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id || c.name} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SKU / Item Search */}
              <div className="flex-1 min-w-[180px] sm:min-w-[200px]">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">
                  {t("searchSkuItem", "Search SKU / Item")}
                </Label>
                <div className="relative">
                  <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder={t("searchNameOrBarcode", "Search product or SKU...")}
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="pl-8 rounded-xl h-10 text-xs bg-background"
                  />
                  {matrixSearch && (
                    <button
                      onClick={() => setMatrixSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => saveMatrixItemsMutation.mutate()}
              disabled={saveMatrixItemsMutation.isPending || !selectedMatrixBookId}
              className="rounded-xl font-bold shadow-soft gap-2 self-end lg:self-auto cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 text-xs shrink-0"
            >
              {saveMatrixItemsMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>{t("saveRateChartRules", "Save Rate Chart Rules")}</span>
            </Button>
          </div>

          {/* Bulk Category Adjuster Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-primary/15 grid place-items-center text-primary shrink-0 border border-primary/25 shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{t("bulkTierRuleAdjuster", "Bulk Tier Rule Adjuster")}</span>
                  {currentSelectedBook && (
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background">
                      {currentSelectedBook.code}
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("applyBlanketPercentageDesc", "Apply a blanket percentage markup or discount to all items in")}{" "}
                  <span className="font-bold text-foreground">
                    {selectedCategory === "all"
                      ? t("theEntireCatalog", "the entire catalog")
                      : t("theSelectedCategory", "the selected category")}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select
                value={bulkAdjustmentType}
                onValueChange={(val: any) => setBulkAdjustmentType(val)}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold w-[150px] sm:w-[160px] bg-background shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-soft">
                  <SelectItem value="percentage_markup" className="text-xs font-bold text-emerald-600">
                    + % {t("markup", "Markup")}
                  </SelectItem>
                  <SelectItem value="percentage_discount" className="text-xs font-bold text-rose-600">
                    - % {t("discount", "Discount")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-20 sm:w-24">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  className="h-10 rounded-xl text-xs font-bold pr-6 bg-background shadow-2xs"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  %
                </span>
              </div>

              <Button
                variant="secondary"
                onClick={() => bulkAdjustMutation.mutate()}
                disabled={bulkAdjustMutation.isPending || !selectedMatrixBookId}
                className="rounded-xl font-bold h-10 text-xs shadow-2xs gap-1.5 cursor-pointer shrink-0 border border-border/80"
              >
                {bulkAdjustMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
                <span>{t("applyRule", "Apply Rule")}</span>
              </Button>
            </div>
          </div>

          {/* Rate Matrix Table */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs py-3.5 min-w-[200px]">
                      {t("productAndVariant", "Product & Variant")}
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[120px]">
                      {t("skuBarcode", "SKU / Barcode")}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right min-w-[120px]">
                      {t("baseCatalogPrice", "Base Catalog Price")}
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[160px]">
                      {t("pricingRule", "Pricing Rule")}
                    </TableHead>
                    <TableHead className="font-bold text-xs w-[160px] min-w-[140px]">
                      {t("customInput", "Custom Value")}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right min-w-[140px]">
                      {t("effectiveOutletPrice", "Effective Outlet Price")}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right min-w-[130px]">
                      {t("priceDifference", "Difference")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMatrixLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>{t("loadingRateMatrix", "Loading rate matrix...")}</span>
                      </TableCell>
                    </TableRow>
                  ) : matrixItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-36 text-center text-muted-foreground text-xs">
                        {t("noProductsFoundInCategory", "No products found matching your search or category filter.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    matrixItems.map((item) => {
                      const edit = editingItems[item.key] || {
                        pricingType: "fixed",
                        customPrice: "",
                        adjustmentValue: "",
                      };

                      const base = item.basePrice;
                      let computed = base;
                      if (edit.pricingType === "fixed" && edit.customPrice) {
                        computed = parseFloat(edit.customPrice) || base;
                      } else if (edit.pricingType === "percentage_markup" && edit.adjustmentValue) {
                        computed = base * (1 + (parseFloat(edit.adjustmentValue) || 0) / 100);
                      } else if (edit.pricingType === "percentage_discount" && edit.adjustmentValue) {
                        computed = Math.max(
                          0,
                          base * (1 - (parseFloat(edit.adjustmentValue) || 0) / 100),
                        );
                      }

                      const diff = computed - base;

                      return (
                        <TableRow key={item.key} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3">
                            <div className="font-bold text-sm text-foreground">{item.productName}</div>
                            {item.variantName && (
                              <Badge variant="outline" className="text-[10px] font-semibold mt-0.5">
                                {t("variant", "Variant")}: {item.variantName}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.sku || "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm text-muted-foreground">
                            {formatCurrency(base)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={edit.pricingType}
                              onValueChange={(val: any) =>
                                setEditingItems((prev) => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key], pricingType: val },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-background shadow-2xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-soft">
                                <SelectItem value="fixed" className="text-xs font-semibold">
                                  {t("fixedPrice", "Fixed Price")}
                                </SelectItem>
                                <SelectItem
                                  value="percentage_markup"
                                  className="text-xs font-semibold text-emerald-600"
                                >
                                  + % {t("markup", "Markup")}
                                </SelectItem>
                                <SelectItem
                                  value="percentage_discount"
                                  className="text-xs font-semibold text-rose-600"
                                >
                                  - % {t("discount", "Discount")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {edit.pricingType === "fixed" ? (
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={String(base)}
                                  value={edit.customPrice}
                                  onChange={(e) =>
                                    setEditingItems((prev) => ({
                                      ...prev,
                                      [item.key]: { ...prev[item.key], customPrice: e.target.value },
                                    }))
                                  }
                                  className="h-9 rounded-xl text-xs font-bold bg-background shadow-2xs"
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.5"
                                  placeholder="e.g. 15"
                                  value={edit.adjustmentValue}
                                  onChange={(e) =>
                                    setEditingItems((prev) => ({
                                      ...prev,
                                      [item.key]: {
                                        ...prev[item.key],
                                        adjustmentValue: e.target.value,
                                      },
                                    }))
                                  }
                                  className="h-9 rounded-xl pr-6 text-xs font-bold bg-background shadow-2xs"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                  %
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-black text-sm text-primary">
                            {formatCurrency(computed)}
                          </TableCell>
                          <TableCell className="text-right">
                            {Math.abs(diff) < 0.001 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : diff > 0 ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                                <TrendingUp className="size-3" /> +{formatCurrency(diff)}
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold gap-1">
                                <TrendingDown className="size-3" /> -{formatCurrency(Math.abs(diff))}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── SLIDE-OUT DRAWER (OneDesk360 Design System Standard) ── */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          {/* Fixed Header */}
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
            <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
                <BookOpen className="size-4.5" />
              </div>
              <span>{editingBook ? t("editRateChartTier", "Edit Rate Chart Tier") : t("newRateChartTier", "New Rate Chart Tier")}</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              {t("rateChartDrawerDesc", "Define pricing tier parameters, fallback behavior, and multi-branch assignment.")}
            </SheetDescription>
          </SheetHeader>

          {/* Isolated Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("tierName", "Tier Name")} *</Label>
                <Input
                  placeholder={t("tierNamePlaceholder", "e.g. Airport & Transit Terminals")}
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-xl text-xs h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("codeIdentifier", "Code Identifier")} *</Label>
                <Input
                  placeholder={t("codePlaceholder", "e.g. PB-AIRPORT")}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                  }
                  className="rounded-xl text-xs h-10 uppercase font-mono bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("description", "Description")}</Label>
              <Input
                placeholder={t("tierDescriptionPlaceholder", "e.g. 15% margin surcharge applied to premium transit terminals")}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="rounded-xl text-xs h-10 bg-background"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("status", "Status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs font-medium bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-soft">
                    <SelectItem value="active" className="text-xs font-medium">
                      {t("active", "Active")}
                    </SelectItem>
                    <SelectItem value="draft" className="text-xs font-medium">
                      {t("draftInactive", "Draft (Inactive)")}
                    </SelectItem>
                    <SelectItem value="archived" className="text-xs font-medium">
                      {t("archived", "Archived")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                    className="size-4 rounded accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{t("defaultFallbackBook", "Default Fallback Book")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("autoAppliesUnassigned", "Auto-applies to unassigned branches")}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Branch Assignment Section */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">{t("assignOutletsToTier", "Assign Outlets to this Tier")}</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {t("assignOutletsDesc", "Selected outlets will automatically adopt this rate chart in POS.")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {formData.assignedLocationIds.length} {t("selected", "Selected")}
                </Badge>
              </div>

              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder={t("filterOutlets", "Filter outlets...")}
                  value={drawerSearchBranch}
                  onChange={(e) => setDrawerSearchBranch(e.target.value)}
                  className="pl-8 rounded-xl h-9 text-xs bg-background"
                />
                {drawerSearchBranch && (
                  <button
                    onClick={() => setDrawerSearchBranch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto border border-border/80 rounded-xl p-2 space-y-1 bg-muted/10 divide-y divide-border/40">
                {drawerFilteredLocations.map((loc) => {
                  const isChecked = formData.assignedLocationIds.includes(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((p) => ({
                                ...p,
                                assignedLocationIds: [...p.assignedLocationIds, loc.id],
                              }));
                            } else {
                              setFormData((p) => ({
                                ...p,
                                assignedLocationIds: p.assignedLocationIds.filter((id) => id !== loc.id),
                              }));
                            }
                          }}
                          className="size-4 rounded accent-primary"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {loc.city || loc.address || "Main City"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {loc.type || "Store"}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions Footer */}
          <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => createOrUpdateMutation.mutate()}
              disabled={
                createOrUpdateMutation.isPending ||
                !formData.name.trim() ||
                !formData.code.trim()
              }
              className="rounded-xl h-10 text-xs font-bold shadow-soft cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createOrUpdateMutation.isPending && (
                <Loader2 className="size-4 mr-1 animate-spin" />
              )}
              <span>{editingBook ? t("saveChanges", "Save Changes") : t("createRateChart", "Create Rate Chart")}</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const Route = createFileRoute("/price-books")({
  head: () => ({ meta: [{ title: `Price Books & Rate Charts · ${appName}` }] }),
  component: PriceBooksComponent,
});
