import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      offset={16}
      richColors={false}
      closeButton
      expand={false}
      duration={3500}
      gap={8}
      icons={{
        success: <CheckCircle2 className="size-[18px] text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />,
        info: <Info className="size-[18px] text-primary shrink-0" strokeWidth={2} />,
        warning: <AlertTriangle className="size-[18px] text-amber-500 shrink-0" strokeWidth={2} />,
        error: <AlertCircle className="size-[18px] text-rose-500 shrink-0" strokeWidth={2} />,
        loading: <Loader2 className="size-[18px] text-primary animate-spin shrink-0" strokeWidth={2} />,
      }}
      {...props}
    />
  );
};

export { Toaster };
