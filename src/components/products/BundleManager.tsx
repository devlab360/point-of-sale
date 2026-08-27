import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Trash2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProductsFn } from "@/api/products";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface BundleComponent {
  componentProductId: string;
  componentVariantId?: string | null;
  quantity: number;
}

interface BundleManagerProps {
  components: BundleComponent[];
  onChange: (components: BundleComponent[]) => void;
  basePrice: number;
  onAutoSumPrice: (newPrice: number) => void;
}

export function BundleManager({
  components,
  onChange,
  basePrice,
  onAutoSumPrice,
}: BundleManagerProps) {
  const { data: productsRes } = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      getProductsFn({ data: { page: 1, pageSize: 1000, query: "" } }).then(
        (res) => res?.data || [],
      ),
  });
  const products = productsRes || [];
  const sellableProducts = products.filter((p) => !p.isBundle);

  const addComponent = () => {
    onChange([...components, { componentProductId: "", quantity: 1 }]);
  };

  const removeComponent = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    onChange(newComponents);
  };

  const updateComponent = (index: number, field: keyof BundleComponent, value: any) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    onChange(newComponents);
  };

  const calculateAutoSum = () => {
    let total = 0;
    components.forEach((c) => {
      const prod = products.find((p) => p.id === c.componentProductId);
      if (prod) {
        if (c.componentVariantId && prod.variants) {
          const v = prod.variants.find((v: any) => v.id === c.componentVariantId);
          total += (Number(v?.price) || Number(prod.price)) * c.quantity;
        } else {
          total += Number(prod.price) * c.quantity;
        }
      }
    });
    onAutoSumPrice(total);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Package className="size-4" />
            Bundle Components
          </Label>
          <p className="text-xs text-muted-foreground">
            Select items that make up this bundle. Inventory will be deducted from these components
            upon sale.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addComponent}>
          + Add Item
        </Button>
      </div>

      <div className="space-y-3 mt-4">
        {components.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground bg-white border rounded-md">
            No items in bundle yet. Click "Add Item" to start.
          </div>
        ) : (
          components.map((comp, index) => {
            const selectedProduct = products.find((p) => p.id === comp.componentProductId);
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-white border rounded-md shadow-sm"
              >
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <SearchableSelect
                    options={sellableProducts.map((p: any) => ({ label: p.name, value: p.id }))}
                    value={comp.componentProductId}
                    onChange={(val) => {
                      updateComponent(index, "componentProductId", val);
                      updateComponent(index, "componentVariantId", null);
                    }}
                    placeholder="Select product..."
                  />
                </div>

                {selectedProduct?.hasVariants && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Variant</Label>
                    <SearchableSelect
                      options={selectedProduct.variants.map((v: any) => ({
                        label: v.name,
                        value: v.id,
                      }))}
                      value={comp.componentVariantId || ""}
                      onChange={(val) => updateComponent(index, "componentVariantId", val)}
                      placeholder="Select variant..."
                    />
                  </div>
                )}

                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={comp.quantity}
                    onChange={(e) => updateComponent(index, "quantity", Number(e.target.value))}
                  />
                </div>

                <div className="pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeComponent(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {components.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Current Bundle Price:{" "}
            <span className="font-medium text-foreground">{formatCurrency(basePrice)}</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={calculateAutoSum}>
            Auto-Sum Price from Components
          </Button>
        </div>
      )}
    </div>
  );
}
