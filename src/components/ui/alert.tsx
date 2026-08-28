import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border shadow-soft [&>svg]:text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/8 text-destructive dark:border-destructive/40 dark:bg-destructive/15 [&>svg]:text-destructive",
        success:
          "border-success/30 bg-success/8 text-success dark:border-success/40 dark:bg-success/15 [&>svg]:text-success",
        warning:
          "border-warning/30 bg-warning/8 text-warning dark:border-warning/40 dark:bg-warning/15 [&>svg]:text-warning",
        info: "border-info/30 bg-info/8 text-info dark:border-info/40 dark:bg-info/15 [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold leading-tight tracking-tight text-foreground", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
