import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrency } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { getProductModifiersFn } from "@/api/modifiers";
import { Loader2 } from "lucide-react";

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
          alert(`Please select an option for ${group.name}`);
          return;
        }
      }
    }
    onConfirm(selected);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {product.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading modifiers...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {modifiers.map((group: any) => (
              <div key={group.id} className="space-y-3 border-b pb-4 last:border-0">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">{group.name}</Label>
                  {group.isRequired && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>

                {group.selectionType === "single" ? (
                  <RadioGroup
                    onValueChange={(val) => handleSelectSingle(group, val)}
                    value={selected.find((s) => s.id === group.id)?.optionId || ""}
                  >
                    <div className="space-y-2">
                      {group.options.map((opt: any) => (
                        <div key={opt.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label htmlFor={opt.id} className="font-normal cursor-pointer">
                              {opt.name}
                            </Label>
                          </div>
                          {Number(opt.price) > 0 && (
                            <span className="text-sm text-muted-foreground">
                              +{formatCurrency(Number(opt.price))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {group.options.map((opt: any) => (
                      <div key={opt.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={opt.id}
                            checked={selected.some(
                              (s) => s.id === group.id && s.optionId === opt.id,
                            )}
                            onCheckedChange={(checked) =>
                              handleToggleMultiple(group, opt, checked as boolean)
                            }
                          />
                          <Label htmlFor={opt.id} className="font-normal cursor-pointer">
                            {opt.name}
                          </Label>
                        </div>
                        {Number(opt.price) > 0 && (
                          <span className="text-sm text-muted-foreground">
                            +{formatCurrency(Number(opt.price))}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
