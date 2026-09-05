import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getProductVariantsFn } from "@/api/products";
import { getServiceVariantsFn } from "@/api/services";
import { Loader2, ShoppingCart, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface VariantSelectorModalProps {
  product: any;
  onClose: () => void;
  onSelect: (variant: any) => void;
}

export function VariantSelectorModal({ product, onClose, onSelect }: VariantSelectorModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const isService = product?.referenceType === "SERVICE";

  const { data: response, isLoading } = useQuery({
    queryKey: [isService ? "serviceVariants" : "productVariants", product?.id],
    queryFn: () =>
      isService
        ? getServiceVariantsFn({ data: product.id })
        : getProductVariantsFn({ data: { productId: product.id } }),
    enabled: !!product?.id,
  });

  const variants: any[] = response?.data || [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  if (!product) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-modal bg-card">
        {/* Header */}
        <div className="p-4 sm:p-5 pr-14 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs shrink-0">
              <Layers className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {t("selectVariant", "Select variant / option to add to cart")}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary mb-3" />
              <p className="text-xs font-semibold">{t("loadingVariants", "Loading variants...")}</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs font-medium">
              {isService
                ? t("noServiceVariantsFound", "No variants found for this service.")
                : t("noProductVariantsFound", "No variants found for this product.")}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {variants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/8 shadow-xs"
                        : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {variant.name}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-2">
                      <span className="text-primary font-black text-xs sm:text-sm number">
                        {formatCurrency(variant.price)}
                      </span>
                      {isService && variant.duration && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {variant.duration}m
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("totalPrice", "Total Price")}
            </div>
            <div className="text-lg sm:text-xl font-black text-primary number">
              {formatCurrency(selectedVariant ? selectedVariant.price : product.price || 0)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-10 px-4 text-xs font-semibold"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              disabled={!selectedVariant}
              onClick={() => selectedVariant && onSelect(selectedVariant)}
              className="rounded-xl px-5 shadow-xs h-10 text-xs font-bold gap-1.5"
            >
              <ShoppingCart className="size-4" />
              <span>{t("addToCart", "Add to Cart")}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
