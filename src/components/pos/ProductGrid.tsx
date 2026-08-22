import { Search, Keyboard, ScanBarcode, Plus, Image as ImageIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLocationsFn } from "@/api/locations";
import { VariantSelectorModal } from "./VariantSelectorModal";
import { ModifierSelectionModal } from "./ModifierSelectionModal";

export function ProductGrid({ state }: { state: any }) {
  const {
    mobileTab,
    query,
    setQuery,
    setShowShortcutsHelp,
    activeCat,
    setActiveCat,
    categories,
    filtered,
    addToCart,
    formatCurrency,
    products,
    toast,
    getCategoryName,
    getUnitName,
    getBrandName,
  } = state;

  const { data: locationsRes } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations = locationsRes?.data || [];
  
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<any>(null);
  const [selectedModifierProduct, setSelectedModifierProduct] = useState<{product: any, variant?: any} | null>(null);

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30",
        mobileTab === "cart" ? "hidden md:flex" : "flex",
      )}
    >
      <div className="flex flex-col md:flex-row gap-3 border-b border-border bg-background p-2 md:items-center">
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, SKU or barcode..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="relative flex-1 lg:max-w-[320px]">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <input
              placeholder="Scan barcode..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const b = e.currentTarget.value;
                  if (b.length > 2) {
                    const product = products.find((p: any) => p.barcode === b || p.sku === b);
                    if (product) {
                      if (product.stock <= 0) {
                        toast.error(`${product.name} is out of stock`);
                      } else {
                        addToCart(product.id);
                        toast.success(`Scanned: ${product.name}`);
                      }
                    } else {
                      toast.error(`Unknown barcode: ${b}`);
                    }
                  }
                  e.currentTarget.value = "";
                }
              }}
              className="h-9 w-full rounded-lg border border-primary/30 bg-primary/5 pl-10 pr-3 font-mono text-sm placeholder:text-primary/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Select 
            value={state.selectedLocationId || "default"} 
            onValueChange={(val) => state.setSelectedLocationId(val === "default" ? null : val)}
          >
            <SelectTrigger className="w-[180px] h-9 bg-card">
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Main Store" />
            </SelectTrigger>
            <SelectContent>
              {locations.length === 0 && <SelectItem value="default">Main Store</SelectItem>}
              {locations.map((loc: any) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => state.setShowAddProduct(true)}
            className="flex-1 md:flex-none h-9 shrink-0 rounded-lg px-4 gap-2"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">
        <CatChip
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
          icon=""
          label="All Products"
        />
        {Array.from(
          new Map(categories.map((c: any) => [c.name.trim().toLowerCase(), c])).values(),
        ).map((c: any) => (
          <CatChip
            key={c.id}
            active={activeCat === c.name}
            onClick={() => setActiveCat(c.name)}
            icon={c.icon}
            label={c.name}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No products match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((p: any) => {
              const isService = p.referenceType === "SERVICE";
              const low = !isService && Number(p.stock) > 0 && Number(p.stock) <= Number(p.reorderLevel);
              const out = !isService && p.stock <= 0;
              const catName = getCategoryName ? getCategoryName(p.category) : p.category || "";
              const unitName = getUnitName ? getUnitName(p.unit) : p.unit || "";
              const brandName = getBrandName ? getBrandName(p.brand) : p.brand || "";
              const subText = [catName, brandName].filter(Boolean).join(" · ") || unitName;

              return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.hasVariants) {
                        setSelectedVariantProduct(p);
                      } else if (p.hasModifiers) {
                        setSelectedModifierProduct({ product: p });
                      } else {
                        addToCart(p.id);
                      }
                    }}
                    disabled={out}
                  className={cn(
                    "group relative w-full min-w-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left cursor-pointer shadow-soft transition-all duration-300 hover:border-primary/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20",
                    out && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center shrink-0 border-b border-border/50">
                    {p.image && !p.image.includes("1542838132") && !p.image.includes("unsplash") ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                        <ImageIcon className="size-10" strokeWidth={1.5} />
                      </div>
                    )}
                    {low && !out && p.referenceType !== "SERVICE" && (
                      <span className="absolute left-2 top-2 rounded bg-warning/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-foreground shadow-sm backdrop-blur-sm">
                        Low Stock
                      </span>
                    )}
                    {out && p.referenceType !== "SERVICE" && (
                      <span className="absolute left-2 top-2 rounded bg-destructive/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                        Out of Stock
                      </span>
                    )}
                    {p.referenceType === "SERVICE" && (
                      <span className="absolute left-2 top-2 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-sm">
                        Service
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full bg-primary/90 py-1.5 text-center text-[11px] font-bold text-primary-foreground backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0 flex items-center justify-center gap-1 shadow-inner">
                      <Plus className="size-3.5" /> Add to Order
                    </div>
                  </div>
                  <div className="flex w-full flex-col flex-1 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-2 text-sm font-bold leading-tight text-foreground">
                        {p.name}
                      </div>
                      {subText && (
                        <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                          {subText}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="number text-lg font-black tracking-tight text-primary">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedVariantProduct && (
        <VariantSelectorModal 
          product={selectedVariantProduct} 
          onClose={() => setSelectedVariantProduct(null)} 
          onSelect={(variant) => {
            if (selectedVariantProduct.hasModifiers) {
              setSelectedModifierProduct({ product: selectedVariantProduct, variant });
              setSelectedVariantProduct(null);
            } else {
              addToCart(selectedVariantProduct.id, variant.id, variant.name, variant.price);
              setSelectedVariantProduct(null);
              toast.success(`Added ${variant.name} to cart`);
            }
          }} 
        />
      )}

      {selectedModifierProduct && (
        <ModifierSelectionModal
          product={selectedModifierProduct.product}
          isOpen={true}
          onClose={() => setSelectedModifierProduct(null)}
          onConfirm={(selectedModifiers) => {
            const { product, variant } = selectedModifierProduct;
            addToCart(product.id, variant?.id, variant?.name, variant?.price, selectedModifiers);
            setSelectedModifierProduct(null);
            toast.success(`Added ${product.name} to cart`);
          }}
        />
      )}
    </div>
  );
}

function CatChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
