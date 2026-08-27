import React, { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react";
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
  onCreate?: (value: string) => Promise<string | void>;
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
  onCreate,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isCreating, setIsCreating] = useState(false);
  const [createdOption, setCreatedOption] = useState<SearchableOption | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () =>
      options.find((opt) => opt.value === value) ||
      (createdOption?.value === value ? createdOption : undefined),
    [options, value, createdOption],
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption?.icon}
            <span className="truncate block">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
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

      <PopoverContent
        align="start"
        sideOffset={4}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)] p-0 shadow-elevated border border-border bg-popover text-popover-foreground z-50 overflow-hidden rounded-xl"
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-3 py-2.5 bg-muted/20 gap-2">
          {isCreating ? (
            <Loader2 className="size-4 shrink-0 text-muted-foreground animate-spin" />
          ) : (
            <Search className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!query.trim() || isCreating) return;

                const exactMatch = options.find(
                  (opt) => opt.label.toLowerCase() === query.trim().toLowerCase(),
                );
                if (exactMatch) {
                  onChange(exactMatch.value);
                  setOpen(false);
                  return;
                }

                if (onCreate) {
                  try {
                    setIsCreating(true);
                    const newValue = await onCreate(query.trim());
                    if (newValue) {
                      setCreatedOption({ value: newValue, label: query.trim() });
                      onChange(newValue);
                      setOpen(false);
                    }
                  } catch (error) {
                    console.error("Failed to create option", error);
                  } finally {
                    setIsCreating(false);
                  }
                }
              }
            }}
            className="h-8 border-none bg-transparent p-0 text-sm focus-visible:ring-0 shadow-none placeholder:text-muted-foreground flex-1"
            autoFocus
            disabled={isCreating}
          />
          {query && !isCreating && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
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
          className="max-h-64 overflow-y-auto p-1.5 text-sm scrollbar-thin space-y-0.5"
        >
          {visibleOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {query && onCreate ? "" : "No matching options found."}
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
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer select-none transition-colors",
                    isSelected
                      ? "bg-primary/10 font-bold text-primary"
                      : "hover:bg-muted/70 text-foreground",
                    option.disabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {option.icon}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm font-semibold">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-muted-foreground truncate mt-0.5">
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
            <div className="py-2 text-center text-xs text-muted-foreground font-mono">
              Loading more options ({visibleCount} of {filteredOptions.length})...
            </div>
          )}

          {query.trim() &&
            onCreate &&
            !options.some((opt) => opt.label.toLowerCase() === query.trim().toLowerCase()) && (
              <div
                className={cn(
                  "px-3 py-2.5 text-sm border-t border-border flex items-center justify-between text-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors mt-1 font-medium rounded-lg",
                  isCreating && "opacity-50 pointer-events-none",
                )}
                onClick={async () => {
                  if (isCreating) return;
                  try {
                    setIsCreating(true);
                    const newValue = await onCreate(query.trim());
                    if (newValue) {
                      setCreatedOption({ value: newValue, label: query.trim() });
                      onChange(newValue);
                      setOpen(false);
                    }
                  } catch (error) {
                    console.error(error);
                  } finally {
                    setIsCreating(false);
                  }
                }}
              >
                <span className="truncate">Add new "{query.trim()}"</span>
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin shrink-0 ml-2" />
                ) : (
                  <kbd className="text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border font-sans shrink-0 ml-2">
                    Enter ↵
                  </kbd>
                )}
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
