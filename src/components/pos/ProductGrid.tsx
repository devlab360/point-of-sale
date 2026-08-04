import { Search, Keyboard, ScanBarcode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30",
        mobileTab === "cart" ? "hidden md:flex" : "flex",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border bg-background p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by name, SKU or barcode... (F1)"
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5 px-3 text-xs"
            onClick={() => setShowShortcutsHelp(true)}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="size-4 text-primary" />{" "}
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
          <div className="relative flex-1 lg:w-72">
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
              className="h-11 w-full rounded-xl border border-primary/30 bg-primary/5 pl-10 pr-3 font-mono text-sm placeholder:text-primary/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5">
        <CatChip
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
          icon="🛒"
          label="All"
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
              const low = p.stock > 0 && p.stock <= p.reorderLevel;
              const out = p.stock <= 0;
              const catName = getCategoryName ? getCategoryName(p.category) : p.category || "";
              const unitName = getUnitName ? getUnitName(p.unit) : p.unit || "";
              const brandName = getBrandName ? getBrandName(p.brand) : p.brand || "";
              const subText = [catName, brandName].filter(Boolean).join(" · ") || unitName;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id)}
                  disabled={out}
                  className={cn(
                    "group relative w-full min-w-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left cursor-pointer shadow-soft transition-all duration-300 hover:border-primary/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20",
                    out && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center shrink-0 border-b border-border/50">
                    <img
                      src={
                        p.image ||
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300&h=300"
                      }
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {low && !out && (
                      <span className="absolute left-2 top-2 rounded bg-warning/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-foreground shadow-sm backdrop-blur-sm">
                        Low Stock
                      </span>
                    )}
                    {out && (
                      <span className="absolute left-2 top-2 rounded bg-destructive/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                        Out of Stock
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
