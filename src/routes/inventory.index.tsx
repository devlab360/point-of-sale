import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Boxes,
  Building2,
  Package,
  Search,
  Download,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  History,
  TrendingDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { parseCSV, exportToCSV } from "@/lib/csv";
import { getCategoriesFn } from "@/api/categories";
import {
  getMultiBranchStockMatrixFn,
  updateMultiBranchStockMatrixFn,
  bulkImportStockMatrixFn,
} from "@/api/inventory";

function InventoryDashboard() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocationColumn, setSelectedLocationColumn] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Track modified cells: { [`${rowKey}:${locId}`]: { productId, variantId, locationId, newStock } }
  const [dirtyCells, setDirtyCells] = useState<
    Record<
      string,
      {
        productId: string;
        variantId?: string | null;
        locationId: string;
        newStock: number;
        originalStock: number;
      }
    >
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Queries
  const {
    data: matrixData,
    isLoading: isMatrixLoading,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ["multiBranchStockMatrix", search, selectedCategory],
    queryFn: async () => {
      const res = await getMultiBranchStockMatrixFn({
        data: {
          query: search || undefined,
          categoryId: selectedCategory,
        },
      });
      return (
        (res as any) || {
          locations: [],
          rows: [],
        }
      );
    },
  });

  const locations: any[] = matrixData?.locations || [];
  const rows: any[] = matrixData?.rows || [];

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
  });
  const categories: any[] = categoriesRes || [];

  // Mutations
  const saveMatrixMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.values(dirtyCells).map((c) => ({
        productId: c.productId,
        variantId: c.variantId || null,
        locationId: c.locationId,
        newStock: c.newStock,
        reason: "Interactive Stock Matrix Quick Adjustment",
      }));
      return await updateMultiBranchStockMatrixFn({ data: { updates } });
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res.message || "Stock changes saved successfully");
        setDirtyCells({});
        queryClient.invalidateQueries({ queryKey: ["multiBranchStockMatrix"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      } else {
        toast.error(res?.error || "Failed to save stock updates");
      }
    },
    onError: () => toast.error("An error occurred while saving stock changes"),
  });

  const handleCellChange = (
    row: any,
    locationId: string,
    valStr: string,
    currentStock: number,
  ) => {
    const cellKey = `${row.key}:${locationId}`;
    const newStock = Math.max(0, parseInt(valStr, 10) || 0);

    if (newStock === currentStock) {
      // Reverted to original
      setDirtyCells((prev) => {
        const copy = { ...prev };
        delete copy[cellKey];
        return copy;
      });
    } else {
      setDirtyCells((prev) => ({
        ...prev,
        [cellKey]: {
          productId: row.productId,
          variantId: row.variantId || null,
          locationId,
          newStock,
          originalStock: currentStock,
        },
      }));
    }
  };

  const handleDiscardChanges = () => {
    setDirtyCells({});
    toast.info("Unsaved stock matrix modifications discarded");
  };

  // Master CSV Export
  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No inventory data to export");
      return;
    }

    const exportData = rows.map((r) => {
      const rowObj: Record<string, any> = {
        "Product Name": r.productName + (r.variantName ? ` (${r.variantName})` : ""),
        SKU: r.sku || "",
        Barcode: r.barcode || "",
        Category: r.category || "",
        "Total Stock": r.totalStock || 0,
      };

      locations.forEach((loc) => {
        rowObj[loc.name] = r.branchStocks[loc.id]?.stock || 0;
      });

      return rowObj;
    });

    const columns = [
      { key: "Product Name", label: "Product Name" },
      { key: "SKU", label: "SKU" },
      { key: "Barcode", label: "Barcode" },
      { key: "Category", label: "Category" },
      { key: "Total Stock", label: "Total Stock" },
      ...locations.map((loc) => ({ key: loc.name, label: loc.name })),
    ];

    exportToCSV(exportData, columns, `Stock_Matrix_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Stock matrix exported to CSV");
  };

  // Master CSV Import
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const parsedRows = await parseCSV(file);
      if (parsedRows.length === 0) {
        toast.error("CSV file is empty or formatted incorrectly");
        return;
      }

      // Map headers to locationIds
      const locHeaderMap = new Map<string, string>();
      locations.forEach((loc) => {
        locHeaderMap.set(loc.name.trim().toLowerCase(), loc.id);
      });

      const importPayload: {
        sku: string;
        branchStocks: { locationId: string; stock: number }[];
      }[] = [];

      parsedRows.forEach((row) => {
        const sku = row["SKU"] || row["sku"];
        if (!sku) return;

        const branchStocks: { locationId: string; stock: number }[] = [];

        Object.entries(row).forEach(([header, val]) => {
          const locId = locHeaderMap.get(header.trim().toLowerCase());
          if (locId) {
            const parsedStock = parseFloat(val);
            if (!isNaN(parsedStock) && parsedStock >= 0) {
              branchStocks.push({ locationId: locId, stock: parsedStock });
            }
          }
        });

        if (branchStocks.length > 0) {
          importPayload.push({ sku: sku.trim(), branchStocks });
        }
      });

      if (importPayload.length === 0) {
        toast.error("No valid branch stock data found in CSV");
        return;
      }

      const res = await bulkImportStockMatrixFn({ data: { rows: importPayload } });
      if (res?.success) {
        toast.success(res.message || "Master stock matrix imported successfully!");
        queryClient.invalidateQueries({ queryKey: ["multiBranchStockMatrix"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      } else {
        toast.error(res?.error || "Import failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process CSV import");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // KPI Calculations
  const totalItemsCount = rows.length;
  const totalUnitsInNetwork = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.totalStock || 0), 0);
  }, [rows]);

  const lowStockCount = useMemo(() => {
    let count = 0;
    rows.forEach((r) => {
      locations.forEach((loc) => {
        const bs = r.branchStocks[loc.id];
        if (bs && bs.stock <= (bs.reorderLevel || 5)) {
          count++;
        }
      });
    });
    return count;
  }, [rows, locations]);

  const displayedLocations = useMemo(() => {
    if (selectedLocationColumn === "all") return locations;
    return locations.filter((l) => l.id === selectedLocationColumn);
  }, [locations, selectedLocationColumn]);

  const filteredRows = useMemo(() => {
    if (stockFilter === "all") return rows;
    return rows.filter((r) => {
      const activeLocs = selectedLocationColumn === "all" ? locations : locations.filter((l) => l.id === selectedLocationColumn);
      return activeLocs.some((loc) => {
        const bs = r.branchStocks[loc.id];
        const stock = bs ? bs.stock : 0;
        const reorder = bs?.reorderLevel || 5;
        if (stockFilter === "out") return stock === 0;
        if (stockFilter === "low") return stock > 0 && stock <= reorder;
        return true;
      });
    });
  }, [rows, locations, stockFilter, selectedLocationColumn]);

  const dirtyCount = Object.keys(dirtyCells).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader
        title={t("multiBranchStockMatrix", "Multi-Branch Stock Matrix & Inventory Master")}
        description={t("multiBranchStockMatrixDesc", "Monitor, reconcile, and rapidly edit physical stock across store branches, transit hubs, and regional warehouses.")}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs border-border/80"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>{t("exportMatrixCsv", "Export Matrix CSV")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="rounded-xl h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs border-border/80"
            >
              {isImporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5 text-muted-foreground" />
              )}
              <span>{t("importMatrixCsv", "Import Matrix CSV")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMatrix()}
              className="rounded-xl h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs border-border/80"
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
              <span>{t("refresh", "Refresh")}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalCatalogItems", "Total Catalog Items")}
          value={String(totalItemsCount)}
          hint={t("productsActiveVariants", "Products & active variants")}
          icon={Package}
          accent="primary"
        />
        <StatCard
          label={t("totalUnitsInNetwork", "Total Units in Network")}
          value={totalUnitsInNetwork.toLocaleString()}
          hint={t("aggregateNetworkBranches", "Aggregate across all network branches")}
          icon={Boxes}
          accent="info"
        />
        <StatCard
          label={t("lowStockAlerts", "Low Stock Alerts")}
          value={String(lowStockCount)}
          hint={t("reorderLevelThreshold", "Branch stock points ≤ reorder level")}
          icon={AlertTriangle}
          accent={lowStockCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("activeStoreOutlets", "Active Store Outlets")}
          value={String(locations.length)}
          hint={t("physicalStoresHubs", "Physical stores & logistics hubs")}
          icon={Building2}
          accent="primary"
        />
      </div>

      {/* Filter and Matrix Controls */}
      <div className="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-soft">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={t("searchProductInventory", "Search product by name, SKU, barcode...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl h-10 text-xs bg-background"
              />
            </div>

            {/* Category Filter */}
            <div className="w-[180px]">
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

            {/* Branch Column Visibility */}
            <div className="w-[220px]">
              <Select
                value={selectedLocationColumn}
                onValueChange={(val) => setSelectedLocationColumn(val)}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs font-semibold bg-background shadow-2xs">
                  <SelectValue placeholder="All Store Branches" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-soft">
                  <SelectItem value="all">View All Store Outlets</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="text-xs">
                      Focus: {loc.name} {loc.isHeadOffice ? "(HQ)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Condition Quick Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Items ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === "low"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-muted-foreground hover:text-amber-500"
              }`}
            >
              <AlertTriangle className="size-3 text-amber-500" />
              <span>Low Stock ({lowStockCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === "out"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-2xs"
                  : "text-muted-foreground hover:text-rose-500"
              }`}
            >
              <span className="size-2 rounded-full bg-rose-500 inline-block" />
              <span>Depleted</span>
            </button>
          </div>
        </div>

        {/* Action Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Low Stock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Out of Stock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary inline-block animate-pulse" />
            <span>Unsaved Edit</span>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE MULTI-BRANCH STOCK MATRIX TABLE ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto max-h-[680px]">
          <Table className="relative">
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="border-b border-border/80">
                <TableHead className="font-bold text-xs py-3.5 min-w-[240px] sticky left-0 z-20 bg-muted/90 backdrop-blur-md">
                  {t("inventory.itemAndVariant", "Item & Variant")}
                </TableHead>
                <TableHead className="font-bold text-xs min-w-[120px]">{t("products.sku", "SKU")}</TableHead>
                <TableHead className="font-bold text-xs min-w-[100px]">{t("products.category", "Category")}</TableHead>
                <TableHead className="font-bold text-xs text-right min-w-[100px]">
                  {t("inventory.totalSystem", "Total System")}
                </TableHead>

                {/* Branch Columns */}
                {displayedLocations.map((loc) => (
                  <TableHead
                    key={loc.id}
                    className="font-bold text-xs text-right min-w-[130px] px-3"
                  >
                    <div className="flex flex-col items-end">
                      <span className="truncate max-w-[120px]">{loc.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal capitalize">
                        {loc.isHeadOffice ? t("common.centralHub", "Central Hub") : loc.type || t("common.store", "Store")}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMatrixLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + displayedLocations.length}
                    className="h-44 text-center text-muted-foreground"
                  >
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#B58D4C]" />
                    <span>{t("inventory.loadingMatrix", "Loading multi-branch stock matrix...")}</span>
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + displayedLocations.length}
                    className="h-40 text-center text-muted-foreground text-xs"
                  >
                    {t("inventory.noProductsMatch", "No products found matching filters.")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  return (
                    <TableRow key={row.key} className="hover:bg-muted/20 transition-colors group">
                      {/* Product Name & Variant */}
                      <TableCell className="py-3 sticky left-0 z-10 bg-card group-hover:bg-muted/20 transition-colors border-r border-border/40">
                        <div>
                          <div className="font-bold text-sm text-foreground">{row.productName}</div>
                          {row.variantName && (
                            <Badge variant="outline" className="text-[10px] font-semibold mt-0.5">
                              Variant: {row.variantName}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.sku || "—"}
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-xs text-muted-foreground">
                        {row.category || "—"}
                      </TableCell>

                      {/* Total System Stock */}
                      <TableCell className="text-right font-black text-sm text-[#B58D4C]">
                        {row.totalStock}
                      </TableCell>

                      {/* Branch Editable Cells */}
                      {displayedLocations.map((loc) => {
                        const cellKey = `${row.key}:${loc.id}`;
                        const isDirty = Boolean(dirtyCells[cellKey]);
                        const branchEntry = row.branchStocks[loc.id] || { stock: 0, reorderLevel: 5 };
                        const currentVal = isDirty
                          ? dirtyCells[cellKey].newStock
                          : branchEntry.stock;
                        const reorderLevel = branchEntry.reorderLevel || 5;

                        const isZero = currentVal === 0;
                        const isLow = currentVal > 0 && currentVal <= reorderLevel;

                        return (
                          <TableCell key={loc.id} className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Stock status indicator */}
                              <span
                                className={cn(
                                  "size-2 rounded-full shrink-0",
                                  isDirty
                                    ? "bg-[#B58D4C] animate-pulse"
                                    : isZero
                                      ? "bg-rose-500"
                                      : isLow
                                        ? "bg-amber-500"
                                        : "bg-emerald-500/80",
                                )}
                                title={
                                  isDirty
                                    ? "Unsaved modification"
                                    : isZero
                                      ? "Out of stock"
                                      : isLow
                                        ? `Low stock (≤ ${reorderLevel})`
                                        : "Healthy stock level"
                                }
                              />

                              {/* Direct Inline Edit Input */}
                              <Input
                                type="number"
                                min="0"
                                value={currentVal}
                                onChange={(e) =>
                                  handleCellChange(
                                    row,
                                    loc.id,
                                    e.target.value,
                                    branchEntry.stock,
                                  )
                                }
                                className={cn(
                                  "w-20 text-right h-8 text-xs font-bold rounded-lg transition-all",
                                  isDirty
                                    ? "border-[#B58D4C] bg-[#B58D4C]/10 text-foreground ring-1 ring-[#B58D4C]/40"
                                    : isZero
                                      ? "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                      : isLow
                                        ? "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                        : "bg-background text-foreground",
                                )}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── STICKY BOTTOM SAVE ACTION BAR (Visible when changes are made) ── */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-4 bg-background/95 dark:bg-card/95 border-2 border-[#B58D4C]/40 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-[#B58D4C]/20 grid place-items-center text-[#B58D4C] font-black text-xs">
                {dirtyCount}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  {dirtyCount} branch stock {dirtyCount === 1 ? "point" : "points"} modified
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Ledger movements will be recorded upon save
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={saveMatrixMutation.isPending}
                className="rounded-xl h-9 text-xs font-semibold cursor-pointer"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => saveMatrixMutation.mutate()}
                disabled={saveMatrixMutation.isPending}
                className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-soft cursor-pointer bg-[#B58D4C] hover:bg-[#A07B3F] text-white"
              >
                {saveMatrixMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                <span>Save All Changes</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/inventory/")({
  component: InventoryDashboard,
});
