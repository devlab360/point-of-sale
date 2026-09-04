import type { ReactNode } from "react";
import { useState } from "react";
import { Download, Filter, Plus, Search, Upload, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  title?: string;
  description?: string;
  primaryAction?: { label: string; onClick?: () => void; icon?: typeof Plus };
  children: ReactNode;
  topContent?: ReactNode;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hideToolbar?: boolean;
  hideHeader?: boolean;
  filtersContent?: ReactNode | ((props: { close: () => void }) => ReactNode);
  onResetFilters?: () => void;
  activeFilterCount?: number;
  onExport?: () => void;
  onImport?: (file: File) => void;
};

export function DataPage({
  title,
  description,
  primaryAction,
  children,
  topContent,
  toolbar,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  hideToolbar = false,
  hideHeader = false,
  filtersContent,
  onResetFilters,
  activeFilterCount,
  onExport,
  onImport,
}: Props) {
  const Icon = primaryAction?.icon ?? Plus;
  const { t } = useLanguage();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const actionsContent = (
    <>
      {onImport && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("data-page-import")?.click()}
          className="gap-1.5 font-bold h-9"
        >
          <Upload className="size-4" /> {t("import", "Import")}
          <input
            type="file"
            id="data-page-import"
            className="hidden"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onImport(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        </Button>
      )}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5 font-bold h-9">
          <Download className="size-4" /> {t("export", "Export")}
        </Button>
      )}
      {primaryAction && (
        <Button size="sm" onClick={primaryAction.onClick} className="gap-1.5 font-bold h-9">
          <Icon className="size-4" /> {primaryAction.label}
        </Button>
      )}
    </>
  );

  return (
    <div className="page-container space-y-6">
      {!hideHeader && title && (
        <PageHeader title={title} description={description} actions={actionsContent} />
      )}

      {topContent}

      {!hideToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-full pl-9 pr-8 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hideHeader && actionsContent}
            {toolbar}
            {Boolean(activeFilterCount && activeFilterCount > 0 && onResetFilters) && (
              <Button variant="outline" size="sm" onClick={onResetFilters} className="h-9 gap-1.5 font-bold">
                <RotateCcw className="size-3.5" /> {t("reset", "Reset")}
              </Button>
            )}
            {filtersContent ? (
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative h-9 gap-1.5 font-bold">
                    <Filter className="size-3.5" /> {t("filters") || "Filters"}
                    {Boolean(activeFilterCount && activeFilterCount > 0) && (
                      <span className="ml-1 size-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground inline-flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0">
                  <SheetHeader className="p-6 border-b border-border/60">
                    <SheetTitle>{t("filters") || "Filters"}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {typeof filtersContent === "function"
                      ? filtersContent({ close: () => setIsFilterOpen(false) })
                      : filtersContent}
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

