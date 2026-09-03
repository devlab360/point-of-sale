import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Sparkles, Building2, Copy, Layers, Check } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";

export interface Variant {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number | string;
  cost: number | string;
  duration?: number | string;
  image?: string;
  attributes: { name: string; value: string }[];
  locationStocks?: { locationId: string; stock: number }[];
}

interface VariantOption {
  name: string;
  values: string[];
}

interface VariantManagerProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  mode?: "product" | "service";
  locations?: Array<{ id: string; name: string }>;
  basePrice?: string | number;
  baseCost?: string | number;
}

// Helper to generate cartesian product of arrays
const cartesian = (...a: any[][]) =>
  a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

function extractOptionsFromVariants(varList: Variant[]): VariantOption[] {
  if (!varList || varList.length === 0) return [];
  const optsMap = new Map<string, Set<string>>();
  varList.forEach((v) => {
    v.attributes?.forEach((attr) => {
      if (!optsMap.has(attr.name)) optsMap.set(attr.name, new Set());
      if (attr.value) optsMap.get(attr.name)?.add(attr.value);
    });
  });

  const opts: VariantOption[] = [];
  optsMap.forEach((valSet, name) => {
    opts.push({ name, values: Array.from(valSet) });
  });
  return opts;
}

export function VariantManager({
  variants,
  onChange,
  mode = "product",
  locations = [],
  basePrice,
  baseCost,
}: VariantManagerProps) {
  const { currencySymbol } = useCurrency();
  const [options, setOptions] = useState<VariantOption[]>(() => {
    const extracted = extractOptionsFromVariants(variants);
    return extracted.length > 0 ? extracted : [{ name: "Size", values: [] }];
  });
  const [newOptionName, setNewOptionName] = useState("");
  const [inputValue, setInputValue] = useState<Record<number, string>>({});
  const [userInteracted, setUserInteracted] = useState(false);

  // Bulk editing tools state
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkStockVal, setBulkStockVal] = useState("");
  const [bulkTargetLoc, setBulkTargetLoc] = useState<string>("all");

  // Sync options from incoming variants if not yet interacted with
  useEffect(() => {
    if (!userInteracted && variants && variants.length > 0) {
      const extracted = extractOptionsFromVariants(variants);
      if (extracted.length > 0) {
        setOptions(extracted);
      }
    }
  }, [variants, userInteracted]);

  // When options change by user, automatically generate/update the variant matrix
  useEffect(() => {
    if (!userInteracted) return;

    const validOptions = options.filter((o) => o.values.length > 0);

    if (validOptions.length === 0) {
      onChange([]);
      return;
    }

    // Prepare arrays of {name, value} for cartesian product
    const optionArrays = validOptions.map((opt) =>
      opt.values.map((val) => ({ name: opt.name, value: val })),
    );

    // Generate combinations
    const combinations =
      optionArrays.length > 1 ? cartesian(...optionArrays) : optionArrays[0].map((item) => [item]);

    // Map combinations to Variant objects, preserving existing data if name matches
    const newVariants: Variant[] = combinations.map((combo) => {
      const comboName = combo.map((c: any) => c.value).join(" / ");
      const existing = variants.find((v) => v.name === comboName);

      if (existing) {
        return {
          ...existing,
          attributes: combo,
        };
      }

      return {
        name: comboName,
        sku: mode === "product" ? "" : undefined,
        barcode: mode === "product" ? "" : undefined,
        duration: mode === "service" ? "" : undefined,
        price:
          basePrice !== undefined && basePrice !== null && String(basePrice).trim() !== ""
            ? String(basePrice)
            : "",
        cost:
          baseCost !== undefined && baseCost !== null && String(baseCost).trim() !== ""
            ? String(baseCost)
            : "",
        attributes: combo,
        locationStocks: locations.map((l) => ({ locationId: l.id, stock: 0 })),
      };
    });

    onChange(newVariants);
  }, [options, userInteracted]);

  const addOption = () => {
    if (!newOptionName.trim()) return;
    if (options.some((o) => o.name.toLowerCase() === newOptionName.trim().toLowerCase())) return;

    setUserInteracted(true);
    setOptions([...options, { name: newOptionName.trim(), values: [] }]);
    setNewOptionName("");
  };

  const removeOption = (index: number) => {
    setUserInteracted(true);
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const addValueToOption = (optIndex: number) => {
    const val = inputValue[optIndex]?.trim();
    if (!val) return;

    setUserInteracted(true);
    const newOptions = [...options];
    if (!newOptions[optIndex].values.includes(val)) {
      newOptions[optIndex].values.push(val);
      setOptions(newOptions);
    }
    setInputValue({ ...inputValue, [optIndex]: "" });
  };

  const removeValueFromOption = (optIndex: number, valIndex: number) => {
    setUserInteracted(true);
    const newOptions = [...options];
    newOptions[optIndex].values.splice(valIndex, 1);
    setOptions(newOptions);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChange(newVariants);
  };

  const updateVariantLocationStock = (vIndex: number, locationId: string, stock: number) => {
    const newVariants = [...variants];
    const currentStocks = newVariants[vIndex].locationStocks
      ? [...newVariants[vIndex].locationStocks!]
      : [];
    const existingIdx = currentStocks.findIndex((s) => s.locationId === locationId);
    if (existingIdx >= 0) {
      currentStocks[existingIdx] = { locationId, stock };
    } else {
      currentStocks.push({ locationId, stock });
    }
    newVariants[vIndex] = { ...newVariants[vIndex], locationStocks: currentStocks };
    onChange(newVariants);
  };

  return (
    <div className="space-y-6 border rounded-xl p-5 bg-muted/10 shadow-sm">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-start md:space-y-0">
        <div>
          <Label className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Auto-Generate Variants
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Define your options (e.g. Size, Color) and values (e.g. S, M, Red). We'll automatically
            generate the combinations.
          </p>
        </div>
      </div>

      {/* Options Builder */}
      <div className="space-y-4">
        {options.map((opt, optIndex) => (
          <div
            key={optIndex}
            className="bg-background rounded-lg border p-4 space-y-3 relative group transition-all hover:border-primary/30"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeOption(optIndex)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            <Label className="text-sm font-bold">{opt.name}</Label>

            <div className="flex flex-wrap gap-2 items-center">
              {opt.values.map((val, valIndex) => (
                <div
                  key={valIndex}
                  className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium shadow-sm"
                >
                  {val}
                  <button
                    type="button"
                    onClick={() => removeValueFromOption(optIndex, valIndex)}
                    className="ml-1 p-0.5 hover:bg-black/20 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 ml-1">
                <Input
                  size={1}
                  className="h-8 text-sm w-40 bg-muted/50"
                  placeholder={`Add ${opt.name} value...`}
                  value={inputValue[optIndex] || ""}
                  onChange={(e) => setInputValue({ ...inputValue, [optIndex]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addValueToOption(optIndex);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => addValueToOption(optIndex)}
                >
                  Add Value
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Option */}
        <div className="flex items-center gap-2 max-w-sm pt-2">
          <Input
            placeholder="New option type (e.g. Color, Material)"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
          />
          <Button type="button" onClick={addOption} variant="outline" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Option Type
          </Button>
        </div>
      </div>

      {/* Generated Matrix */}
      {variants.length > 0 && (
        <div className="pt-6 border-t space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-bold flex items-center gap-2">
                Generated Variant Matrix{" "}
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-black">
                  {variants.length} Variants
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure prices, SKUs, and allocate branch stock across {locations.length > 0 ? locations.length : 1} outlet(s).
              </p>
            </div>
          </div>

          {/* Bulk Variant Management Toolbar */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Sparkles className="size-3.5 text-primary" /> Rapid Bulk Allocator for All {variants.length} Variants
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Bulk Price */}
              <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-lg border border-border/60">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="h-7 text-xs font-mono w-20"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs font-semibold px-2.5"
                  onClick={() => {
                    if (!bulkPrice) return;
                    const updated = variants.map((v) => ({ ...v, price: bulkPrice }));
                    onChange(updated);
                    toast.success(`Applied ${currencySymbol}${bulkPrice} to all variants`);
                  }}
                >
                  Set Price
                </Button>
              </div>

              {/* Bulk Stock (Product mode) */}
              {mode === "product" && locations.length > 0 && (
                <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-lg border border-border/60">
                  <select
                    value={bulkTargetLoc}
                    onChange={(e) => setBulkTargetLoc(e.target.value)}
                    className="h-7 text-xs rounded-md bg-muted px-2 font-medium border-0 focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Outlets</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Stock Qty"
                    value={bulkStockVal}
                    onChange={(e) => setBulkStockVal(e.target.value)}
                    className="h-7 text-xs font-mono w-20"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2.5"
                    onClick={() => {
                      const qty = parseInt(bulkStockVal) || 0;
                      const updated = variants.map((v) => {
                        const currentStocks = v.locationStocks ? [...v.locationStocks] : [];
                        if (bulkTargetLoc === "all") {
                          locations.forEach((l) => {
                            const idx = currentStocks.findIndex((s) => s.locationId === l.id);
                            if (idx >= 0) currentStocks[idx] = { locationId: l.id, stock: qty };
                            else currentStocks.push({ locationId: l.id, stock: qty });
                          });
                        } else {
                          const idx = currentStocks.findIndex((s) => s.locationId === bulkTargetLoc);
                          if (idx >= 0) currentStocks[idx] = { locationId: bulkTargetLoc, stock: qty };
                          else currentStocks.push({ locationId: bulkTargetLoc, stock: qty });
                        }
                        return { ...v, locationStocks: currentStocks };
                      });
                      onChange(updated);
                      toast.success(`Allocated ${qty} units across ${bulkTargetLoc === "all" ? "all outlets" : "selected outlet"}`);
                    }}
                  >
                    Set Stock
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/60 text-muted-foreground text-[11px] uppercase font-bold tracking-wider border-b border-border/80">
                  <tr>
                    <th className="px-4 py-3">Variant Combo</th>
                    <th className="px-4 py-3 w-36">Price ({currencySymbol})</th>
                    <th className="px-4 py-3 w-32">Cost ({currencySymbol})</th>
                    {mode === "product" && <th className="px-4 py-3 w-40">SKU (Optional)</th>}
                    {mode === "service" && <th className="px-4 py-3 w-36">Duration (Mins)</th>}
                    {mode === "product" &&
                      locations.length > 0 &&
                      locations.map((loc) => (
                        <th key={loc.id} className="px-4 py-3 w-40">
                          {loc.name}
                        </th>
                      ))}
                    {mode === "product" && locations.length > 0 && (
                      <th className="px-3 py-3 w-24 text-center">Total Stock</th>
                    )}
                    {mode === "product" && locations.length > 0 && (
                      <th className="px-3 py-3 w-20 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-card">
                  {variants.map((variant, vIndex) => {
                    const rowTotalStock =
                      variant.locationStocks?.reduce((acc, curr) => acc + (curr.stock || 0), 0) ??
                      0;

                    return (
                      <tr key={vIndex} className="hover:bg-muted/15 transition-colors">
                        <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap text-foreground">
                          {variant.name}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono bg-background"
                            placeholder="0.00"
                            value={variant.price}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateVariant(vIndex, "price", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono bg-background"
                            placeholder="0.00"
                            value={variant.cost}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateVariant(vIndex, "cost", e.target.value)}
                          />
                        </td>
                        {mode === "product" && (
                          <td className="px-4 py-2">
                            <Input
                              className="h-8 text-xs bg-background"
                              placeholder="SKU"
                              value={variant.sku || ""}
                              onChange={(e) => updateVariant(vIndex, "sku", e.target.value)}
                            />
                          </td>
                        )}
                        {mode === "service" && (
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              className="h-8 text-xs bg-background font-mono"
                              placeholder="e.g. 30"
                              value={variant.duration || ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateVariant(vIndex, "duration", e.target.value)}
                            />
                          </td>
                        )}
                        {mode === "product" &&
                          locations.length > 0 &&
                          locations.map((loc) => {
                            const currentStock =
                              variant.locationStocks?.find((s) => s.locationId === loc.id)?.stock ??
                              0;
                            return (
                              <td key={loc.id} className="px-2 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-8 text-xs font-mono bg-background text-right"
                                  placeholder="0"
                                  value={currentStock === 0 ? "" : currentStock}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) =>
                                    updateVariantLocationStock(
                                      vIndex,
                                      loc.id,
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </td>
                            );
                          })}
                        {mode === "product" && locations.length > 0 && (
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono font-bold text-xs rounded-md">
                              {rowTotalStock}
                            </span>
                          </td>
                        )}
                        {mode === "product" && locations.length > 0 && (
                          <td className="px-2 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Copy this variant's stock to all other variants"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                const targetStocks = variant.locationStocks || [];
                                const updated = variants.map((v) => ({
                                  ...v,
                                  locationStocks: JSON.parse(JSON.stringify(targetStocks)),
                                }));
                                onChange(updated);
                                toast.success(`Copied "${variant.name}" stock to all ${variants.length} variants`);
                              }}
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
