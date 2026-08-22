import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { VariantManager } from "./VariantManager";
import { BundleManager } from "./BundleManager";
import { ModifierManager } from "./ModifierManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";

export function ProductForm({ initialData, onSubmit, isSaving }: { initialData?: any; onSubmit: (data: any) => void; isSaving: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => getCategoriesFn().then(res => res.data || []) });
  const { data: brands = [] } = useQuery({ queryKey: ["brands"], queryFn: () => getBrandsFn().then(res => res.data || []) });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: () => getUnitsFn().then(res => res.data || []) });
  const { data: locationsRes } = useQuery({ queryKey: ["locations"], queryFn: () => getLocationsFn() });
  const locations: any[] = locationsRes?.data || [];

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
    };
  });

  const { errors: prodErrors, validate: validateProd, clearError: clearProdError } = useFormValidation({
    name: { required: "Product name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } },
    sku: { required: "SKU is required" },
    price: { required: "Retail price is required", positive: "Price must be a valid positive number" },
    cost: { required: "Cost price is required", positive: "Cost must be a valid positive number" },
    stock: { required: "Stock is required", positive: "Stock cannot be negative" },
    reorderLevel: { required: "Reorder level is required", positive: "Reorder level cannot be negative" },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Compute aggregate stock from location stocks if available
    const computedStock = locations.length > 0 ? totalLocationStock : formData.stock;
    const submitData = {
      ...formData,
      stock: computedStock,
      locationStocks: locations.length > 0
        ? locations.map(loc => ({ locationId: loc.id, stock: locationStock[loc.id] || 0 }))
        : undefined
    };
    if (validateProd({ ...formData, stock: computedStock })) {
      onSubmit(submitData);
    } else {
      toast.error("Please fill in all required fields correctly.");
    }
  };

  return (
    <div className="container mx-auto space-y-6 pb-20 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {initialData ? "Edit Product" : "Add Product"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/products" })}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">General Information</h2>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Premium Wireless Headphones"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearProdError("name");
                  }}
                  className={prodErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={prodErrors.name} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>SKU <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. SKU-001"
                    value={formData.sku}
                    onChange={(e) => {
                      setFormData({ ...formData, sku: e.target.value });
                      clearProdError("sku");
                    }}
                    className={prodErrors.sku ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={prodErrors.sku} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 123456789012"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString() })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">{t("category") || "Category"}</Label>
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
                  <Label htmlFor="brand">{t("brand") || "Brand"}</Label>
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
                  <Label htmlFor="unit">{t("unitType") || "Unit Type"}</Label>
                  <SearchableSelect
                    options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                    value={formData.unit}
                    onChange={(val) => setFormData({ ...formData, unit: val })}
                    placeholder={t("selectUnit") || "Select unit..."}
                    onCreate={async (name) => {
                      const res = await createUnitFn({ data: { unit: { name, shortName: name } } });
                      if (res?.success) {
                        queryClient.invalidateQueries({ queryKey: ["units"] });
                        return res.data?.id;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Pricing & Inventory</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Retail Price <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={formData.price === 0 ? "" : formData.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                    clearProdError("price");
                  }}
                  className={prodErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={prodErrors.price} />
              </div>
              <div className="grid gap-1.5">
                <Label>Cost Price <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={formData.cost === 0 ? "" : formData.cost}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 });
                    clearProdError("cost");
                  }}
                  className={prodErrors.cost ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={prodErrors.cost} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Wholesale Price (Optional)</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="e.g. 45.00"
                  value={formData.wholesalePrice || ""}
                  onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Dealer Price (Optional)</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="e.g. 40.00"
                  value={formData.dealerPrice || ""}
                  onChange={(e) => setFormData({ ...formData, dealerPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Stock Section — smart per-location if locations exist */}
            {locations.length > 0 && !formData.hasVariants ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <Label className="text-sm font-semibold">Stock Per Location</Label>
                  <span className="text-xs text-muted-foreground ml-auto">Total: <strong>{totalLocationStock}</strong></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {locations.map((loc: any) => (
                    <div key={loc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        className="w-24 text-right"
                        placeholder="0"
                        value={locationStock[loc.id] ?? ""}
                        onChange={(e) => setLocationStock(prev => ({ ...prev, [loc.id]: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-1.5">
                  <Label>Reorder Level <span className="text-destructive">*</span></Label>
                  <Input
                    type="number" min="0" placeholder="e.g. 5"
                    value={formData.reorderLevel === 0 ? "" : formData.reorderLevel}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 });
                      clearProdError("reorderLevel");
                    }}
                    className={prodErrors.reorderLevel ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={prodErrors.reorderLevel} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Stock <span className="text-destructive">*</span></Label>
                  <Input
                    type="number" min="0" placeholder="0"
                    value={formData.stock === 0 ? "" : formData.stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                      clearProdError("stock");
                    }}
                    className={prodErrors.stock ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={prodErrors.stock} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Reorder Level <span className="text-destructive">*</span></Label>
                  <Input
                    type="number" min="0" placeholder="e.g. 5"
                    value={formData.reorderLevel === 0 ? "" : formData.reorderLevel}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 });
                      clearProdError("reorderLevel");
                    }}
                    className={prodErrors.reorderLevel ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError message={prodErrors.reorderLevel} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-3 rounded-lg bg-muted/20">
              <div>
                <Label className="text-xs">Rack No.</Label>
                <Input
                  placeholder="e.g. A2"
                  value={formData.locationRack}
                  onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Shelf No.</Label>
                <Input
                  placeholder="e.g. 3"
                  value={formData.locationShelf}
                  onChange={(e) => setFormData({ ...formData, locationShelf: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Bin Position</Label>
                <Input
                  placeholder="e.g. B4"
                  value={formData.locationBin}
                  onChange={(e) => setFormData({ ...formData, locationBin: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Variants</h2>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasVariants"
                checked={formData.hasVariants}
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked, isBundle: e.target.checked ? false : formData.isBundle })}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="hasVariants" className="font-medium cursor-pointer text-base">
                This product has variants (like sizes or colors)
              </Label>
            </div>

            {formData.hasVariants && (
              <VariantManager
                variants={formData.variants}
                onChange={(variants) => setFormData({ ...formData, variants })}
              />
            )}

            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="isBundle"
                checked={formData.isBundle}
                onChange={(e) => setFormData({ ...formData, isBundle: e.target.checked, hasVariants: e.target.checked ? false : formData.hasVariants })}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="isBundle" className="font-medium cursor-pointer text-base">
                This is a Bundle Product (Bill of Materials)
              </Label>
            </div>

            {formData.isBundle && (
              <BundleManager
                components={formData.bundleComponents}
                onChange={(components) => setFormData({ ...formData, bundleComponents: components })}
                basePrice={Number(formData.price) || 0}
                onAutoSumPrice={(newPrice) => setFormData({ ...formData, price: newPrice })}
              />
            )}

            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <input
                type="checkbox"
                id="trackFifo"
                checked={formData.trackFifo}
                onChange={(e) => setFormData({ ...formData, trackFifo: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="trackFifo" className="font-medium cursor-pointer text-base text-blue-600">
                Track FIFO Costing for this Product
              </Label>
            </div>

            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <input
                type="checkbox"
                id="hasModifiers"
                checked={formData.hasModifiers}
                onChange={(e) => setFormData({ ...formData, hasModifiers: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="hasModifiers" className="font-medium cursor-pointer text-base">
                Product has Modifiers / Add-ons (Restaurant Mode)
              </Label>
            </div>

            {formData.hasModifiers && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Modifier Groups</h3>
                <ModifierManager
                  modifiers={formData.modifiers}
                  onChange={(modifiers) => setFormData({ ...formData, modifiers })}
                />
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block text-primary">KOT Course Routing (Restaurant Mode)</Label>
              <Select
                value={formData.course}
                onValueChange={(val) => setFormData({ ...formData, course: val })}
              >
                <SelectTrigger className="w-full">
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
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Media</h2>
            <div className="grid gap-2">
              <Label>Product Image</Label>
              <FileUpload
                value={formData.image && !formData.image.includes("unsplash.com") ? formData.image : undefined}
                onChange={(url: string) =>
                  setFormData({
                    ...formData,
                    image: url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150",
                  })
                }
                folder="products"
                accept="image/jpeg,image/png,image/webp,image/gif"
                allowedTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                maxSizeMB={3}
                label=""
                description="PNG, JPG, WEBP or GIF • Max 3MB"
              />
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Tax & Compliance (GST)</h2>

            <div className="grid gap-4">
              <div>
                <Label className="text-sm">HSN / SAC Code</Label>
                <Input
                  placeholder="e.g. 8517"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm">GST Rate (%)</Label>
                <Select
                  value={formData.gstRate.toString()}
                  onValueChange={(v) => setFormData({ ...formData, gstRate: parseInt(v) || 0 })}
                >
                  <SelectTrigger>
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
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="taxInclusive"
                  checked={formData.taxInclusive}
                  onChange={(e) => setFormData({ ...formData, taxInclusive: e.target.checked })}
                  className="rounded border-border text-primary w-4 h-4"
                />
                <Label htmlFor="taxInclusive" className="text-sm cursor-pointer">
                  Price is Tax Inclusive
                </Label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Tracking</h2>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <input
                type="checkbox" id="hasSerial"
                checked={formData.hasSerial}
                onChange={(e) => setFormData({ ...formData, hasSerial: e.target.checked })}
                className="mt-1 rounded border-primary text-primary"
              />
              <div className="space-y-1 w-full">
                <Label htmlFor="hasSerial" className="font-semibold text-sm text-primary cursor-pointer">
                  Track Serial / IMEI
                </Label>
                {formData.hasSerial && (
                  <textarea
                    rows={2}
                    value={formData.serialsInput}
                    onChange={(e) => setFormData({ ...formData, serialsInput: e.target.value })}
                    placeholder="SN-001, SN-002"
                    className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono mt-2"
                  />
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-info/20 bg-info/5">
              <input
                type="checkbox" id="hasBatch"
                checked={formData.hasBatch}
                onChange={(e) => setFormData({ ...formData, hasBatch: e.target.checked })}
                className="mt-1 rounded border-info text-info"
              />
              <div className="space-y-2 w-full">
                <Label htmlFor="hasBatch" className="font-semibold text-sm text-info cursor-pointer">
                  Track Batches & Expiry
                </Label>
                {formData.hasBatch && (
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label className="text-xs">Batch Number</Label>
                      <Input
                        placeholder="e.g. BATCH-2026A"
                        value={formData.batchNoInput}
                        onChange={(e) => setFormData({ ...formData, batchNoInput: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Batch Expiry</Label>
                      <div className="mt-1">
                        <DatePicker
                          date={formData.batchExpiryInput}
                          onDateChange={(d) => setFormData({ ...formData, batchExpiryInput: d ? d.toISOString().split("T")[0] : "" })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Batch Stock Qty</Label>
                      <Input
                        type="number" min="0" placeholder="0"
                        value={formData.batchStockInput}
                        onChange={(e) => setFormData({ ...formData, batchStockInput: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Master Expiry Date (Optional)</Label>
              <DatePicker
                date={formData.expiryDate}
                onDateChange={(d) => setFormData({ ...formData, expiryDate: d ? d.toISOString().split("T")[0] : "" })}
                placeholder="Select expiry date"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
