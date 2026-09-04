import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getProductVariantsFn } from "@/api/products";
import { getServiceVariantsFn } from "@/api/services";
import { Loader2, X, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/lib/currency";

interface VariantSelectorModalProps {
  product: any;
  onClose: () => void;
  onSelect: (variant: any) => void;
}

export function VariantSelectorModal({ product, onClose, onSelect }: VariantSelectorModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const isService = product.referenceType === "SERVICE";

  const { data: response, isLoading } = useQuery({
    queryKey: [isService ? "serviceVariants" : "productVariants", product.id],
    queryFn: () =>
      isService
        ? getServiceVariantsFn({ data: product.id })
        : getProductVariantsFn({ data: { productId: product.id } }),
  });

  const variants = response?.data || [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border/80 max-h-[90vh] flex flex-col">
        <div className="p-3.5 sm:p-4 border-b border-border/80 flex justify-between items-center bg-muted/30 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold">{product.name}</h2>
            <p className="text-xs text-muted-foreground">
              {t("selectVariant") || "Select a variant"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>{t("loadingVariants", "Loading variants...")}</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {isService
                ? "No variants found for this service."
                : "No variants found for this product."}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Variant Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                      selectedVariantId === variant.id
                        ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm"
                        : "hover:border-muted-foreground/30 hover:bg-muted/20"
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm truncate">{variant.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="text-primary font-bold text-xs sm:text-sm">
                        {formatCurrency(variant.price)}
                      </div>
                      {isService && variant.duration && (
                        <div className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {variant.duration}m
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selection Summary & Action */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">{t("totalPrice", "Total Price")}</div>
                  <div className="text-lg sm:text-2xl font-black text-primary">
                    {formatCurrency(selectedVariant ? selectedVariant.price : 0)}
                  </div>
                </div>
                <Button
                  size="lg"
                  disabled={!selectedVariant}
                  onClick={() => selectedVariant && onSelect(selectedVariant)}
                  className="rounded-xl px-5 sm:px-8 shadow-sm h-11 text-xs sm:text-sm font-bold"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  {t("addToCart") || "Add to Cart"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
