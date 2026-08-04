import React, { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  batchSize?: number;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  clearable = true,
  batchSize = 20,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, visibleCount),
    [filteredOptions, visibleCount],
  );

  // Reset batch count when search query changes or popover opens
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [query, open, batchSize]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (visibleCount < filteredOptions.length) {
        setVisibleCount((prev) => Math.min(prev + batchSize, filteredOptions.length));
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal text-left h-10 px-3 border border-input bg-background hover:bg-muted/40 transition-colors",
            !selectedOption && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0 opacity-70">
            {clearable && selectedOption && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded-full p-0.5 hover:bg-muted text-muted-foreground"
                title="Clear selection"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-elevated border border-border bg-popover text-popover-foreground z-50">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-3 py-2 bg-muted/20">
          <Search className="size-4 shrink-0 text-muted-foreground mr-2" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 border-none bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Options List with Infinite Scroll */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="max-h-60 overflow-y-auto p-1 text-sm scrollbar-thin"
        >
          {visibleOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching options found.
            </div>
          ) : (
            visibleOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2.5 py-2 text-xs cursor-pointer select-none transition-colors",
                    isSelected
                      ? "bg-primary/10 font-semibold text-primary"
                      : "hover:bg-muted/60 text-foreground",
                    option.disabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <div className="flex flex-col truncate">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                </div>
              );
            })
          )}

          {visibleCount < filteredOptions.length && (
            <div className="py-2 text-center text-[10px] text-muted-foreground font-mono">
              Loading more options ({visibleCount} of {filteredOptions.length})...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
