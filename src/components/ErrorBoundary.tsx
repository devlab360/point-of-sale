import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check, Terminal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onReset?: () => void;
  title?: string;
  description?: string;
  scopeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.scopeName ? `:${this.props.scopeName}` : ""}] Caught error:`,
      error,
      errorInfo,
    );
    this.setState({ errorInfo });
    try {
      reportLovableError(error, {
        boundary: this.props.scopeName || "react_error_boundary",
        componentStack: errorInfo?.componentStack || undefined,
      });
    } catch {
      // Ignore reporting error
    }
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleCopyStack = () => {
    const errorText = `Error: ${this.state.error?.message || "Unknown error"}\n\nStack:\n${this.state.error?.stack || ""}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    toast.success("Error diagnostics copied to clipboard");
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public handleClearStorageAndReload = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem("query-cache");
      toast.info("Session storage cleared. Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error || new Error("Unknown error"),
          reset: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 sm:p-10 my-4 text-center rounded-2xl border border-destructive/25 bg-destructive/5 shadow-soft">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mb-4 shadow-sm">
            <AlertTriangle className="size-7" strokeWidth={2} />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {this.props.title || "An unexpected error occurred"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
            {this.props.description ||
              this.state.error?.message ||
              "A component in this view failed to render. You can try reloading or clearing temporary cache."}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <Button onClick={this.handleReset} className="gap-2 font-semibold shadow-sm">
              <RefreshCw className="size-4" /> {t("tryAgain", "Try Again")}
            </Button>

            <Button variant="outline" asChild className="gap-2">
              <a href="/">
                <Home className="size-4" /> {t("goToDashboard", "Go to Dashboard")}
              </a>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Terminal className="size-3.5" />
              {this.state.showDetails ? "Hide Diagnostics" : "Show Diagnostics"}
            </Button>
          </div>

          {this.state.showDetails && (
            <div className="mt-5 w-full max-w-2xl text-left bg-card/90 border border-border/80 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="font-mono text-xs font-bold text-destructive truncate">
                  {this.state.error?.name}: {this.state.error?.message}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleCopyStack}
                  className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  {this.state.copied ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  {this.state.copied ? "Copied" : "Copy Diagnostics"}
                </Button>
              </div>

              {this.state.error?.stack && (
                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-40 p-2 rounded bg-muted/40 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {t("ifThisErrorPersistsResettingLocalCacheMa", "If this error persists, resetting local cache may resolve corrupt offline data.")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleClearStorageAndReload}
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <RotateCcw className="size-3 mr-1" /> {t("resetCacheReload", "Reset Cache & Reload")}
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
