import { Search, ScanBarcode, Plus, Image as ImageIcon, MapPin, X, Sparkles } from "lucide-react";
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
  const [selectedModifierProduct, setSelectedModifierProduct] = useState<{
    product: any;
    variant?: any;
  } | null>(null);

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
    estimateSize: () => 240, // Approx height of card (130px img + 90px text) + gap
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
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border/80 bg-background/95 p-2 sm:p-3 backdrop-blur-md">
        {/* Product Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="h-10 w-full rounded-xl border border-border/80 bg-card pl-9 pr-8 text-xs sm:text-sm font-medium transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Barcode Scanner - Desktop Full Input */}
        <div className="relative hidden md:flex flex-1 lg:max-w-[280px] shrink-0">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <input
            placeholder="Scan Barcode..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const b = e.currentTarget.value.trim();
                if (b.length > 2) {
                  const product = products.find((p: any) => p.barcode === b || p.sku === b);
                  if (product) {
                    const stockNum = Number(product.stock ?? 0);
                    const isService = product.referenceType === "SERVICE";
                    if (!isService && stockNum <= 0) {
                      toast.error(`Insufficient stock for "${product.name}". Available: ${stockNum}`);
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
            className="h-10 w-full rounded-xl border border-primary/30 bg-primary/8 pl-9 pr-3 font-mono text-xs sm:text-sm text-foreground placeholder:text-primary/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
          />
        </div>

        {/* Barcode Scanner - Mobile Popover Icon Button */}
        <div className="md:hidden shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-10 rounded-xl border-border/80 bg-card text-muted-foreground hover:text-primary hover:bg-muted/40"
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
                          const stockNum = Number(product.stock ?? 0);
                          const isService = product.referenceType === "SERVICE";
                          if (!isService && stockNum <= 0) {
                            toast.error(`Insufficient stock for "${product.name}". Available: ${stockNum}`);
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
                  className="h-9 w-full rounded-lg border border-primary/30 bg-primary/5 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Store Location Selector - Icon only on mobile, full selector on desktop */}
        <div className="shrink-0">
          <Select
            value={state.selectedLocationId || "default"}
            onValueChange={(val) => state.setSelectedLocationId(val === "default" ? null : val)}
          >
            <SelectTrigger
              className="size-10 p-0 justify-center rounded-xl bg-card border-border/80 text-primary hover:bg-muted/40 transition-colors md:w-[160px] md:h-10 md:px-3 md:justify-between shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block"
              title="Store / Location Outlet"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="hidden md:inline truncate text-xs font-semibold">
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

        {/* Add Product Button - Icon '+' on mobile, full button on desktop */}
        <Button
          onClick={() => state.setShowAddProduct(true)}
          size="sm"
          className="size-10 p-0 rounded-xl font-bold shadow-sm md:w-auto md:h-10 md:px-3.5 md:gap-1.5 shrink-0"
          title="Add Product"
        >
          <Plus className="size-4" />
          <span className="hidden md:inline">Add Product</span>
        </Button>
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto border-b border-border/70 bg-card/60 px-3 py-2 scrollbar-none">
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

      {/* Products Grid Feed */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-3 sm:p-4 relative">
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-muted-foreground">
            <div className="grid size-12 place-items-center rounded-2xl bg-muted/50 mb-2">
              <Search className="size-6 text-muted-foreground/60" />
            </div>
            <p className="font-semibold text-foreground">No products match search criteria</p>
            <p className="mt-0.5">Try searching by another title, SKU or category filter.</p>
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
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: "12px",
                    paddingBottom: "12px", // acts as row gap
                  }}
                >
                  {rowItems.map((p: any) => {
                    const isService = p.referenceType === "SERVICE";
                    const stockNum = Number(p.stock ?? 0);
                    const cartLines = (state.cart || []).filter((c: any) => c.id === p.id);
                    const inCartQty = cartLines.reduce((sum: number, c: any) => sum + Number(c.qty || 0), 0);
                    const remainingStock = Math.max(0, stockNum - inCartQty);
                    const out = !isService && stockNum <= 0;
                    const isCartMax = !isService && stockNum > 0 && inCartQty >= stockNum;
                    const isLow = !isService && remainingStock > 0 && remainingStock <= Number(p.reorderLevel || 5);
                    const catName = getCategoryName
                      ? getCategoryName(p.category)
                      : p.category || "";
                    const unitName = getUnitName ? getUnitName(p.unit) : p.unit || "";
                    const brandName = getBrandName ? getBrandName(p.brand) : p.brand || "";
                    const subText = [catName, brandName].filter(Boolean).join(" · ") || unitName;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (out) {
                            toast.error(
                              `Insufficient stock for "${p.name}". Available: ${stockNum}`,
                            );
                            return;
                          }
                          if (isCartMax) {
                            toast.error(
                              `Already added all available stock for "${p.name}" (${stockNum} in cart)`,
                            );
                            return;
                          }
                          if (p.hasVariants) {
                            setSelectedVariantProduct(p);
                          } else if (p.hasModifiers) {
                            setSelectedModifierProduct({ product: p });
                          } else {
                            addToCart(p.id);
                          }
                        }}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-left transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer select-none active:scale-[0.98]",
                          (out || isCartMax) && "opacity-75",
                        )}
                      >
                        {/* Thumbnail & Badges */}
                        <div className="relative h-[115px] sm:h-[135px] w-full shrink-0 overflow-hidden bg-muted/40 flex items-center justify-center border-b border-border/40">
                          {p.image &&
                          !p.image.includes("1542838132") &&
                          !p.image.includes("unsplash") ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                              <ImageIcon className="size-8 sm:size-9" strokeWidth={1.5} />
                            </div>
                          )}

                          {/* Stock Status Pills */}
                          {out && (
                            <span className="absolute left-2 top-2 rounded-full bg-destructive/90 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                              Out of Stock
                            </span>
                          )}
                          {!out && isCartMax && (
                            <span className="absolute left-2 top-2 rounded-full bg-primary/90 text-primary-foreground px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                              {inCartQty} in Cart (Max)
                            </span>
                          )}
                          {!out && !isCartMax && isLow && (
                            <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                              {remainingStock % 1 === 0 ? remainingStock : remainingStock.toFixed(2)} left
                            </span>
                          )}
                          {isService && (
                            <span className="absolute left-2 top-2 rounded-full bg-primary/90 text-primary-foreground px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                              Service
                            </span>
                          )}

                          {/* Mobile-Friendly Quick Add Floating Circular Button */}
                          {!out && !isCartMax && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (p.hasVariants) {
                                  setSelectedVariantProduct(p);
                                } else if (p.hasModifiers) {
                                  setSelectedModifierProduct({ product: p });
                                } else {
                                  addToCart(p.id);
                                }
                              }}
                              className="absolute right-2 bottom-2 size-7 sm:size-8 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center active:scale-90 transition-transform z-10 hover:bg-primary/90"
                              title="Add to cart"
                            >
                              <Plus className="size-4 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3 min-h-[72px]">
                          <div>
                            <h4 className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground leading-tight">
                              {p.name}
                            </h4>
                            {subText && (
                              <p className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                                {subText}
                              </p>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 shrink-0">
                            <span className="number text-xs sm:text-sm font-black text-primary">
                              {formatCurrency(p.price)}
                            </span>
                            {p.hasVariants && (
                              <span className="text-[9px] font-bold rounded-md bg-secondary px-1.5 py-0.5 text-secondary-foreground uppercase tracking-wider">
                                Variants
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm font-bold"
          : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <span className="text-xs">{icon}</span>
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
