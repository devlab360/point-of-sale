import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 border border-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 border border-destructive/20",
        outline:
          "border border-border bg-card text-foreground hover:bg-accent/60 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary/60 hover:bg-secondary/80",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-primary text-primary-foreground shadow-soft border border-primary/20 hover:bg-primary/90",
      },
      size: {
        default: "h-10 px-4.5 py-2",
        sm: "h-8.5 rounded-md px-3.5 py-1 text-xs",
        lg: "h-11.5 rounded-lg px-6 py-2.5 text-base font-semibold",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  tooltip?: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  disableTooltip?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      title,
      tooltip,
      tooltipSide = "top",
      disableTooltip = false,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const tooltipText = tooltip || title;

    const buttonNode = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-label={ariaLabel || (typeof tooltipText === "string" ? tooltipText : undefined)}
        {...props}
      />
    );

    if (tooltipText && !asChild && !disableTooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonNode;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
