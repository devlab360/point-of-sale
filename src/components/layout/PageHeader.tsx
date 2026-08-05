import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-row items-start justify-between gap-3 sm:items-center",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
