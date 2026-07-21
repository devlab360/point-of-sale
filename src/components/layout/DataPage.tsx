import type { ReactNode } from "react";
import { Download, Filter, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./PageHeader";

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
}: Props) {
  const Icon = primaryAction?.icon ?? Plus;
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:items-center">
          <div className="relative flex-1">
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
            <Button variant="outline" size="sm">
              <Filter className="size-4" /> Filters
            </Button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
