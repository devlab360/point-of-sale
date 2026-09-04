import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ServerCrash, SearchX, Home, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/error")({
  validateSearch: z.object({
    code: z.number().optional().catch(500),
    message: z.string().optional().catch(""),
  }),
  component: ErrorPage,
});

function ErrorPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const code = search.code || 500;

  // Custom message if provided, else defaults
  let title = "Something went wrong";
  let description = "An unexpected error occurred while processing your request.";
  let Icon = ServerCrash;
  let colorClass = "text-primary bg-primary/10";
  let shadowClass = "shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)]";

  if (code === 403 || code === 401) {
    title = "Access Denied";
    description =
      search.message ||
      "You do not have permission to access this resource or perform this action. If you believe this is a mistake, please contact your administrator.";
    Icon = ShieldAlert;
    colorClass = "text-destructive bg-destructive/10";
    shadowClass = "shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)]";
  } else if (code === 404) {
    title = "Not Found";
    description =
      search.message ||
      "The data or page you were looking for could not be found. It may have been moved, deleted, or you might have an incorrect link.";
    Icon = SearchX;
    colorClass = "text-warning bg-warning/10";
    shadowClass = "shadow-[0_0_50px_-12px_rgba(234,179,8,0.15)]";
  } else if (code >= 500) {
    title = "System Glitch";
    description =
      search.message ||
      "Our servers encountered an unexpected glitch while processing your request. We have logged the error and are looking into it.";
    Icon = ServerCrash;
    colorClass = "text-destructive bg-destructive/10";
    shadowClass = "shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)]";
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-3xl pointer-events-none transition-all duration-1000 ${colorClass.split(" ")[1]}`}
      />

      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border border-border/50 bg-background/60 p-8 md:p-12 backdrop-blur-xl text-center ${shadowClass}`}
      >
        {/* Animated Icon */}
        <div className="mx-auto mb-6 relative w-24 h-24">
          <div
            className="absolute inset-0 animate-ping opacity-20 rounded-full bg-current"
            style={{ color: "inherit" }}
          />
          <div
            className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-current/20 shadow-inner ${colorClass}`}
          >
            <Icon className="h-12 w-12 drop-shadow-sm" />
          </div>
        </div>

        {/* Error Details */}
        <div className="inline-flex items-center justify-center rounded-full bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground mb-4">
          Error Code: {code}
        </div>

        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>

        <p className="mb-8 text-base text-muted-foreground leading-relaxed">{description}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto font-semibold rounded-xl h-12 px-6"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("goBack", "Go Back")}
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto font-semibold rounded-xl h-12 px-6 shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => navigate({ to: "/" })}
          >
            <Home className="mr-2 h-4 w-4" /> {t("returnToDashboard", "Return to Dashboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}
