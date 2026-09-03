import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileUpload } from "@/components/ui/file-upload";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCategoriesFn, createCategoryFn } from "@/api/categories";
import { useCurrency } from "@/lib/currency";
import { VariantManager } from "../products/VariantManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import {
  Loader2,
  ArrowLeft,
  Package,
  DollarSign,
  Clock,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

export function ServiceForm({
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

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      const d = initialData.duration || 0;
      let dUnit = "mins";
      let dValue = d;
      if (d > 0 && d % 1440 === 0) {
        dUnit = "days";
        dValue = d / 1440;
      } else if (d > 0 && d % 60 === 0) {
        dUnit = "hours";
        dValue = d / 60;
      }
      return {
        ...initialData,
        durationValue: dValue > 0 ? String(dValue) : "",
        durationUnit: dUnit,
        hasVariants: initialData.hasVariants || false,
        variants: initialData.variants || [],
      };
    }
    return {
      name: "",
      category: "",
      price: "",
      cost: "",
      durationValue: "",
      durationUnit: "mins",
      image: "",
      status: "active",
      hasVariants: false,
      variants: [],
    };
  });

  const { errors, validate, clearError } = useFormValidation({
    name: {
      required: "Service name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    price: {
      required: "Retail price is required",
      positive: "Price must be a valid positive number",
    },
    // cost is optional — 0 overhead is valid for many services
    cost: {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(String(formData.price)) || 0;
    const costNum = parseFloat(String(formData.cost)) || 0;
    if (!validate({ ...formData, price: priceNum, cost: costNum })) {
      return toast.error("Please fill in all required fields correctly.");
    }
    if (!formData.hasVariants && priceNum < 0) {
      return toast.error("Valid price is required");
    }

    const rawDuration = parseFloat(formData.durationValue as string) || 0;
    let durationMins = rawDuration;
    if (formData.durationUnit === "hours") durationMins = rawDuration * 60;
    if (formData.durationUnit === "days") durationMins = rawDuration * 1440;
    // "session" is stored as-is (1 session = 1 unit, no minute conversion)

    const payload = {
      ...formData,
      price: priceNum,
      cost: costNum,
      duration: durationMins > 0 ? durationMins.toString() : "",
    };

    onSubmit(payload);
  };

  return (
    <div className="page-container pb-24 relative space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/90 backdrop-blur-xl pb-3 pt-2 border-b border-border/80 shadow-sm -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {initialData ? "Edit Service" : "Add New Service"}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {initialData
              ? "Update service details, pricing, and variants."
              : "Configure a new service with pricing and optional variants."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/services" })}
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
            {initialData ? "Save Service" : "Create Service"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="size-4 text-primary" /> Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                <div className="grid gap-1.5">
                  <Label className="text-sm font-semibold">
                    Service Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Basic Haircut"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      clearError("name");
                    }}
                    className={`h-11 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <FieldError message={errors.name} />
                </div>

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
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/80 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="size-4 text-primary" /> Pricing & Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">
                    Retail Price ({currencySymbol}) <span className="text-destructive">*</span>
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
                      value={formData.price}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        clearError("price");
                      }}
                      className={`pl-8 h-10 rounded-xl font-bold text-sm ${errors.price ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={errors.price} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">
                    Cost / Service Overhead ({currencySymbol})
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
                      value={formData.cost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        setFormData({ ...formData, cost: e.target.value });
                        clearError("cost");
                      }}
                      className={`pl-8 h-10 rounded-xl font-bold text-sm ${errors.cost ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  <FieldError message={errors.cost} />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold">
                  <Clock className="inline size-3.5 mr-1.5 text-muted-foreground -mt-0.5" />
                  Estimated Duration (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 30"
                    value={formData.durationValue}
                    onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
                    className="h-11 w-1/2"
                  />
                  <Select
                    value={formData.durationUnit}
                    onValueChange={(val) => setFormData({ ...formData, durationUnit: val })}
                  >
                    <SelectTrigger className="h-11 w-1/2">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mins">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Variants
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={formData.hasVariants}
                  onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                  className="mt-1 rounded border-primary/50 text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="hasVariants"
                    className="font-semibold cursor-pointer text-base text-foreground"
                  >
                    This service has variants (e.g. 30 Min vs 60 Min)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Offer the same service at different durations or price points.
                  </p>
                </div>
              </div>

              {formData.hasVariants && (
                <div className="pl-8">
                  <VariantManager
                    mode="service"
                    variants={formData.variants}
                    basePrice={formData.price}
                    baseCost={formData.cost}
                    onChange={(variants) => setFormData({ ...formData, variants })}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Media */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-3.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" /> Media
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
                      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=150&h=150",
                  })
                }
                folder="services"
                accept="image/jpeg,image/png,image/webp,image/gif"
                allowedTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                maxSizeMB={3}
                label=""
                description="PNG, JPG, WEBP or GIF • Max 3MB"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
