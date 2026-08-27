import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  IndianRupee,
  Image as ImageIcon,
  Tags,
  FileText,
  Settings,
  ShieldCheck,
  Tag,
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
      taxInclusive: false,
      metadata: {},
    };
  });

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
    cost: { required: "Cost price is required", positive: "Cost must be a valid positive number" },
    stock: { required: "Stock is required", positive: "Stock cannot be negative" },
    reorderLevel: {
      required: "Reorder level is required",
      positive: "Reorder level cannot be negative",
    },
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/products" })}
            className="size-9 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {initialData ? "Edit Product SKU" : "Create New Product"}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {initialData
                ? "Update catalog metadata, pricing tiers, and stock allocations."
                : "Configure attributes, pricing, and multi-location inventory."}
            </p>
          </div>
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
            Save SKU Changes
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

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="size-5 text-primary" /> Pricing & Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid gap-1.5">
                  <Label className="text-sm font-semibold">
                    Retail Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-sm">₹</span>
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
                      className={`pl-8 h-10 ${prodErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={prodErrors.price} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-sm font-semibold">
                    Cost Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-sm">₹</span>
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
                      className={`pl-8 h-10 ${prodErrors.cost ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={prodErrors.cost} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/10 p-4 rounded-lg border border-border/50">
                <div className="grid gap-1.5">
                  <Label className="text-sm">Wholesale Price (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={formData.wholesalePrice || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-sm">Dealer Price (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 40.00"
                    value={formData.dealerPrice || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Stock Section */}
              {locations.length > 0 && !formData.hasVariants ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <Label className="text-sm font-semibold">Stock Per Location</Label>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                      Total: {totalLocationStock}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {locations.map((loc: any) => (
                      <div
                        key={loc.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{loc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          className="w-24 text-right font-medium"
                          placeholder="0"
                          value={locationStock[loc.id] ?? ""}
                          onChange={(e) =>
                            setLocationStock((prev) => ({
                              ...prev,
                              [loc.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-1.5 mt-4">
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
                      className={`max-w-[200px] ${prodErrors.reorderLevel ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
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

              <div className="grid gap-2 pt-4 border-t">
                <Label className="text-sm font-semibold">
                  KOT Course Routing (Restaurant Mode)
                </Label>
                <Select
                  value={formData.course}
                  onValueChange={(val) => setFormData({ ...formData, course: val })}
                >
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starters">Starters</SelectItem>
                    <SelectItem value="Main Course">Main Course</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Drinks">Drinks</SelectItem>
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Meta Details */}
        <div className="space-y-8">
          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="size-5 text-primary" /> Media
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
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
                description="Upload a high-quality product image. Supported formats: PNG, JPG, WEBP. Max size: 3MB."
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="size-5 text-primary" /> Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. SKU-001"
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value });
                    clearProdError("sku");
                  }}
                  className={`h-10 ${prodErrors.sku ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <FieldError message={prodErrors.sku} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 123456789012"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 h-10"
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
                    className="h-10"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="size-5 text-primary" /> Tax & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">HSN / SAC Code</Label>
                <Input
                  placeholder="e.g. 8517"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">GST Rate (%)</Label>
                <Select
                  value={formData.gstRate.toString()}
                  onValueChange={(v) => setFormData({ ...formData, gstRate: parseInt(v) || 0 })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Nil Rated)</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
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
        </div>
      </div>
    </div>
  );
}
