import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gem, Scale, ArrowRight, Sparkles } from "lucide-react";

interface JewelleryCalculatorModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customLine: {
    productId: string;
    customPrice: number;
    customName?: string;
    customMetadata?: Record<string, any>;
  }) => void;
  settings?: any;
}

export function JewelleryCalculatorModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  settings,
}: JewelleryCalculatorModalProps) {
  const { t } = useLanguage();
  const { currencySymbol } = useCurrency();

  const meta = product?.metadata || {};

  const [purityKarat, setPurityKarat] = useState<string>(meta.purityKarat || "22K");
  const [metalType, setMetalType] = useState<string>(meta.metalType || "gold");

  const [grossWeight, setGrossWeight] = useState<number>(Number(meta.grossWeight) || 0);
  const [stoneWeight, setStoneWeight] = useState<number>(Number(meta.stoneWeight) || 0);

  const getInitialRate = (karat: string) => {
    if (karat === "24K") return Number(settings?.liveGoldRate24K) || 7250;
    if (karat === "22K") return Number(settings?.liveGoldRate22K) || 6650;
    if (karat === "18K") return Number(settings?.liveGoldRate18K) || 5450;
    if (karat === "14K") return Number(settings?.liveGoldRate14K) || 4250;
    if (karat === "925") return Number(settings?.liveSilverRate) || 85;
    return Number(meta.goldRatePerGram) || 6650;
  };

  const [ratePerGram, setRatePerGram] = useState<number>(() => getInitialRate(meta.purityKarat || "22K"));

  const [makingChargeType, setMakingChargeType] = useState<"percent" | "per_gram" | "fixed">(
    meta.makingChargeType || "percent",
  );
  const [makingChargeValue, setMakingChargeValue] = useState<number>(
    Number(meta.makingChargeValue) || 12,
  );
  const [stoneCharges, setStoneCharges] = useState<number>(Number(meta.stoneCharges) || 0);
  const [wastagePercent, setWastagePercent] = useState<number>(Number(meta.wastagePercent) || 0);

  const handleKaratChange = (val: string) => {
    setPurityKarat(val);
    if (val === "925") setMetalType("silver");
    else setMetalType("gold");
    setRatePerGram(getInitialRate(val));
  };

  const netWeight = Math.max(0, grossWeight - stoneWeight);
  const metalAmount = netWeight * ratePerGram;

  let makingChargeAmount = 0;
  if (makingChargeType === "percent") {
    makingChargeAmount = (metalAmount * makingChargeValue) / 100;
  } else if (makingChargeType === "per_gram") {
    makingChargeAmount = netWeight * makingChargeValue;
  } else {
    makingChargeAmount = makingChargeValue;
  }

  const wastageAmount = (metalAmount * wastagePercent) / 100;
  const finalTotal = metalAmount + makingChargeAmount + stoneCharges + wastageAmount;

  const handleConfirm = () => {
    if (finalTotal <= 0) return;

    onAddToCart({
      productId: product.id,
      customPrice: Number(finalTotal.toFixed(2)),
      customName: `${product.name} (${purityKarat} ${metalType.toUpperCase()} - ${grossWeight}g)`,
      customMetadata: {
        isJewellery: true,
        purityKarat,
        metalType,
        grossWeight,
        stoneWeight,
        netWeight,
        ratePerGram,
        metalAmount,
        makingChargeType,
        makingChargeValue,
        makingChargeAmount,
        stoneCharges,
        wastagePercent,
        hasWarranty: meta.hasWarranty || false,
        warrantyMonths: meta.warrantyMonths || 12,
      },
    });
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-modal bg-card">
        {/* Header */}
        <div className="p-4 sm:p-5 pr-14 border-b border-border/80 bg-amber-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-700 dark:text-amber-400 shadow-xs shrink-0">
              <Gem className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                {t("jewelleryBullionCalc", "Jewellery Bullion Calculator")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {product.name} • {t("liveRateWeightEstimation", "Live rate & weight estimation")}
              </DialogDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border-amber-500/30 shrink-0"
          >
            {purityKarat} {metalType.toUpperCase()}
          </Badge>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* Karat & Live Spot Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">{t("purityKarat", "Purity / Karat")}</Label>
              <Select value={purityKarat} onValueChange={handleKaratChange}>
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24K">24K (99.9% Pure Gold)</SelectItem>
                  <SelectItem value="22K">22K (91.6% Hallmark Gold)</SelectItem>
                  <SelectItem value="18K">18K (75.0% Gold)</SelectItem>
                  <SelectItem value="14K">14K (58.5% Gold)</SelectItem>
                  <SelectItem value="925">925 Sterling Silver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {t("spotRatePerGram", "Spot Rate / Gram")} ({currencySymbol})
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={ratePerGram}
                onChange={(e) => setRatePerGram(parseFloat(e.target.value) || 0)}
                className="h-10 rounded-xl font-mono font-bold text-sm"
              />
            </div>
          </div>

          {/* Weight Matrix */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Scale className="size-4 text-amber-600 dark:text-amber-400" />
              <span>{t("weightBreakdownGrams", "Weight Breakdown (Grams)")}</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  {t("grossWeight", "Gross Wt (g)")}
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={grossWeight || ""}
                  onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                  placeholder="0.000"
                  className="h-10 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  {t("stoneWeight", "Stone Wt (g)")}
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={stoneWeight || ""}
                  onChange={(e) => setStoneWeight(parseFloat(e.target.value) || 0)}
                  placeholder="0.000"
                  className="h-10 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  {t("netGoldWeight", "Net Gold Wt (g)")}
                </Label>
                <div className="h-10 rounded-xl border bg-card px-3 flex items-center font-mono font-black text-sm text-foreground shadow-xs">
                  {netWeight.toFixed(3)}g
                </div>
              </div>
            </div>
          </div>

          {/* Making Charges & Stone Charges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">{t("makingCharges", "Making Charges")}</Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMakingChargeType("percent")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      makingChargeType === "percent"
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setMakingChargeType("per_gram")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      makingChargeType === "per_gram"
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    /g
                  </button>
                  <button
                    type="button"
                    onClick={() => setMakingChargeType("fixed")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                      makingChargeType === "fixed"
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("fixed", "Fixed")}
                  </button>
                </div>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={makingChargeValue || ""}
                onChange={(e) => setMakingChargeValue(parseFloat(e.target.value) || 0)}
                placeholder={makingChargeType === "percent" ? "10%" : "500"}
                className="h-10 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {t("stoneDiamondCharges", "Stone / Diamond Charges")} ({currencySymbol})
              </Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={stoneCharges || ""}
                onChange={(e) => setStoneCharges(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-10 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Real-time Calculation Summary Card */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>
                {t("pureMetalCost", "Pure Metal Cost")} ({netWeight.toFixed(3)}g × {currencySymbol}
                {ratePerGram}/g):
              </span>
              <span className="font-mono font-bold text-foreground">
                {currencySymbol}
                {metalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                {t("makingCharges", "Making Charges")} (
                {makingChargeType === "percent"
                  ? `${makingChargeValue}%`
                  : makingChargeType === "per_gram"
                    ? `${currencySymbol}${makingChargeValue}/g`
                    : t("fixed", "Fixed")}
                ):
              </span>
              <span className="font-mono font-bold text-foreground">
                {currencySymbol}
                {makingChargeAmount.toFixed(2)}
              </span>
            </div>
            {stoneCharges > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t("stoneCharges", "Stone / Gem Charges")}:</span>
                <span className="font-mono font-bold text-foreground">
                  {currencySymbol}
                  {stoneCharges.toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-amber-500/20 pt-2 mt-2 flex justify-between items-center text-sm">
              <span className="font-black text-foreground">{t("calculatedItemTotal", "Calculated Item Total")}:</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                {currencySymbol}
                {finalTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 rounded-xl text-xs font-semibold px-4"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-10 px-5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-2"
          >
            <span>{t("addJewelleryToCart", "Add Jewellery to Cart")}</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
