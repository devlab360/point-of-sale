import { Search, ScanBarcode, Plus, Image as ImageIcon, MapPin, X, Gem, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getLocationsFn } from "@/api/locations";
import { VariantSelectorModal } from "./VariantSelectorModal";
import { ModifierSelectionModal } from "./ModifierSelectionModal";
import { JewelleryCalculatorModal } from "./JewelleryCalculatorModal";

export function ProductGrid({ state }: { state: any }) {
  const {
    mobileTab,
    query,
    setQuery,
    activeCat,
    setActiveCat,
    categories,
    filtered,
    addToCart,
    addCustomLineToCart,
    formatCurrency,
    products,
    toast,
    getCategoryName,
    getUnitName,
    getBrandName,
    settings,
  } = state;

  const { data: locationsRes } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations = locationsRes?.data || [];

  const [selectedVariantProduct, setSelectedVariantProduct] = useState<any>(null);
  const [selectedJewelleryProduct, setSelectedJewelleryProduct] = useState<any>(null);
  const [selectedModifierProduct, setSelectedModifierProduct] = useState<{
    product: any;
    variant?: any;
  } | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedModifierProduct) {
          setSelectedModifierProduct(null);
        } else if (selectedVariantProduct) {
          setSelectedVariantProduct(null);
        } else if (selectedJewelleryProduct) {
          setSelectedJewelleryProduct(null);
        }
      }
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [selectedModifierProduct, selectedVariantProduct]);

  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    if (!parentRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width >= 1536)
          setColumns(5); // 2xl
        else if (width >= 1280)
          setColumns(4); // xl
        else if (width >= 768)
          setColumns(3); // md, lg
        else if (width >= 640)
          setColumns(3); // sm
        else setColumns(2);
      }
    });
    resizeObserver.observe(parentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const rowCount = Math.ceil(filtered.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 265, // Initial estimate: image (150px) + text area + gap
    measureElement: (el) => (el as HTMLElement).offsetHeight, // Dynamically measure real card height
    overscan: 4, // Render 4 rows ahead/behind
  });

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20",
        mobileTab === "cart" ? "hidden md:flex" : "flex",
      )}
    >
      {/* Top Controls: Search, Barcode, Store Location, Add Product */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 border-b border-border/80 bg-background/95 p-2 sm:p-3 backdrop-blur-md shrink-0">
        {/* Product Search */}
        <div className="relative flex-1 min-w-[130px] md:flex-[3]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="h-11 w-full rounded-xl border border-border/80 bg-card pl-9 pr-8 text-xs sm:text-sm font-medium transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Barcode Scanner — desktop full input */}
        <div className="relative hidden md:flex md:flex-[2] shrink-0">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <input
            placeholder="Scan Barcode..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const b = e.currentTarget.value.trim();
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
                    toast.error(`Barcode not found: ${b}`);
                  }
                }
                e.currentTarget.value = "";
              }
            }}
            className="h-11 w-full rounded-xl border border-primary/30 bg-primary/8 pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-primary/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
          />
        </div>

        {/* Barcode Scanner — mobile compact icon button */}
        <div className="md:hidden shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl border-border/80 bg-card text-foreground hover:text-primary hover:bg-muted/40 shrink-0 cursor-pointer"
                title="Scan Barcode"
              >
                <ScanBarcode className="size-4 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <ScanBarcode className="size-4" />
                  <span>Scan or Enter Barcode</span>
                </div>
                <input
                  autoFocus
                  placeholder="Scan or enter barcode / SKU..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const b = e.currentTarget.value.trim();
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
                          toast.error(`Barcode not found: ${b}`);
                        }
                      }
                      e.currentTarget.value = "";
                    }
                  }}
                  className="h-11 w-full rounded-lg border border-primary/30 bg-primary/5 px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Add Product Button */}
        <Button
          onClick={() => state.setShowAddProduct(true)}
          className="h-11 shrink-0 rounded-xl font-bold shadow-sm gap-1 px-2.5 sm:px-3.5 cursor-pointer"
          title="Add Product"
        >
          <Plus className="size-4" />
          <span className="text-xs hidden sm:inline">Add Product</span>
        </Button>

        {/* Store Location Selector */}
        <Select
          value={state.selectedLocationId || "default"}
          onValueChange={(val) => state.setSelectedLocationId(val === "default" ? null : val)}
        >
          <SelectTrigger
            className="h-11 rounded-xl bg-card border-border/80 text-foreground hover:bg-muted/40 transition-colors w-auto max-w-[130px] sm:max-w-[160px] md:min-w-[140px] px-2.5 gap-1.5 shrink-0 cursor-pointer text-xs"
            title="Store / Location Outlet"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="truncate text-xs font-semibold">
                <SelectValue placeholder="Main Outlet" />
              </span>
            </div>
          </SelectTrigger>
          <SelectContent align="end" className="w-[200px] sm:w-[220px]">
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center gap-1.5">
              <MapPin className="size-3 text-primary" />
              <span>Select Store Outlet</span>
            </div>
            <SelectItem value="default" className="text-xs font-medium">
              Main Outlet
            </SelectItem>
            {locations.map((loc: any) => (
              <SelectItem key={loc.id} value={loc.id} className="text-xs font-medium">
                <div className="flex flex-col">
                  <span>{loc.name}</span>
                  {loc.type && (
                    <span className="text-[10px] text-muted-foreground capitalize">
                      ({loc.type})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto border-b border-border/70 bg-card/60 px-3 py-2.5 scrollbar-none">
        <CatChip
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
          icon="✨"
          label="All Products"
          count={products.length}
        />
        {Array.from(
          new Map(categories.map((c: any) => [c.name.trim().toLowerCase(), c])).values(),
        ).map((c: any) => {
          const count = products.filter(
            (p: any) => p.category === c.name || p.category === c.id,
          ).length;
          return (
            <CatChip
              key={c.id}
              active={activeCat === c.name}
              onClick={() => setActiveCat(c.name)}
              icon={c.icon || "🏷️"}
              label={c.name}
              count={count}
            />
          );
        })}
      </div>

      {/* Products Grid Feed — Scrollable inner area with bottom safe padding */}
      <div
        ref={parentRef}
        className={cn(
          "flex-1 overflow-y-auto p-3 sm:p-4 relative overscroll-contain",
          (state.cart || []).length > 0 ? "pb-24 md:pb-4" : "pb-4",
        )}
      >
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <div className="grid size-14 place-items-center rounded-2xl bg-muted/50 mb-3">
              <Search className="size-6 text-muted-foreground/60" />
            </div>
            <p className="font-bold text-foreground text-sm">No products found</p>
            <p className="mt-1 max-w-xs">Try a different search term or choose another category.</p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columns;
              const rowItems = filtered.slice(startIndex, startIndex + columns);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: "12px",
                      paddingBottom: "12px", // acts as row gap
                    }}
                  >
                    {rowItems.map((p: any) => {
                      const isService = p.referenceType === "SERVICE";
                      const low =
                        !isService &&
                        Number(p.stock) > 0 &&
                        Number(p.stock) <= Number(p.reorderLevel);
                      const out = !isService && p.stock <= 0;
                      const catName = getCategoryName
                        ? getCategoryName(p.category)
                        : p.category || "";
                      const unitName = getUnitName ? getUnitName(p.unit) : p.unit || "";
                      const brandName = getBrandName ? getBrandName(p.brand) : p.brand || "";
                      const subText = [catName, brandName].filter(Boolean).join(" · ") || unitName;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (p.metadata?.isJewellery || settings?.businessType === "JEWELLERY") {
                              setSelectedJewelleryProduct(p);
                            } else if (p.hasVariants) {
                              setSelectedVariantProduct(p);
                            } else if (p.hasModifiers) {
                              setSelectedModifierProduct({ product: p });
                            } else {
                              addToCart(p.id);
                            }
                          }}
                          disabled={out}
                          style={{ height: "100%" }}
                          className={cn(
                            "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-left transition-all duration-200 hover:border-primary/50 hover:shadow-card-hover card-interactive focus:outline-none focus:ring-2 focus:ring-primary/20",
                            out && "opacity-60 cursor-not-allowed",
                          )}
                        >
                          {/* Thumbnail & Badges */}
                          <div className="relative h-[150px] w-full shrink-0 overflow-hidden bg-muted/40 flex items-center justify-center border-b border-border/50">
                            {p.image && !p.image.includes("1542838132") ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                loading="lazy"
                                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                                <ImageIcon className="size-10" strokeWidth={1.5} />
                              </div>
                            )}

                            {/* Stock Status Pills */}
                            {low && !out && (
                              <span className="absolute left-2 top-2 rounded-full bg-warning/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-warning-foreground shadow-sm backdrop-blur-sm">
                                {p.stock} left
                              </span>
                            )}
                            {out && (
                              <span className="absolute left-2 top-2 rounded-full bg-destructive/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                                Out of Stock
                              </span>
                            )}
                            {isService && (
                              <span className="absolute left-2 top-2 rounded-full bg-primary/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-sm">
                                Service
                              </span>
                            )}
                            {p.metadata?.isJewellery && (
                              <span className="absolute right-2 top-2 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm flex items-center gap-1">
                                <Gem className="size-2.5" />
                                {p.metadata.purityKarat || "22K"}
                              </span>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex flex-1 flex-col justify-between p-3 min-h-[84px]">
                            <div>
                              <h4 className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground leading-tight">
                                {p.name}
                              </h4>
                              {subText && (
                                <p className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                                  {subText}
                                </p>
                              )}
                              {p.metadata?.compatibleVehicles && (
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                  Fit: {p.metadata.compatibleVehicles}
                                </p>
                              )}
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-border/40 pt-2 shrink-0">
                              <span className="number text-sm sm:text-base font-black text-primary">
                                {formatCurrency(p.price)}
                              </span>
                              <div className="flex items-center gap-1">
                                {p.metadata?.hasWarranty && (
                                  <span className="text-[9px] font-bold rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-0.5" title="Warranty Protected">
                                    <ShieldCheck className="size-2.5" />
                                    {p.metadata.warrantyMonths}M
                                  </span>
                                )}
                                {p.hasVariants && (
                                  <span className="text-[9px] font-bold rounded-md bg-secondary/80 px-1.5 py-0.5 text-secondary-foreground uppercase tracking-wider">
                                    Variants
                                  </span>
                                )}
                                {/* Always-visible quick add button */}
                                <span
                                  className={cn(
                                    "grid size-8 rounded-lg place-items-center transition-colors",
                                    "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                                  )}
                                  aria-hidden="true"
                                >
                                  <Plus className="size-4 stroke-[2.5]" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
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

      {selectedJewelleryProduct && (
        <JewelleryCalculatorModal
          product={selectedJewelleryProduct}
          isOpen={true}
          onClose={() => setSelectedJewelleryProduct(null)}
          onAddToCart={(customLine) => {
            if (addCustomLineToCart) {
              addCustomLineToCart(customLine);
            } else {
              addToCart(customLine.productId);
            }
          }}
          settings={settings}
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
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm font-bold"
          : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.2 text-[9px] font-bold",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
