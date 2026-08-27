import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileUpload } from "@/components/ui/file-upload";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCategoriesFn, createCategoryFn } from "@/api/categories";
import { VariantManager } from "../products/VariantManager";
import { AiProductMagicBar } from "../products/AiProductMagicBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Sparkles, Clock, IndianRupee } from "lucide-react";

export function ServiceForm({ initialData, onSubmit, isSaving }: { initialData?: any; onSubmit: (data: any) => void; isSaving: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => getCategoriesFn().then(res => res.data || []) });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.error("Service Name is required");
    }
    if (!formData.hasVariants && (!formData.price || parseFloat(formData.price as string) < 0)) {
      return toast.error("Valid price is required");
    }

    const rawDuration = parseFloat(formData.durationValue as string) || 0;
    let durationMins = rawDuration;
    if (formData.durationUnit === "hours") durationMins = rawDuration * 60;
    if (formData.durationUnit === "days") durationMins = rawDuration * 1440;

    const payload = {
      ...formData,
      duration: durationMins > 0 ? durationMins.toString() : "",
    };

    onSubmit(payload);
  };

  const handleApplyAiData = (extracted: any) => {
    setFormData((prev: any) => {
      let matchedCatId = prev.category;
      if (extracted.category) {
        const match = (categories as any[]).find(
          (c: any) => c.name.toLowerCase() === extracted.category.toLowerCase()
        );
        matchedCatId = match ? match.id : prev.category;
      }

      return {
        ...prev,
        name: extracted.name || prev.name,
        category: matchedCatId,
        price: extracted.price !== undefined ? String(extracted.price) : prev.price,
        cost: extracted.cost !== undefined ? String(extracted.cost) : prev.cost,
        durationValue: extracted.duration ? String(extracted.duration) : prev.durationValue,
      };
    });
  };

  return (
    <div className="container mx-auto space-y-6 pb-20 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {initialData ? "Edit Service" : "Add Service"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/services" })}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Service
          </Button>
        </div>
      </div>

      {/* 🚀 AI Service Creator Bar */}
      <AiProductMagicBar
        categories={categories}
        onApplyData={handleApplyAiData}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Service Information</h2>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Service Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Basic Haircut"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

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
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Pricing & Duration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Retail Price <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cost (Internal)</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Estimated Duration (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 30"
                  value={formData.durationValue}
                  onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
                  className="w-1/2"
                />
                <Select
                  value={formData.durationUnit}
                  onValueChange={(val) => setFormData({ ...formData, durationUnit: val })}
                >
                  <SelectTrigger className="w-1/2">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mins">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
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
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
              />
              <Label htmlFor="hasVariants" className="font-medium cursor-pointer text-base">
                This service has variants (e.g. 30 Min vs 60 Min)
              </Label>
            </div>

            {formData.hasVariants && (
              <VariantManager
                mode="service"
                variants={formData.variants}
                onChange={(variants) => setFormData({ ...formData, variants })}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Media</h2>
            <div className="grid gap-2">
              <Label>Service Image</Label>
              <FileUpload
                value={formData.image && !formData.image.includes("unsplash.com") ? formData.image : undefined}
                onChange={(url: string) =>
                  setFormData({
                    ...formData,
                    image: url || "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=150&h=150",
                  })
                }
                folder="services"
                accept="image/jpeg,image/png,image/webp,image/gif"
                allowedTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                maxSizeMB={3}
                label=""
                description="PNG, JPG, WEBP or GIF • Max 3MB"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
