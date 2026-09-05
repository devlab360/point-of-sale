import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { getProductModifiersFn } from "@/api/modifiers";
import { Loader2, Sparkles, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SelectedModifier {
  id: string; // group id
  name: string;
  optionId: string;
  optionName: string;
  price: number;
}

interface ModifierSelectionModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModifiers: SelectedModifier[]) => void;
}

export function ModifierSelectionModal({
  product,
  isOpen,
  onClose,
  onConfirm,
}: ModifierSelectionModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [selected, setSelected] = useState<SelectedModifier[]>([]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["productModifiers", product?.id],
    queryFn: () => getProductModifiersFn({ data: { productId: product.id } }),
    enabled: !!product?.id && isOpen,
  });

  const modifiers = response?.data || product?.modifiers || [];

  useEffect(() => {
    if (isOpen) {
      setSelected([]);
    }
  }, [isOpen]);

  const handleToggleMultiple = (group: any, option: any, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [
        ...prev,
        {
          id: group.id,
          name: group.name,
          optionId: option.id,
          optionName: option.name,
          price: Number(option.price),
        },
      ]);
    } else {
      setSelected((prev) => prev.filter((m) => !(m.id === group.id && m.optionId === option.id)));
    }
  };

  const handleSelectSingle = (group: any, optionId: string) => {
    const option = group.options.find((o: any) => o.id === optionId);
    if (!option) return;

    setSelected((prev) => {
      const filtered = prev.filter((m) => m.id !== group.id);
      return [
        ...filtered,
        {
          id: group.id,
          name: group.name,
          optionId: option.id,
          optionName: option.name,
          price: Number(option.price),
        },
      ];
    });
  };

  const handleConfirm = () => {
    // Validation
    for (const group of modifiers) {
      if (group.isRequired) {
        const hasSelection = selected.some((s) => s.id === group.id);
        if (!hasSelection) {
          toast.error(`${t("pleaseSelectOptionFor", "Please select an option for")} ${group.name}`);
          return;
        }
      }
    }
    onConfirm(selected);
  };

  const modifiersTotal = selected.reduce((sum, s) => sum + s.price, 0);
  const grandTotal = Number(product?.price || 0) + modifiersTotal;

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-modal bg-card">
        {/* Header */}
        <div className="p-4 sm:p-5 pr-14 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs shrink-0">
              <SlidersHorizontal className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {t("selectModifiersAddons", "Select modifiers, variations, and add-ons")}
              </DialogDescription>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-extrabold uppercase text-muted-foreground">
              {t("basePrice", "Base")}
            </div>
            <div className="text-sm font-black text-foreground number">
              {formatCurrency(Number(product.price || 0))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground flex-1">
            <Loader2 className="size-7 animate-spin mb-3 text-primary" />
            <p className="text-xs font-semibold">{t("loadingOptions", "Loading options...")}</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
            {modifiers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t("noModifiersFound", "No modifiers found for this item.")}
              </div>
            ) : (
              modifiers.map((group: any) => (
                <div
                  key={group.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 shadow-2xs"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {group.name}
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        ({group.selectionType === "single" ? t("choose1", "Choose 1") : t("multipleChoicesAllowed", "Multiple choices allowed")})
                      </span>
                    </div>
                    {group.isRequired && (
                      <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20">
                        {t("required", "Required")}
                      </span>
                    )}
                  </div>

                  {group.selectionType === "single" ? (
                    <RadioGroup
                      onValueChange={(val) => handleSelectSingle(group, val)}
                      value={selected.find((s) => s.id === group.id)?.optionId || ""}
                    >
                      <div className="space-y-1.5">
                        {group.options.map((opt: any) => (
                          <label
                            key={opt.id}
                            htmlFor={opt.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center space-x-2.5">
                              <RadioGroupItem value={opt.id} id={opt.id} />
                              <span className="text-xs font-semibold text-foreground">
                                {opt.name}
                              </span>
                            </div>
                            {Number(opt.price) > 0 && (
                              <span className="text-xs font-bold text-primary number">
                                +{formatCurrency(Number(opt.price))}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="space-y-1.5">
                      {group.options.map((opt: any) => (
                        <label
                          key={opt.id}
                          htmlFor={opt.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            <Checkbox
                              id={opt.id}
                              checked={selected.some(
                                (s) => s.id === group.id && s.optionId === opt.id,
                              )}
                              onCheckedChange={(checked) =>
                                handleToggleMultiple(group, opt, checked as boolean)
                              }
                            />
                            <span className="text-xs font-semibold text-foreground">{opt.name}</span>
                          </div>
                          {Number(opt.price) > 0 && (
                            <span className="text-xs font-bold text-primary number">
                              +{formatCurrency(Number(opt.price))}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("totalPrice", "Total Price")}
            </div>
            <div className="text-lg sm:text-xl font-black text-primary number">
              {formatCurrency(grandTotal)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold rounded-xl"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="h-10 px-5 text-xs font-bold rounded-xl shadow-xs"
            >
              {t("addToCart", "Add to Cart")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
