import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  errorDetails?: string;
}

export function ErrorState({
  title = "Failed to load data",
  description = "Something went wrong while fetching data from the server. Please check your network connection and try again.",
  onRetry,
  isRetrying = false,
  className,
  errorDetails,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-destructive/20 bg-destructive/5 my-4",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 shadow-sm">
        <AlertTriangle className="size-7" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>

      {errorDetails && (
        <div className="mt-3 max-w-md w-full p-2.5 rounded-lg bg-background/80 border text-xs text-destructive font-mono truncate">
          {errorDetails}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            className="border-destructive/30 hover:bg-destructive/10 text-destructive gap-2 font-medium"
          >
            <RefreshCw className={cn("size-4", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : "Retry Request"}
          </Button>
        )}
        <Button
          onClick={() => window.location.reload()}
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Refresh Page
        </Button>
      </div>
    </div>
  );
}
