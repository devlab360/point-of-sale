import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Sparkles } from "lucide-react";
import { useCurrency } from "@/lib/currency";

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
}

interface VariantOption {
  name: string;
  values: string[];
}

interface VariantManagerProps {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  mode?: "product" | "service";
}

// Helper to generate cartesian product of arrays
const cartesian = (...a: any[][]) =>
  a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

export function VariantManager({ variants, onChange, mode = "product" }: VariantManagerProps) {
  const { currencySymbol } = useCurrency();
  // Try to reconstruct options from existing variants
  const initialOptions = useMemo(() => {
    if (!variants || variants.length === 0) return [{ name: "Size", values: [] }];

    const optsMap = new Map<string, Set<string>>();
    variants.forEach((v) => {
      v.attributes?.forEach((attr) => {
        if (!optsMap.has(attr.name)) optsMap.set(attr.name, new Set());
        if (attr.value) optsMap.get(attr.name)?.add(attr.value);
      });
    });

    const opts: VariantOption[] = [];
    optsMap.forEach((valSet, name) => {
      opts.push({ name, values: Array.from(valSet) });
    });
    return opts.length > 0 ? opts : [{ name: "Size", values: [] }];
  }, []); // Only compute once on mount

  const [options, setOptions] = useState<VariantOption[]>(initialOptions);
  const [newOptionName, setNewOptionName] = useState("");
  const [inputValue, setInputValue] = useState<Record<number, string>>({});

  // When options change, automatically generate the variant matrix
  useEffect(() => {
    const validOptions = options.filter((o) => o.values.length > 0);

    if (validOptions.length === 0) {
      if (variants.length > 0) onChange([]);
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
      // combo is an array of {name, value}
      const comboName = combo.map((c: any) => c.value).join(" / ");

      // Look for existing variant to preserve price/sku
      const existing = variants.find((v) => v.name === comboName);

      if (existing) {
        return {
          ...existing,
          attributes: combo, // ensure attributes are exactly matched
        };
      }

      return {
        name: comboName,
        sku: mode === "product" ? "" : undefined,
        barcode: mode === "product" ? "" : undefined,
        duration: mode === "service" ? "" : undefined,
        price: "",
        cost: "",
        attributes: combo,
      };
    });

    // Only trigger onChange if the generated variants are structurally different
    const isDifferent =
      newVariants.length !== variants.length ||
      newVariants.some((nv, i) => nv.name !== variants[i]?.name);

    if (isDifferent) {
      onChange(newVariants);
    }
  }, [options]);

  const addOption = () => {
    if (!newOptionName.trim()) return;
    if (options.some((o) => o.name.toLowerCase() === newOptionName.trim().toLowerCase())) return;

    setOptions([...options, { name: newOptionName.trim(), values: [] }]);
    setNewOptionName("");
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const addValueToOption = (optIndex: number) => {
    const val = inputValue[optIndex]?.trim();
    if (!val) return;

    const newOptions = [...options];
    if (!newOptions[optIndex].values.includes(val)) {
      newOptions[optIndex].values.push(val);
      setOptions(newOptions);
    }
    setInputValue({ ...inputValue, [optIndex]: "" });
  };

  const removeValueFromOption = (optIndex: number, valIndex: number) => {
    const newOptions = [...options];
    newOptions[optIndex].values.splice(valIndex, 1);
    setOptions(newOptions);
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
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
        <div className="pt-6 border-t">
          <div className="mb-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              Generated Matrix{" "}
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                {variants.length}
              </span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Set the price and SKU for each combination.
            </p>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3 w-40">Price ({currencySymbol})</th>
                    <th className="px-4 py-3 w-40">Cost ({currencySymbol})</th>
                    {mode === "product" && <th className="px-4 py-3 w-48">SKU (Optional)</th>}
                    {mode === "service" && <th className="px-4 py-3 w-48">Duration (Mins)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y bg-card">
                  {variants.map((variant, vIndex) => (
                    <tr key={vIndex} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{variant.name}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="h-8 font-mono bg-background"
                          placeholder="0.00"
                          value={variant.price}
                          onChange={(e) => updateVariant(vIndex, "price", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="h-8 font-mono bg-background"
                          placeholder="0.00"
                          value={variant.cost}
                          onChange={(e) => updateVariant(vIndex, "cost", e.target.value)}
                        />
                      </td>
                      {mode === "product" && (
                        <td className="px-4 py-2">
                          <Input
                            className="h-8 bg-background"
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
                            className="h-8 bg-background font-mono"
                            placeholder="e.g. 30"
                            value={variant.duration || ""}
                            onChange={(e) => updateVariant(vIndex, "duration", e.target.value)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
