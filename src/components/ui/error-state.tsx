import { AlertTriangle, RefreshCw, Copy, Check, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  errorDetails?: string | Error | null;
  showHomeButton?: boolean;
  showResetButton?: boolean;
}

export function ErrorState({
  title = "Failed to load data",
  description = "Something went wrong while fetching data from the server. Please check your connection and try again.",
  onRetry,
  isRetrying = false,
  className,
  errorDetails,
  showHomeButton = false,
  showResetButton = false,
}: ErrorStateProps) {
  const [copied, setCopied] = useState(false);

  const errorString =
    typeof errorDetails === "string"
      ? errorDetails
      : errorDetails instanceof Error
        ? `${errorDetails.name}: ${errorDetails.message}`
        : null;

  const handleCopy = () => {
    if (!errorString) return;
    navigator.clipboard.writeText(errorString);
    setCopied(true);
    toast.success("Error message copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem("query-cache");
      toast.info("Cache refreshed. Reloading page...");
      setTimeout(() => window.location.reload(), 500);
    } catch {
      window.location.reload();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 sm:p-10 text-center rounded-2xl border border-destructive/25 bg-destructive/5 shadow-soft my-4",
        className,
      )}
    >
      <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mb-3.5 shadow-sm">
        <AlertTriangle className="size-6 sm:size-7" strokeWidth={2} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
        {description}
      </p>

      {errorString && (
        <div className="mt-3.5 max-w-md w-full p-2.5 rounded-xl bg-background/90 border border-destructive/20 text-left flex items-start justify-between gap-2 shadow-2xs">
          <span className="text-xs text-destructive font-mono truncate">{errorString}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors shrink-0"
            title="Copy error"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {onRetry && (
          <Button onClick={onRetry} disabled={isRetrying} className="gap-2 font-semibold shadow-sm">
            <RefreshCw className={cn("size-4", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : "Retry Request"}
          </Button>
        )}

        {showHomeButton && (
          <Button asChild variant="outline" className="gap-2">
            <a href="/">
              <Home className="size-4" /> Go Home
            </a>
          </Button>
        )}

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="text-xs font-semibold"
        >
          Refresh Page
        </Button>

        {showResetButton && (
          <Button
            onClick={handleClearCache}
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Clear Cache
          </Button>
        )}
      </div>
    </div>
  );
}
