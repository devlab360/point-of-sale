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

const accentStyles: Record<
  NonNullable<Props["accent"]>,
  { iconBg: string; iconColor: string; ringHover: string }
> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    ringHover: "group-hover:border-primary/40",
  },
  info: {
    iconBg: "bg-info/10",
    iconColor: "text-info",
    ringHover: "group-hover:border-info/40",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconColor: "text-warning-foreground",
    ringHover: "group-hover:border-warning/40",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    ringHover: "group-hover:border-destructive/40",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    ringHover: "group-hover:border-success/40",
  },
};

export function StatCard({ label, value, delta, hint, icon: Icon, accent = "primary" }: Props) {
  const positive = (delta ?? 0) >= 0;
  const style = accentStyles[accent] || accentStyles.primary;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-card transition-all duration-200 hover:shadow-card-hover card-interactive",
        style.ringHover,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="number mt-1.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105",
              style.iconBg,
              style.iconColor,
            )}
          >
            <Icon className="size-5" strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-2.5 text-xs">
        {typeof delta === "number" ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                positive
                  ? "bg-success/12 text-success"
                  : "bg-destructive/12 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="size-3 stroke-[2.5]" />
              )}
              {Math.abs(delta)}%
            </span>
            {hint && <span className="text-[11px] text-muted-foreground font-medium">{hint}</span>}
          </div>
        ) : hint ? (
          <span className="text-[11px] text-muted-foreground font-medium">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
