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
  { iconBg: string; iconColor: string; ringHover: string; glow: string }
> = {
  primary: {
    iconBg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
    ringHover: "hover:border-primary/40",
    glow: "bg-primary/5",
  },
  info: {
    iconBg: "bg-info/10 border-info/20",
    iconColor: "text-info",
    ringHover: "hover:border-info/40",
    glow: "bg-info/5",
  },
  warning: {
    iconBg: "bg-warning/15 border-warning/30",
    iconColor: "text-warning-foreground",
    ringHover: "hover:border-warning/40",
    glow: "bg-warning/5",
  },
  destructive: {
    iconBg: "bg-destructive/10 border-destructive/20",
    iconColor: "text-destructive",
    ringHover: "hover:border-destructive/40",
    glow: "bg-destructive/5",
  },
  success: {
    iconBg: "bg-success/10 border-success/20",
    iconColor: "text-success",
    ringHover: "hover:border-success/40",
    glow: "bg-success/5",
  },
};

export function StatCard({ label, value, delta, hint, icon: Icon, accent = "primary" }: Props) {
  const positive = (delta ?? 0) >= 0;
  const style = accentStyles[accent] || accentStyles.primary;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover card-interactive",
        style.ringHover,
      )}
    >
      {/* Subtle ambient gradient highlight background */}
      <div
        className={cn(
          "absolute -right-10 -top-10 size-32 rounded-full blur-2xl transition-opacity duration-300 opacity-30 group-hover:opacity-70 pointer-events-none",
          style.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 font-display">
            {label}
          </p>
          <p className="number mt-2 text-2xl font-black tracking-tight text-foreground sm:text-[30px] leading-none">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-xs transition-transform duration-300 group-hover:scale-110",
              style.iconBg,
              style.iconColor,
            )}
          >
            <Icon className="size-5" strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
        {typeof delta === "number" ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-2xs border",
                positive
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-destructive/10 text-destructive border-destructive/20",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3 stroke-[3]" />
              ) : (
                <ArrowDownRight className="size-3 stroke-[3]" />
              )}
              {Math.abs(delta)}%
            </span>
            {hint && (
              <span className="text-[11px] text-muted-foreground font-semibold">{hint}</span>
            )}
          </div>
        ) : hint ? (
          <span className="text-[11px] text-muted-foreground font-semibold">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
