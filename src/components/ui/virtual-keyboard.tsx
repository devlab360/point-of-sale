import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { X, Keyboard as KeyboardIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VirtualKeyboardProps {
  inputName: string;
  inputValue: string;
  onChange: (input: string) => void;
  onKeyPress?: (button: string) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  layoutName?: "default" | "shift";
}

export function VirtualKeyboard({
  inputName,
  inputValue,
  onChange,
  onKeyPress,
  isOpen,
  onClose,
  className,
}: VirtualKeyboardProps) {
  const [layout, setLayout] = useState("default");
  const keyboard = useRef<any>(null);

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
    if (onKeyPress) {
      onKeyPress(button);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[100] animate-in slide-in-from-bottom-full duration-300",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <KeyboardIcon className="size-4" /> Virtual Keyboard
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 gap-1">
          <ChevronDown className="size-4" /> Close
        </Button>
      </div>
      <div className="p-2 max-w-5xl mx-auto touch-manipulation">
        <Keyboard
          keyboardRef={(r) => (keyboard.current = r)}
          layoutName={layout}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          inputName={inputName}
          theme={"hg-theme-default myTheme"}
          display={{
            "{bksp}": "⌫",
            "{enter}": "↵ Enter",
            "{shift}": "⇧",
            "{s}": "⇧",
            "{tab}": "⇥",
            "{lock}": "Caps Lock",
            "{space}": " ",
          }}
          buttonTheme={[
            {
              class: "hg-highlight",
              buttons: "{enter} {bksp} {shift} {lock}",
            },
          ]}
        />
      </div>
      <style>{`
        .myTheme .hg-button {
          height: 48px;
          border-radius: 8px;
          font-weight: 500;
          font-family: inherit;
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 2px 0 hsl(var(--border));
        }
        .myTheme .hg-button:active {
          background: hsl(var(--muted));
          box-shadow: none;
          transform: translateY(2px);
        }
        .myTheme .hg-highlight {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          border-color: hsl(var(--primary) / 0.2);
          box-shadow: 0 2px 0 hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}
