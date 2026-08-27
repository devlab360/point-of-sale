import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary shadow-2xs hover:bg-primary/20",
        secondary:
          "border-secondary/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive shadow-2xs hover:bg-destructive/20",
        outline: "border-border text-foreground bg-background/50",
        success: "border-success/30 bg-success/10 text-success hover:bg-success/20",
        warning: "border-warning/30 bg-warning/15 text-warning-foreground hover:bg-warning/25",
        info: "border-info/30 bg-info/10 text-info hover:bg-info/20",
        glow: "border-primary/40 bg-gradient-to-r from-primary/20 to-indigo-500/20 text-primary font-extrabold shadow-sm shadow-primary/20 animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
