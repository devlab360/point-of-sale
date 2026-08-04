import type { ReactNode } from "react";
import { useState } from "react";
import { Download, Filter, Plus, Search, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick?: () => void; icon?: typeof Plus };
  children: ReactNode;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hideToolbar?: boolean;
  filtersContent?: ReactNode | ((props: { close: () => void }) => ReactNode);
  onResetFilters?: () => void;
  activeFilterCount?: number;
};

export function DataPage({
  title,
  description,
  primaryAction,
  children,
  toolbar,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  hideToolbar = false,
  filtersContent,
  onResetFilters,
  activeFilterCount,
}: Props) {
  const Icon = primaryAction?.icon ?? Plus;
  const { t } = useLanguage();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Upload className="size-4" /> Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Export
            </Button>
            {primaryAction && (
              <Button size="sm" onClick={primaryAction.onClick}>
                <Icon className="size-4" /> {primaryAction.label}
              </Button>
            )}
          </>
        }
      />

      {!hideToolbar && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-1/2 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {activeFilterCount && activeFilterCount > 0 && onResetFilters ? (
              <Button variant="outline" size="sm" onClick={onResetFilters} className="mr-1">
                <RotateCcw className="size-4" /> Reset
              </Button>
            ) : null}
            {filtersContent ? (
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Filter className="size-4" /> {t("filters") || "Filters"}
                    {activeFilterCount ? (
                      <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col h-full">
                  <SheetHeader>
                    <SheetTitle>{t("filters") || "Filters"}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex-1 flex flex-col min-h-0">
                    {typeof filtersContent === "function"
                      ? filtersContent({ close: () => setIsFilterOpen(false) })
                      : filtersContent}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Filter className="size-4" /> {t("filters") || "Filters"}
              </Button>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
