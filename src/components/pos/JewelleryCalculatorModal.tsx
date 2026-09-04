import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gem,
  Scale,
  Sparkles,
  DollarSign,
  Calculator,
  Percent,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";

interface JewelleryCalculatorModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customLine: {
    productId: string;
    customPrice: number;
    customName?: string;
    customMetadata: Record<string, any>;
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

  // Form states
  const [metalType, setMetalType] = useState<string>("gold");
  const [purityKarat, setPurityKarat] = useState<string>("22K");
  const [ratePerGram, setRatePerGram] = useState<number>(7250);
  const [grossWeight, setGrossWeight] = useState<number>(0);
  const [stoneWeight, setStoneWeight] = useState<number>(0);
  const [stoneCharges, setStoneCharges] = useState<number>(0);
  const [makingChargeType, setMakingChargeType] = useState<"percent" | "per_gram" | "fixed">(
    "percent",
  );
  const [makingChargeValue, setMakingChargeValue] = useState<number>(10);
  const [wastagePercent, setWastagePercent] = useState<number>(0);

  // Sync initial product defaults when modal opens
  useEffect(() => {
    if (product) {
      const m = product.metadata || {};
      setMetalType(m.metalType || "gold");
      setPurityKarat(m.purityKarat || "22K");

      // Default rate from settings or reasonable preset
      const baseRate =
        m.purityKarat === "24K"
          ? 7850
          : m.purityKarat === "22K"
            ? 7250
            : m.purityKarat === "18K"
              ? 5950
              : m.purityKarat === "14K"
                ? 4650
                : m.metalType === "silver" || m.purityKarat === "925"
                  ? 95
                  : 7250;
      setRatePerGram(settings?.goldRate22K ? Number(settings.goldRate22K) : baseRate);

      setGrossWeight(m.grossWeight ? Number(m.grossWeight) : 5.0);
      setStoneWeight(m.stoneWeight ? Number(m.stoneWeight) : 0);
      setStoneCharges(m.stoneCharges ? Number(m.stoneCharges) : 0);
      setMakingChargeType(m.makingChargeType || "percent");
      setMakingChargeValue(m.makingChargeValue ? Number(m.makingChargeValue) : 10);
      setWastagePercent(m.wastagePercent ? Number(m.wastagePercent) : 0);
    }
  }, [product, settings, isOpen]);

  // Adjust rate per gram automatically when Karat changes
  const handleKaratChange = (karat: string) => {
    setPurityKarat(karat);
    if (karat === "24K") setRatePerGram(7850);
    else if (karat === "22K") setRatePerGram(7250);
    else if (karat === "18K") setRatePerGram(5950);
    else if (karat === "14K") setRatePerGram(4650);
    else if (karat === "925") {
      setMetalType("silver");
      setRatePerGram(95);
    }
  };

  // Live calculations
  const netWeight = Math.max(0, grossWeight - stoneWeight);
  const wastageWeight = (netWeight * wastagePercent) / 100;
  const billableWeight = netWeight + wastageWeight;
  const metalAmount = billableWeight * ratePerGram;

  let makingChargeAmount = 0;
  if (makingChargeType === "percent") {
    makingChargeAmount = (metalAmount * makingChargeValue) / 100;
  } else if (makingChargeType === "per_gram") {
    makingChargeAmount = billableWeight * makingChargeValue;
  } else {
    makingChargeAmount = makingChargeValue;
  }

  const finalTotal = metalAmount + makingChargeAmount + stoneCharges;

  if (!product) return null;

  const handleConfirm = () => {
    onAddToCart({
      productId: product.id,
      customPrice: Number(finalTotal.toFixed(2)),
      customName: `${product.name} (${purityKarat}, ${netWeight.toFixed(3)}g)`,
      customMetadata: {
        isJewellery: true,
        metalType,
        purityKarat,
        ratePerGram,
        grossWeight,
        stoneWeight,
        netWeight,
        billableWeight,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
        {/* Tier 1: Header */}
        <div className="p-5 border-b border-border/80 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-700 dark:text-amber-400 shadow-xs">
              <Gem className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {t("jewelleryBullionCalc", "Jewellery Bullion Calculator")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {product.name} • {t("liveRateWeightEstimation", "Live rate & weight estimation")}
              </DialogDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border-amber-500/30"
          >
            {purityKarat} {metalType.toUpperCase()}
          </Badge>
        </div>

        {/* Tier 2: Body (Scrollable) */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Karat & Live Spot Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">{t("purityKarat", "Purity / Karat")}</Label>
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
              <Label className="text-xs font-bold text-foreground">
                {t("spotRatePerGram", "Spot Rate / Gram")} ({currencySymbol})
              </Label>
              <div className="relative">
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
          </div>

          {/* Weight Matrix */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Scale className="size-4 text-amber-600 dark:text-amber-400" />
              <span>{t("weightBreakdownGrams", "Weight Breakdown (Grams)")}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
                <Label className="text-xs font-bold text-foreground">{t("makingCharges", "Making Charges")}</Label>
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
              <Label className="text-xs font-bold text-foreground">
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
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 text-xs">
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

        {/* Tier 3: Sticky Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-xl text-xs font-semibold"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-11 px-6 rounded-xl font-extrabold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-soft gap-2"
          >
            {t("addJewelleryToCart", "Add Jewellery to Cart")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
