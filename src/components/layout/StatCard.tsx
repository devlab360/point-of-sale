import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "info" | "warning" | "destructive" | "success";
};

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

export function StatCard({ label, value, delta, hint, icon: Icon, accent = "primary" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="number mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", accentBg[accent])}>
            <Icon className="size-5" strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
