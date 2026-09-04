import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import {
  Keyboard as KeyboardIcon,
  Hash,
  Type,
  X,
  Check,
  Percent,
  Coins,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface VirtualKeyboardProps {
  inputName: string;
  inputValue: string;
  onChange: (input: string) => void;
  onKeyPress?: (button: string) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  isNumeric?: boolean;
  layoutName?: "default" | "shift" | "numpad";
  discountType?: "percentage" | "flat";
  onDiscountTypeChange?: (type: "percentage" | "flat") => void;
  currencySymbol?: string;
}

const NUMERIC_INPUT_NAMES = [
  "discount",
  "cashTendered",
  "splitCash",
  "splitCard",
  "splitUpi",
  "startingCash",
  "price",
  "cost",
  "stock",
  "qty",
  "quantity",
  "amount",
  "phone",
];

const DISCOUNT_PERCENT_PRESETS = ["5", "10", "15", "20", "25", "50"];
const DISCOUNT_FLAT_PRESETS = ["10", "20", "50", "100", "200", "500"];

export function VirtualKeyboard({
  inputName,
  inputValue,
  onChange,
  onKeyPress,
  isOpen,
  onClose,
  className,
  isNumeric,
  layoutName,
  discountType = "percentage",
  onDiscountTypeChange,
  currencySymbol = "₹",
}: VirtualKeyboardProps) {
  const { t } = useLanguage();
  const isDiscountField = inputName.toLowerCase().includes("discount");
  const isAutoNumeric =
    isNumeric !== undefined
      ? isNumeric
      : NUMERIC_INPUT_NAMES.some((n) => inputName.toLowerCase().includes(n.toLowerCase())) ||
        layoutName === "numpad";

  const [layout, setLayout] = useState<"default" | "shift" | "numpad">(
    layoutName || (isAutoNumeric ? "numpad" : "default"),
  );
  const keyboard = useRef<any>(null);

  useEffect(() => {
    if (layoutName) {
      setLayout(layoutName);
    } else {
      setLayout(isAutoNumeric ? "numpad" : "default");
    }
  }, [inputName, isAutoNumeric, layoutName]);

  useEffect(() => {
    if (keyboard.current) {
      keyboard.current.setInput(inputValue);
    }
  }, [inputValue]);

  // Handle escape key to close popup
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayout(layout === "default" ? "shift" : "default");
    }
    if (button === "{enter}") {
      onClose();
    }
    if (button === "{clear}") {
      if (keyboard.current) {
        keyboard.current.setInput("");
      }
      onChange("");
      return;
    }
    if (onKeyPress) {
      onKeyPress(button);
    }
  };

  const handlePresetClick = (presetVal: string) => {
    if (keyboard.current) {
      keyboard.current.setInput(presetVal);
    }
    onChange(presetVal);
  };

  if (!isOpen) return null;

  const isNumpadActive = layout === "numpad";
  const formattedFieldTitle = inputName
    ? inputName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
    : "Keypad";

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Popup Card */}
      <div
        className={cn(
          "w-full bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 select-none",
          isNumpadActive ? "max-w-sm sm:max-w-md" : "max-w-3xl",
          className,
        )}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              {isDiscountField ? (
                <Calculator className="size-4.5" />
              ) : (
                <KeyboardIcon className="size-4.5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground leading-tight">
                {formattedFieldTitle}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isDiscountField
                  ? t("chooseDiscountType", "Select percentage or flat amount")
                  : t("virtualTouchpad", "Touchscreen virtual input")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Pills (Only if not strictly discount numeric) */}
            {!isDiscountField && (
              <div className="flex items-center bg-background border border-border/80 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setLayout("numpad")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md transition-all",
                    isNumpadActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Hash className="size-3" />
                  <span>123</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("default")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md transition-all",
                    !isNumpadActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Type className="size-3" />
                  <span>ABC</span>
                </button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Discount Type Selector (Percentage vs Flat) */}
        {isDiscountField && onDiscountTypeChange && (
          <div className="px-5 pt-3 pb-1">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl border border-border/70">
              <button
                type="button"
                onClick={() => onDiscountTypeChange("percentage")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                  discountType === "percentage"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                <Percent className="size-4" />
                <span>{t("percentageDiscount", "Percentage (%)")}</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscountTypeChange("flat")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                  discountType === "flat"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                <Coins className="size-4" />
                <span>
                  {t("flatDiscount", "Flat Amount")} ({currencySymbol})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Live Typing Display Box */}
        <div className="px-5 py-3">
          <div className="flex items-center justify-between bg-muted/30 dark:bg-muted/10 border-2 border-primary/50 focus-within:border-primary rounded-2xl p-3 shadow-inner">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isDiscountField
                    ? discountType === "percentage"
                      ? "Percentage Discount (%)"
                      : `Flat Discount (${currencySymbol})`
                    : formattedFieldTitle}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-2xl sm:text-3xl font-black text-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                {isDiscountField && discountType === "flat" && (
                  <span className="text-muted-foreground text-xl font-bold mr-0.5">
                    {currencySymbol}
                  </span>
                )}
                {inputValue ? (
                  <span className="tracking-wide text-foreground">{inputValue}</span>
                ) : (
                  <span className="text-muted-foreground/30 font-normal text-xl select-none">
                    0.00
                  </span>
                )}
                {isDiscountField && discountType === "percentage" && (
                  <span className="text-primary font-black text-xl ml-0.5">%</span>
                )}
                <span className="inline-block w-0.5 h-7 bg-primary animate-pulse ml-0.5 rounded" />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {Boolean(inputValue) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (keyboard.current) keyboard.current.setInput("");
                    onChange("");
                  }}
                  className="h-9 px-3 text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl gap-1"
                >
                  <X className="size-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5 shadow-md shadow-primary/20"
              >
                <Check className="size-4" />
                <span>{t("done", "Apply")}</span>
              </Button>
            </div>
          </div>

          {/* Quick Preset Buttons for Discount */}
          {isDiscountField && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[10px] font-bold text-muted-foreground mr-1 uppercase shrink-0">
                {t("presets", "Quick")}:
              </span>
              {(discountType === "percentage"
                ? DISCOUNT_PERCENT_PRESETS
                : DISCOUNT_FLAT_PRESETS
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0",
                    inputValue === preset
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border/80",
                  )}
                >
                  {discountType === "percentage" ? `${preset}%` : `${currencySymbol}${preset}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard Touchpad Body */}
        <div className="px-5 pb-5 pt-1">
          <Keyboard
            keyboardRef={(r) => (keyboard.current = r)}
            layoutName={layout}
            layout={{
              default: [
                "1 2 3 4 5 6 7 8 9 0",
                "q w e r t y u i o p",
                "a s d f g h j k l",
                "{shift} z x c v b n m {bksp}",
                "{space} {enter}",
              ],
              shift: [
                "! @ # $ % ^ & * ( )",
                "Q W E R T Y U I O P",
                "A S D F G H J K L",
                "{shift} Z X C V B N M {bksp}",
                "{space} {enter}",
              ],
              numpad: ["1 2 3", "4 5 6", "7 8 9", ". 0 {bksp}", "{clear} 00 {enter}"],
            }}
            onChange={onChange}
            onKeyPress={handleKeyPress}
            inputName={inputName}
            theme={cn("hg-theme-default customPopupKeyboardTheme", isNumpadActive && "numpadTheme")}
            display={{
              "{bksp}": "⌫ Del",
              "{enter}": "↵ Apply",
              "{shift}": "⇧ Shift",
              "{s}": "⇧",
              "{tab}": "⇥",
              "{lock}": "Caps",
              "{space}": "Space",
              "{clear}": "✕ Clear",
            }}
            buttonTheme={[
              {
                class: "btn-action-primary",
                buttons: "{enter}",
              },
              {
                class: "btn-action-destructive",
                buttons: "{clear} {bksp}",
              },
              {
                class: "btn-numpad-digit",
                buttons: "0 1 2 3 4 5 6 7 8 9 00 .",
              },
            ]}
          />
        </div>

        <style>{`
          .customPopupKeyboardTheme.hg-theme-default {
            background-color: transparent !important;
            padding: 0 !important;
          }
          .customPopupKeyboardTheme .hg-button {
            height: 48px;
            border-radius: 14px;
            font-weight: 700;
            font-family: inherit;
            background: hsl(var(--muted) / 0.5);
            color: hsl(var(--foreground));
            border: 1px solid hsl(var(--border) / 0.8);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            transition: all 0.1s ease;
            font-size: 16px;
          }
          .numpadTheme .hg-button {
            height: 52px;
            font-size: 19px;
            border-radius: 16px;
          }
          .customPopupKeyboardTheme .hg-button:active {
            background: hsl(var(--muted));
            transform: scale(0.96);
            box-shadow: none;
          }
          .customPopupKeyboardTheme .btn-numpad-digit {
            font-weight: 800;
            font-size: 20px;
          }
          .customPopupKeyboardTheme .btn-action-primary {
            background: hsl(var(--primary)) !important;
            color: hsl(var(--primary-foreground)) !important;
            border-color: hsl(var(--primary)) !important;
            font-weight: 800;
          }
          .customPopupKeyboardTheme .btn-action-destructive {
            background: hsl(var(--muted)) !important;
            color: hsl(var(--foreground)) !important;
            border-color: hsl(var(--border)) !important;
            font-weight: 700;
            font-size: 13px;
          }
        `}</style>
      </div>
    </div>
  );
}
