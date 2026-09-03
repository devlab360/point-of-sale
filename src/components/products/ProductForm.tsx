import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileUpload } from "@/components/ui/file-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCategoriesFn, createCategoryFn } from "@/api/categories";
import { getBrandsFn, createBrandFn } from "@/api/brands";
import { getUnitsFn, createUnitFn } from "@/api/units";
import { getLocationsFn } from "@/api/locations";
import { getSettingsFn } from "@/api/settings";
import { getTaxMastersFn } from "@/api/tax-master";
import { useCurrency } from "@/lib/currency";
import { VariantManager } from "./VariantManager";
import { BundleManager } from "./BundleManager";
import { ModifierManager } from "./ModifierManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Package,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  Tags,
  FileText,
  Settings,
  ShieldCheck,
  Tag,
  Sparkles,
  Barcode as BarcodeIcon,
  Gem,
  Car,
  Shield,
  Award,
  Clock,
  Search,
  UtensilsCrossed,
} from "lucide-react";

export function ProductForm({
  initialData,
  onSubmit,
  isSaving,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
}) {
  const { t } = useLanguage();
  const { formatCurrency, currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategoriesFn().then((res) => res.data || []),
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => getBrandsFn().then((res) => res.data || []),
  });
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: () => getUnitsFn().then((res) => res.data || []),
  });
  const { data: locationsRes } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations: any[] = locationsRes?.data || [];

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettingsFn().then((res) => res.data),
  });
  const settings: any = settingsData;

  const isRestaurantVertical =
    settings?.businessType === "RESTAURANT" ||
    settings?.businessType === "CAFE" ||
    settings?.businessType === "HOTEL" ||
    settings?.businessType === "BAKERY" ||
    (typeof settings?.industryType === "string" &&
      /restaurant|cafe|hotel|food|dining|bakery/i.test(settings.industryType)) ||
    (typeof settings?.businessType === "string" &&
      /restaurant|cafe|hotel|food|dining|bakery/i.test(settings.businessType));

  const { data: taxMastersRes } = useQuery({
    queryKey: ["taxMasters"],
    queryFn: () => getTaxMastersFn(),
  });
  const taxMasters: any[] = taxMastersRes?.data || [];

  // Per-location stock state: { [locationId]: number }
  const [locationStock, setLocationStock] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (initialData?.locationStocks) {
      for (const ls of initialData.locationStocks) {
        initial[ls.locationId] = Number(ls.stock);
      }
    }
    return initial;
  });

  const totalLocationStock = Object.values(locationStock).reduce((a, b) => a + b, 0);

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        hasVariants: initialData.hasVariants || false,
        isBundle: initialData.isBundle || false,
        trackFifo: initialData.trackFifo || false,
        hasModifiers: initialData.hasModifiers || false,
        course: initialData.course || "Main Course",
        modifiers: initialData.modifiers || [],
        variants: initialData.variants || [],
        bundleComponents: initialData.bundleComponents || [],
        hasSerial: initialData.hasSerial || false,
        serialsInput: initialData.serials?.join(", ") || "",
        hasBatch: initialData.hasBatch || false,
        batchNoInput: initialData.batches?.[0]?.batchNo || "",
        batchExpiryInput: initialData.batches?.[0]?.expiryDate || "",
        batchStockInput: initialData.batches?.[0]?.stock || 0,
        gstRate: initialData.gstRate || 0,
        taxMasterId: initialData.taxMasterId || settings?.defaultTaxMasterId || null,
        metadata: initialData.metadata || {},
      };
    }
    return {
      name: "",
      sku: "",
      barcode: "",
      category: "",
      brand: "",
      unit: "",
      price: 0,
      wholesalePrice: 0,
      dealerPrice: 0,
      cost: 0,
      stock: 0,
      reorderLevel: 10,
      image: "",
      status: "active",
      expiryDate: "",
      hasVariants: false,
      isBundle: false,
      trackFifo: false,
      hasModifiers: false,
      course: "Main Course",
      modifiers: [],
      variants: [],
      bundleComponents: [],
      hasSerial: false,
      serialsInput: "",
      hasBatch: false,
      batchNoInput: "",
      batchExpiryInput: "",
      batchStockInput: 0,
      locationRack: "",
      locationShelf: "",
      locationBin: "",
      hsnCode: "",
      gstRate: 0,
      taxMasterId: settings?.defaultTaxMasterId || null,
      taxInclusive: false,
      metadata: {},
    };
  });

  const [bulkFillQty, setBulkFillQty] = useState<string>("");
  const [distributeTotalQty, setDistributeTotalQty] = useState<string>("");
  const [locSearch, setLocSearch] = useState<string>("");

  const {
    errors: prodErrors,
    validate: validateProd,
    clearError: clearProdError,
  } = useFormValidation({
    name: {
      required: "Product name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    sku: { required: "SKU is required" },
    price: {
      required: "Retail price is required",
      positive: "Price must be a valid positive number",
    },
    // cost is optional — 0 is valid for free / bundled items
    cost: {},
    // stock and reorderLevel allow 0 — only block negative values
    stock: { required: "Stock quantity is required" },
    reorderLevel: {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Compute aggregate stock from location stocks if available
    const computedStock = locations.length > 0 ? totalLocationStock : formData.stock;
    const submitData = {
      ...formData,
      stock: computedStock,
      locationStocks:
        locations.length > 0
          ? locations.map((loc) => ({ locationId: loc.id, stock: locationStock[loc.id] || 0 }))
          : undefined,
    };
    if (validateProd({ ...formData, stock: computedStock })) {
      onSubmit(submitData);
    } else {
      toast.error("Please fill in all required fields correctly.");
    }
  };

  return (
    <div className="page-container pb-24 relative space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/90 backdrop-blur-xl pb-3 pt-2 border-b border-border/80 shadow-sm -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {initialData ? "Edit Product" : "Create New Product"}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {initialData
              ? "Update catalog metadata, pricing tiers, and stock allocations."
              : "Configure attributes, pricing, and multi-location inventory."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/products" })}
            className="flex-1 sm:flex-none h-10 rounded-xl text-xs font-semibold"
          >
            Discard
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 sm:flex-none min-w-[140px] h-10 rounded-xl font-bold text-xs shadow-soft"
          >
            {isSaving && <Loader2 className="size-4 animate-spin mr-1.5" />}
            Save Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="size-4 text-primary" /> General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                <div className="grid gap-1.5">
                  <Label className="text-sm font-semibold">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Premium Wireless Headphones"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      clearProdError("name");
                    }}
                    className={`h-11 ${prodErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <FieldError message={prodErrors.name} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-sm font-semibold">
                      {t("category") || "Category"}
                    </Label>
                    <SearchableSelect
                      options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                      value={formData.category}
                      onChange={(val) => setFormData({ ...formData, category: val })}
                      placeholder={t("selectCategory") || "Select category..."}
                      onCreate={async (name) => {
                        const res = await createCategoryFn({ data: { category: { name } } });
                        if (res?.success) {
                          queryClient.invalidateQueries({ queryKey: ["categories"] });
                          return res.data?.id;
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-sm font-semibold">
                      {t("brand") || "Brand"}
                    </Label>
                    <SearchableSelect
                      options={brands.map((b: any) => ({ value: b.id, label: b.name }))}
                      value={formData.brand}
                      onChange={(val) => setFormData({ ...formData, brand: val })}
                      placeholder={t("selectBrand") || "Select brand..."}
                      onCreate={async (name) => {
                        const res = await createBrandFn({ data: { brand: { name } } });
                        if (res?.success) {
                          queryClient.invalidateQueries({ queryKey: ["brands"] });
                          return res.data?.id;
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unit" className="text-sm font-semibold">
                      {t("unitType") || "Unit Type"}
                    </Label>
                    <SearchableSelect
                      options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                      value={formData.unit}
                      onChange={(val) => setFormData({ ...formData, unit: val })}
                      placeholder={t("selectUnit") || "Select unit..."}
                      onCreate={async (name) => {
                        const res = await createUnitFn({
                          data: { unit: { name, shortName: name } },
                        });
                        if (res?.success) {
                          queryClient.invalidateQueries({ queryKey: ["units"] });
                          return res.data?.id;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="size-4 text-primary" /> Pricing & Profit Margins
                </CardTitle>
                {formData.price > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">Margin:</span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        formData.price - formData.cost >= 0
                          ? "bg-success/15 text-success border border-success/20"
                          : "bg-destructive/15 text-destructive border border-destructive/20"
                      }`}
                    >
                      {(((formData.price - formData.cost) / (formData.price || 1)) * 100).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">
                    Retail Selling Price ({currencySymbol}){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-xs font-bold font-mono">
                        {currencySymbol}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price === 0 ? "" : formData.price}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                        clearProdError("price");
                      }}
                      className={`pl-8 h-10 font-black text-sm rounded-xl ${prodErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={prodErrors.price} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">
                    Unit Cost / Purchase Price ({currencySymbol}){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-xs font-bold font-mono">
                        {currencySymbol}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.cost === 0 ? "" : formData.cost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 });
                        clearProdError("cost");
                      }}
                      className={`pl-8 h-10 font-black text-sm rounded-xl ${prodErrors.cost ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={prodErrors.cost} />
                </div>
              </div>

              {/* Real-time Profit Preview */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">
                    Gross Profit Per Unit:
                  </span>
                  <span
                    className={`font-black font-mono text-sm ${formData.price >= formData.cost ? "text-primary" : "text-destructive"}`}
                  >
                    {formatCurrency(formData.price - formData.cost)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[11px] block">Markup Over Cost:</span>
                  <span className="font-black font-mono text-sm text-foreground">
                    {formData.cost > 0
                      ? `${(((formData.price - formData.cost) / formData.cost) * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">Wholesale Price (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={formData.wholesalePrice || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">Dealer Price (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 40.00"
                    value={formData.dealerPrice || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Stock Section */}
              {locations.length > 0 && !formData.hasVariants ? (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <div>
                        <Label className="text-sm font-bold">Multi-Outlet Stock Allocation</Label>
                        <p className="text-xs text-muted-foreground">
                          Manage physical inventory across {locations.length} store locations & warehouses.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-xl border border-primary/20">
                        Total Network Stock: {totalLocationStock} units
                      </span>
                    </div>
                  </div>

                  {/* Bulk Stock Helper Toolbar */}
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" /> Quick Bulk Allocator
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const reset: Record<string, number> = {};
                          locations.forEach((l: any) => (reset[l.id] = 0));
                          setLocationStock(reset);
                          toast.info("All outlet stocks set to 0");
                        }}
                      >
                        Reset All to 0
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Fill Same Qty */}
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/60">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Qty (e.g. 50)"
                          value={bulkFillQty}
                          onChange={(e) => setBulkFillQty(e.target.value)}
                          className="h-8 text-xs font-mono w-28"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-semibold flex-1"
                          onClick={() => {
                            const val = parseInt(bulkFillQty) || 0;
                            const updated: Record<string, number> = {};
                            locations.forEach((l: any) => (updated[l.id] = val));
                            setLocationStock(updated);
                            toast.success(`Applied ${val} units to all ${locations.length} outlets`);
                          }}
                        >
                          Apply to All Outlets
                        </Button>
                      </div>

                      {/* Distribute Total Equally */}
                      <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/60">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Total (e.g. 100)"
                          value={distributeTotalQty}
                          onChange={(e) => setDistributeTotalQty(e.target.value)}
                          className="h-8 text-xs font-mono w-28"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-semibold flex-1"
                          onClick={() => {
                            const total = parseInt(distributeTotalQty) || 0;
                            if (locations.length === 0) return;
                            const perLoc = Math.floor(total / locations.length);
                            const remainder = total % locations.length;
                            const updated: Record<string, number> = {};
                            locations.forEach((l: any, idx: number) => {
                              updated[l.id] = perLoc + (idx === 0 ? remainder : 0);
                            });
                            setLocationStock(updated);
                            toast.success(`Distributed ${total} units evenly across ${locations.length} outlets`);
                          }}
                        >
                          Split Total Evenly
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Search if many outlets */}
                  {locations.length > 4 && (
                    <div className="relative max-w-xs">
                      <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search outlet..."
                        value={locSearch}
                        onChange={(e) => setLocSearch(e.target.value)}
                        className="pl-8 h-8 text-xs rounded-lg bg-background"
                      />
                    </div>
                  )}

                  {/* Outlet Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {locations
                      .filter(
                        (loc: any) =>
                          !locSearch ||
                          loc.name.toLowerCase().includes(locSearch.toLowerCase()) ||
                          loc.city?.toLowerCase().includes(locSearch.toLowerCase()),
                      )
                      .map((loc: any) => {
                        const current = locationStock[loc.id] || 0;
                        return (
                          <div
                            key={loc.id}
                            className="flex flex-col p-3 rounded-xl border border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-colors gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate text-foreground">{loc.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {loc.isHeadOffice && (
                                    <span className="text-[10px] font-black uppercase px-1 py-0.2 bg-primary/10 text-primary rounded">
                                      HQ
                                    </span>
                                  )}
                                  <span className="text-[10px] font-medium text-muted-foreground capitalize">
                                    {loc.type} {loc.city ? `• ${loc.city}` : ""}
                                  </span>
                                </div>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                className="w-20 h-8 text-right font-mono font-bold text-xs bg-background"
                                placeholder="0"
                                value={locationStock[loc.id] ?? ""}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  setLocationStock((prev) => ({
                                    ...prev,
                                    [loc.id]: parseInt(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>

                            {/* Quick Step Buttons */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                              <span className="text-[10px] font-semibold text-muted-foreground mr-1">Quick:</span>
                              {[10, 50, 100].map((step) => (
                                <button
                                  key={step}
                                  type="button"
                                  onClick={() =>
                                    setLocationStock((prev) => ({
                                      ...prev,
                                      [loc.id]: (prev[loc.id] || 0) + step,
                                    }))
                                  }
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                                >
                                  +{step}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setLocationStock((prev) => ({
                                    ...prev,
                                    [loc.id]: Math.max(0, (prev[loc.id] || 0) - 10),
                                  }))
                                }
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer ml-auto"
                              >
                                -10
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="grid gap-1.5 mt-4 pt-2 border-t border-border/60">
                    <Label className="text-sm font-semibold">
                      Reorder Level Alert Threshold <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 10"
                      value={formData.reorderLevel === 0 ? "" : formData.reorderLevel}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 });
                        clearProdError("reorderLevel");
                      }}
                      className={`max-w-[220px] h-10 ${prodErrors.reorderLevel ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Triggers low-stock alerts when an outlet's inventory drops to or below this amount.
                    </p>
                    <FieldError message={prodErrors.reorderLevel} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="grid gap-1.5">
                    <Label className="text-sm font-semibold">
                      Initial Stock <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stock === 0 ? "" : formData.stock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                        clearProdError("stock");
                      }}
                      className={
                        prodErrors.stock ? "border-destructive focus-visible:ring-destructive" : ""
                      }
                    />
                    <FieldError message={prodErrors.stock} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-sm font-semibold">
                      Reorder Level <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={formData.reorderLevel === 0 ? "" : formData.reorderLevel}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 });
                        clearProdError("reorderLevel");
                      }}
                      className={
                        prodErrors.reorderLevel
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <FieldError message={prodErrors.reorderLevel} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/10 shadow-inner">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Rack No.
                  </Label>
                  <Input
                    placeholder="e.g. A2"
                    value={formData.locationRack}
                    onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Shelf No.
                  </Label>
                  <Input
                    placeholder="e.g. 3"
                    value={formData.locationShelf}
                    onChange={(e) => setFormData({ ...formData, locationShelf: e.target.value })}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Bin Position
                  </Label>
                  <Input
                    placeholder="e.g. B4"
                    value={formData.locationBin}
                    onChange={(e) => setFormData({ ...formData, locationBin: e.target.value })}
                    className="h-9 text-sm bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="size-5 text-primary" /> Configuration & Variants
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Variants Toggle */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={formData.hasVariants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasVariants: e.target.checked,
                      isBundle: e.target.checked ? false : formData.isBundle,
                    })
                  }
                  className="mt-1 rounded border-primary/50 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="hasVariants"
                    className="font-semibold cursor-pointer text-base text-foreground"
                  >
                    This product has variants
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Manage different sizes, colors, or options for this item.
                  </p>
                </div>
              </div>

              {formData.hasVariants && (
                <div className="pl-8">
                  <VariantManager
                    variants={formData.variants}
                    locations={locations}
                    basePrice={formData.price}
                    baseCost={formData.cost}
                    onChange={(variants) => setFormData({ ...formData, variants })}
                  />
                </div>
              )}

              {/* Bundle Toggle */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10">
                <input
                  type="checkbox"
                  id="isBundle"
                  checked={formData.isBundle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isBundle: e.target.checked,
                      hasVariants: e.target.checked ? false : formData.hasVariants,
                    })
                  }
                  className="mt-1 rounded border-primary/50 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="isBundle"
                    className="font-semibold cursor-pointer text-base text-foreground"
                  >
                    This is a Bundle / Combo Product
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Combine multiple products into a single package or bill of materials.
                  </p>
                </div>
              </div>

              {formData.isBundle && (
                <div className="pl-8">
                  <BundleManager
                    components={formData.bundleComponents}
                    onChange={(components) =>
                      setFormData({ ...formData, bundleComponents: components })
                    }
                    basePrice={Number(formData.price) || 0}
                    onAutoSumPrice={(newPrice) => setFormData({ ...formData, price: newPrice })}
                  />
                </div>
              )}

              {/* Modifiers Toggle */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  id="hasModifiers"
                  checked={formData.hasModifiers}
                  onChange={(e) => setFormData({ ...formData, hasModifiers: e.target.checked })}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="hasModifiers"
                    className="font-semibold cursor-pointer text-base text-foreground"
                  >
                    Enable Modifiers & Add-ons
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Useful for restaurants to offer extra toppings or preparation instructions.
                  </p>
                </div>
              </div>

              {formData.hasModifiers && (
                <div className="pl-8">
                  <ModifierManager
                    modifiers={formData.modifiers}
                    onChange={(modifiers) => setFormData({ ...formData, modifiers })}
                  />
                </div>
              )}

              {/* FIFO Costing */}
              <div className="flex items-center space-x-3 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  id="trackFifo"
                  checked={formData.trackFifo}
                  onChange={(e) => setFormData({ ...formData, trackFifo: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <Label htmlFor="trackFifo" className="font-semibold cursor-pointer text-sm">
                  Track FIFO Costing for this Product
                </Label>
              </div>

              {isRestaurantVertical && (
                <div className="grid gap-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <UtensilsCrossed className="size-4 text-primary" />
                      <span>KOT Course Routing (Kitchen Sequencing)</span>
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20"
                    >
                      Restaurant & Food
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Assign this item to a kitchen preparation course sequence (Starters, Mains, Desserts, Drinks).
                  </p>
                  <Select
                    value={formData.course}
                    onValueChange={(val) => setFormData({ ...formData, course: val })}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Starters">Starters (Appetizers)</SelectItem>
                      <SelectItem value="Main Course">Main Course</SelectItem>
                      <SelectItem value="Desserts">Desserts</SelectItem>
                      <SelectItem value="Drinks">Drinks & Beverages</SelectItem>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Meta Details */}
        <div className="space-y-6">
          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" /> Product Media & Image
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <FileUpload
                value={
                  formData.image && !formData.image.includes("unsplash.com")
                    ? formData.image
                    : undefined
                }
                onChange={(url: string) =>
                  setFormData({
                    ...formData,
                    image:
                      url ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150",
                  })
                }
                folder="products"
                accept="image/jpeg,image/png,image/webp,image/gif"
                allowedTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                maxSizeMB={3}
                label=""
                description="Upload high-res product photo. Max size: 3MB."
              />
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Tag className="size-4 text-primary" /> SKU & Barcode Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">
                    SKU Identifier <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      const randSku = `SKU-${Date.now().toString().slice(-6)}`;
                      setFormData({ ...formData, sku: randSku });
                      clearProdError("sku");
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Auto Generate
                  </button>
                </div>
                <Input
                  placeholder="e.g. SKU-001"
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value });
                    clearProdError("sku");
                  }}
                  className={`h-10 text-xs rounded-xl font-mono ${prodErrors.sku ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <FieldError message={prodErrors.sku} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold">Barcode (EAN / UPC / Code128)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 123456789012"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 h-10 text-xs rounded-xl font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        barcode: Math.floor(
                          1000000000000 + Math.random() * 9000000000000,
                        ).toString(),
                      })
                    }
                    className="h-10 rounded-xl text-xs font-bold"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Tax & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold">HSN / SAC Code</Label>
                <Input
                  placeholder="e.g. 8517"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">Tax Rate (Tax Master)</Label>
                <Select
                  value={formData.taxMasterId?.toString() || ""}
                  onValueChange={(v) => {
                    const master = taxMasters.find((m: any) => m.id === v);
                    setFormData({
                      ...formData,
                      taxMasterId: v || null,
                      gstRate: master ? Number(master.rate) || 0 : 0,
                    });
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Tax Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">0% (Nil Rated)</SelectItem>
                    {taxMasters
                      .filter((m: any) => m.status !== "archived")
                      .map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({Number(m.rate) || 0}%)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Rates are managed dynamically in Tax Master. If empty, use it to keep product tax
                  in sync.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="taxInclusive"
                  checked={formData.taxInclusive}
                  onChange={(e) => setFormData({ ...formData, taxInclusive: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <Label htmlFor="taxInclusive" className="text-sm font-medium cursor-pointer">
                  Price is Tax Inclusive
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Advanced Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5 transition-colors">
                <input
                  type="checkbox"
                  id="hasSerial"
                  checked={formData.hasSerial}
                  onChange={(e) => setFormData({ ...formData, hasSerial: e.target.checked })}
                  className="mt-1 rounded border-primary/50 text-primary w-5 h-5 cursor-pointer"
                />
                <div className="space-y-2 w-full">
                  <Label
                    htmlFor="hasSerial"
                    className="font-semibold text-sm text-primary cursor-pointer"
                  >
                    Track Serial / IMEI
                  </Label>
                  {formData.hasSerial && (
                    <textarea
                      rows={3}
                      value={formData.serialsInput}
                      onChange={(e) => setFormData({ ...formData, serialsInput: e.target.value })}
                      placeholder="SN-001, SN-002"
                      className="w-full rounded-md border border-input bg-background p-3 text-sm font-mono mt-2 shadow-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  )}
                </div>
              </div>

              {settings?.businessType === "PHARMACY" && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5 transition-colors">
                  <div className="space-y-3 w-full">
                    <Label className="font-semibold text-sm text-primary">
                      Pharmacy Attributes
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-primary text-primary w-4 h-4 cursor-pointer"
                          checked={formData.metadata?.prescriptionRequired || false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              metadata: {
                                ...formData.metadata,
                                prescriptionRequired: e.target.checked,
                              },
                            })
                          }
                        />
                        Prescription Required
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/20 bg-warning/5 transition-colors">
                <input
                  type="checkbox"
                  id="hasBatch"
                  checked={formData.hasBatch}
                  onChange={(e) => setFormData({ ...formData, hasBatch: e.target.checked })}
                  className="mt-1 rounded border-warning text-warning w-5 h-5 cursor-pointer"
                />
                <div className="space-y-3 w-full">
                  <Label
                    htmlFor="hasBatch"
                    className="font-semibold text-sm text-warning cursor-pointer"
                  >
                    Track Batches & Expiry
                  </Label>
                  {formData.hasBatch && (
                    <div className="space-y-4 mt-3">
                      <div>
                        <Label className="text-xs font-semibold block mb-1.5">Batch Number</Label>
                        <Input
                          placeholder="e.g. BATCH-2026A"
                          value={formData.batchNoInput}
                          onChange={(e) =>
                            setFormData({ ...formData, batchNoInput: e.target.value })
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold block mb-1.5">Batch Expiry</Label>
                        <DatePicker
                          date={formData.batchExpiryInput}
                          onDateChange={(d) =>
                            setFormData({
                              ...formData,
                              batchExpiryInput: d ? d.toISOString().split("T")[0] : "",
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold block mb-1.5">
                          Batch Stock Qty
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.batchStockInput}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              batchStockInput: parseInt(e.target.value) || 0,
                            })
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 pt-2">
                <Label className="text-sm font-semibold">Master Expiry Date</Label>
                <DatePicker
                  date={formData.expiryDate}
                  onDateChange={(d) =>
                    setFormData({ ...formData, expiryDate: d ? d.toISOString().split("T")[0] : "" })
                  }
                  placeholder="Select expiry date"
                />
              </div>
            </CardContent>
          </Card>

          {/* 🛡️ Product Warranty & Guarantee Management */}
          <Card className="rounded-2xl border-border/80 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-primary" />
                  <span>Warranty & Guarantee Coverage</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metadata?.hasWarranty || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metadata: {
                          ...formData.metadata,
                          hasWarranty: e.target.checked,
                          warrantyMonths: formData.metadata?.warrantyMonths ?? 12,
                          guaranteeMonths: formData.metadata?.guaranteeMonths ?? 0,
                          warrantyType: formData.metadata?.warrantyType ?? "carry-in",
                          warrantyPolicy:
                            formData.metadata?.warrantyPolicy ??
                            "Comprehensive coverage on manufacturing defects",
                        },
                      })
                    }
                    className="rounded border-primary text-primary size-4 cursor-pointer"
                  />
                  <span>Enable Warranty Card</span>
                </label>
              </CardTitle>
            </CardHeader>
            {formData.metadata?.hasWarranty && (
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Warranty Period (Months)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.metadata?.warrantyMonths ?? 12}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: {
                            ...formData.metadata,
                            warrantyMonths: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="e.g. 12"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Guarantee Period (Months)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.metadata?.guaranteeMonths ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: {
                            ...formData.metadata,
                            guaranteeMonths: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="e.g. 6 (Replacement)"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Service Claim Mode</Label>
                    <Select
                      value={formData.metadata?.warrantyType ?? "carry-in"}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          metadata: {
                            ...formData.metadata,
                            warrantyType: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carry-in">Store Carry-In</SelectItem>
                        <SelectItem value="onsite">On-Site / Home Visit</SelectItem>
                        <SelectItem value="replacement">Instant Replacement</SelectItem>
                        <SelectItem value="brand-service">Brand Service Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">
                    Warranty Terms & Policy (Printed on Receipts)
                  </Label>
                  <Input
                    value={formData.metadata?.warrantyPolicy ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metadata: {
                          ...formData.metadata,
                          warrantyPolicy: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Free repair service. Physical or liquid damage excluded."
                    className="h-10 rounded-xl"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 💍 Jewellery & Precious Metals Specs */}
          {(settings?.businessType === "JEWELLERY" || settings?.businessType === "UNIVERSAL") && (
            <Card className="rounded-2xl border-border/80 shadow-soft overflow-hidden">
              <CardHeader className="bg-amber-500/10 pb-3 border-b border-amber-500/20">
                <CardTitle className="text-base font-bold flex items-center justify-between text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-2">
                    <Gem className="size-4.5" />
                    <span>Jewellery Bullion Specs & Making Charges</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.metadata?.isJewellery || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: {
                            ...formData.metadata,
                            isJewellery: e.target.checked,
                            purityKarat: formData.metadata?.purityKarat ?? "22K",
                            metalType: formData.metadata?.metalType ?? "gold",
                            grossWeight: formData.metadata?.grossWeight ?? 0,
                            stoneWeight: formData.metadata?.stoneWeight ?? 0,
                            netWeight: formData.metadata?.netWeight ?? 0,
                            makingChargeType: formData.metadata?.makingChargeType ?? "percent",
                            makingChargeValue: formData.metadata?.makingChargeValue ?? 10,
                            wastagePercent: formData.metadata?.wastagePercent ?? 0,
                          },
                        })
                      }
                      className="rounded border-amber-500 text-amber-600 size-4 cursor-pointer"
                    />
                    <span>Jewellery Item</span>
                  </label>
                </CardTitle>
              </CardHeader>
              {formData.metadata?.isJewellery && (
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Metal Type</Label>
                      <Select
                        value={formData.metadata?.metalType ?? "gold"}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, metalType: val },
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Purity / Karat</Label>
                      <Select
                        value={formData.metadata?.purityKarat ?? "22K"}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, purityKarat: val },
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24K">24K (99.9% Pure)</SelectItem>
                          <SelectItem value="22K">22K (91.6% Hallmark)</SelectItem>
                          <SelectItem value="18K">18K (75.0%)</SelectItem>
                          <SelectItem value="14K">14K (58.5%)</SelectItem>
                          <SelectItem value="925">925 Sterling Silver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Gross Weight (Grams)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.metadata?.grossWeight ?? ""}
                        onChange={(e) => {
                          const gw = parseFloat(e.target.value) || 0;
                          const sw = formData.metadata?.stoneWeight ?? 0;
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              grossWeight: gw,
                              netWeight: Math.max(0, gw - sw),
                            },
                          });
                        }}
                        placeholder="0.000"
                        className="h-10 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Stone / Bead Wt (g)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.metadata?.stoneWeight ?? ""}
                        onChange={(e) => {
                          const sw = parseFloat(e.target.value) || 0;
                          const gw = formData.metadata?.grossWeight ?? 0;
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              stoneWeight: sw,
                              netWeight: Math.max(0, gw - sw),
                            },
                          });
                        }}
                        placeholder="0.000"
                        className="h-10 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Net Gold Weight</Label>
                      <div className="h-10 rounded-xl border bg-muted/40 px-3 flex items-center font-mono font-black text-sm text-foreground">
                        {(formData.metadata?.netWeight ?? 0).toFixed(3)} grams
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Making Charge Type</Label>
                      <Select
                        value={formData.metadata?.makingChargeType ?? "percent"}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, makingChargeType: val },
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage (%)</SelectItem>
                          <SelectItem value="per_gram">Per Gram Rate</SelectItem>
                          <SelectItem value="fixed">Fixed Lump Sum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Making Charge Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.metadata?.makingChargeValue ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              makingChargeValue: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder={
                          formData.metadata?.makingChargeType === "percent" ? "10%" : "₹500"
                        }
                        className="h-10 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* 🚗 Auto Parts & Vehicle Compatibility Specs */}
          {(settings?.businessType === "AUTO_PARTS" || settings?.businessType === "UNIVERSAL") && (
            <Card className="rounded-2xl border-border/80 shadow-soft overflow-hidden">
              <CardHeader className="bg-blue-500/10 pb-3 border-b border-blue-500/20">
                <CardTitle className="text-base font-bold flex items-center justify-between text-blue-700 dark:text-blue-400">
                  <div className="flex items-center gap-2">
                    <Car className="size-4.5" />
                    <span>Auto Parts OEM & Vehicle Fitment</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.metadata?.isAutoPart || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: {
                            ...formData.metadata,
                            isAutoPart: e.target.checked,
                            partNumber: formData.metadata?.partNumber ?? "",
                            oemNumber: formData.metadata?.oemNumber ?? "",
                            compatibleVehicles: formData.metadata?.compatibleVehicles ?? "",
                            alternatePartNumbers: formData.metadata?.alternatePartNumbers ?? "",
                          },
                        })
                      }
                      className="rounded border-blue-500 text-blue-600 size-4 cursor-pointer"
                    />
                    <span>Automotive Part</span>
                  </label>
                </CardTitle>
              </CardHeader>
              {formData.metadata?.isAutoPart && (
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Manufacturer Part Number (MPN)</Label>
                      <Input
                        value={formData.metadata?.partNumber ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              partNumber: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        placeholder="e.g. 04465-02220"
                        className="h-10 rounded-xl font-mono font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">OEM Reference Number</Label>
                      <Input
                        value={formData.metadata?.oemNumber ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              oemNumber: e.target.value.toUpperCase(),
                            },
                          })
                        }
                        placeholder="e.g. OEM-TY-8832"
                        className="h-10 rounded-xl font-mono font-bold uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Compatible Vehicles / Models</Label>
                    <Input
                      value={formData.metadata?.compatibleVehicles ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, compatibleVehicles: e.target.value },
                        })
                      }
                      placeholder="e.g. Toyota Corolla (2015-2022), Honda Civic (2016-2021), Hyundai Elantra"
                      className="h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Cashiers can search by vehicle make, model, or year in POS to locate this part
                      instantly.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      Cross-Reference / Alternate Part Numbers
                    </Label>
                    <Input
                      value={formData.metadata?.alternatePartNumbers ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, alternatePartNumbers: e.target.value },
                        })
                      }
                      placeholder="e.g. D923, BP-4421, TRW-GDB3392"
                      className="h-10 rounded-xl font-mono"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
