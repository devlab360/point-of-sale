import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { Keyboard as KeyboardIcon, ChevronDown, Hash, Type, X, Check, Delete } from "lucide-react";
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
}: VirtualKeyboardProps) {
  const { t } = useLanguage();
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

  if (!isOpen) return null;

  const isNumpadActive = layout === "numpad";
  const formattedFieldTitle = inputName
    ? inputName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
    : "Input Field";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-12px_45px_rgba(0,0,0,0.25)] z-[100] animate-in slide-in-from-bottom-full duration-200 select-none",
        className,
      )}
    >
      {/* Top Header & Mode Toggle Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <KeyboardIcon className="size-4 text-primary" />
            <span>{formattedFieldTitle}</span>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center bg-background border border-border/80 rounded-lg p-0.5 ml-2 shadow-2xs">
            <button
              type="button"
              onClick={() => setLayout("numpad")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                isNumpadActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Hash className="size-3" />
              <span>123 Number Pad</span>
            </button>
            <button
              type="button"
              onClick={() => setLayout("default")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                !isNumpadActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Type className="size-3" />
              <span>{t("abcKeyboard", "ABC Keyboard")}</span>
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 px-2.5 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground gap-1 rounded-lg"
        >
          <ChevronDown className="size-3.5" /> {t("closeEsc", "Close (Esc)")}
        </Button>
      </div>

      {/* Live Typing Display Box (Always visible directly on the keyboard) */}
      <div className="px-4 pt-3 pb-1 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between bg-background/90 border-2 border-primary/40 focus-within:border-primary rounded-2xl px-4 py-2.5 shadow-sm transition-all">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formattedFieldTitle}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xl sm:text-2xl font-black text-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
              {inputValue ? (
                <span className="tracking-wide text-foreground">{inputValue}</span>
              ) : (
                <span className="text-muted-foreground/40 font-normal text-base select-none">
                  {isAutoNumeric ? "0.00" : t("typeHere", "Type here…")}
                </span>
              )}
              <span className="inline-block w-0.5 h-6 bg-primary animate-pulse ml-0.5 rounded" />
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
                title="Clear all"
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
              <span>{t("done", "Done")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard Container */}
      <div
        className={cn(
          "p-3 mx-auto touch-manipulation",
          isNumpadActive ? "max-w-xs sm:max-w-sm" : "max-w-4xl",
        )}
      >
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
          theme={cn("hg-theme-default customKeyboardTheme", isNumpadActive && "numpadGridTheme")}
          display={{
            "{bksp}": "⌫ Del",
            "{enter}": "↵ Done",
            "{shift}": "⇧ Shift",
            "{s}": "⇧",
            "{tab}": "⇥",
            "{lock}": "Caps Lock",
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
        .customKeyboardTheme.hg-theme-default {
          background-color: transparent !important;
          padding: 0 !important;
        }
        .customKeyboardTheme .hg-button {
          height: 48px;
          border-radius: 12px;
          font-weight: 700;
          font-family: inherit;
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border) / 0.8);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
          transition: all 0.1s ease;
          font-size: 15px;
        }
        .numpadGridTheme .hg-button {
          height: 54px;
          font-size: 18px;
          border-radius: 14px;
        }
        .customKeyboardTheme .hg-button:active {
          background: hsl(var(--muted));
          transform: scale(0.96);
          box-shadow: none;
        }
        .customKeyboardTheme .btn-numpad-digit {
          font-weight: 800;
          font-size: 19px;
        }
        .customKeyboardTheme .btn-action-primary {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-color: hsl(var(--primary)) !important;
          font-weight: 800;
        }
        .customKeyboardTheme .btn-action-destructive {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
          font-weight: 700;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
