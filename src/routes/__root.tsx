import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { APP_GROUPS, hasPermissionForRoute } from "@/lib/menu-config";
import { AppHeader } from "@/components/layout/AppHeader";

import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getTrialDaysLeft } from "@/lib/utils";
import { X } from "lucide-react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { AiCopilotDrawer } from "@/components/ai/AiCopilotDrawer";
import { ReportAutomation } from "@/components/automation/ReportAutomation";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn't find what you were looking for. It may have been moved or removed.
        </p>
        <Button asChild className="mt-6">
          <a href="/">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page didn't load. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NexisPOS — Advanced Universal POS" },
      {
        name: "description",
        content:
          "Premium POS and inventory management for grocery, daily goods, and retail chains.",
      },
      { property: "og:title", content: "NexisPOS — Advanced Universal POS" },
      {
        property: "og:description",
        content: "Premium POS and inventory management for grocery and retail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "NexisPOS — Advanced Universal POS" },
      {
        name: "description",
        content:
          "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses.",
      },
      {
        property: "og:description",
        content:
          "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses.",
      },
      {
        name: "twitter:description",
        content:
          "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23609d97-47b9-4225-80b8-cae2207d9819/id-preview-f3671f40--8e1ae09d-07b5-457e-8d48-a6bfda446e12.lovable.app-1782548664236.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23609d97-47b9-4225-80b8-cae2207d9819/id-preview-f3671f40--8e1ae09d-07b5-457e-8d48-a6bfda446e12.lovable.app-1782548664236.png",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeBootstrap = `(() => {try {const s = localStorage.getItem('theme');const m = window.matchMedia('(prefers-color-scheme: dark)').matches;const t = s === 'light' || s === 'dark' ? s : (m ? 'dark' : 'light');document.documentElement.classList.toggle('dark', t === 'dark');document.documentElement.style.colorScheme = t;} catch(e) {}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Register PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      import("virtual:pwa-register")
        .then(({ registerSW }) => {
          registerSW({ immediate: true });
        })
        .catch((err) => console.error("PWA registration error:", err));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <PreferencesProvider>
            <ReportAutomation />
            <AppLayout />
          </PreferencesProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const {
    isAuthenticated,
    isLoading,
    isTrialExpired,
    isEmailVerified,
    user,
    saasPlan,
    saasOrg,
    settings,
    subscriptionStatus,
    loginWithGoogleToken,
  } = useAuth();
  const [isTrialBannerDismissed, setIsTrialBannerDismissed] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const router = useRouter();

  const publicRoutes = ["/login", "/register", "/verify-email"];
  const isPublicRoute =
    publicRoutes.includes(location.pathname) || location.pathname.startsWith("/invite");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        setIsGoogleLoggingIn(true);
        // Clear the hash from the URL
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        
        loginWithGoogleToken(accessToken).finally(() => {
          setIsGoogleLoggingIn(false);
        });
      }
    }
  }, [loginWithGoogleToken]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.navigate({ to: "/login", replace: true });
      } else if (isAuthenticated && !isEmailVerified && location.pathname !== "/verify-email") {
        router.navigate({ to: "/verify-email", replace: true });
      } else if (isAuthenticated && isPublicRoute && isEmailVerified) {
        router.navigate({ to: "/", replace: true });
      }
    }
  }, [isLoading, isAuthenticated, isEmailVerified, isPublicRoute, location.pathname]);

  if (isLoading || isGoogleLoggingIn) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <aside className="hidden w-64 flex-col border-r border-border bg-card p-4 md:flex space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2 pt-6">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <Skeleton className="h-5 w-40" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    );
  }

  // Hide sidebar and header on public pages
  if (isPublicRoute) {
    return (
      <>
        <Outlet />
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "bg-card text-card-foreground border-border shadow-elevated",
            },
          }}
        />
      </>
    );
  }

  // Route Security Middleware (SaaS Feature Flags)
  const isSuspended = saasOrg?.status === "suspended";
  const canAccessAiCopilot = !saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("ai_copilot");

  const isBillingTabOrTrialWarning =
    location.pathname === "/settings" ||
    location.pathname === "/profile";

  let unauthorizedMessage: string | null = null;

  if (isAuthenticated) {
    const permResult = hasPermissionForRoute(user, location.pathname, false, saasPlan, settings?.businessType);
    if (!permResult.allowed) {
      unauthorizedMessage =
        permResult.reason || "You do not have permission to access this module.";
    }
  }

  if (unauthorizedMessage) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-auto shrink-0 border-r border-sidebar-border lg:flex z-40">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="size-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">{unauthorizedMessage}</p>
              <Button onClick={() => router.navigate({ to: "/" })} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Calculate trial days left
  const expiryDateStr = saasOrg?.planExpiryDate || settings?.trialEndsAt;
  const trialDaysLeft =
    subscriptionStatus === "trial" && !isTrialExpired ? getTrialDaysLeft(expiryDateStr) : 0;

  return (
    <>
      {isAuthenticated && isSuspended && (
        <AlertDialog open={true}>
          <AlertDialogContent className="max-w-md pointer-events-auto border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)] overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent z-[-1]" />
            <AlertDialogHeader className="relative">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-inner">
                <svg
                  className="size-8 text-destructive drop-shadow-sm"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">
                Account Suspended
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm mt-3 text-foreground/70 leading-relaxed px-2">
                Your account has been suspended by the administrator. Please contact support for
                more information.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isAuthenticated &&
        !isSuspended &&
        location.pathname !== "/settings" &&
        (isTrialExpired ||
          (saasOrg?.status === "trial" && trialDaysLeft > 0 && !isTrialBannerDismissed)) && (
          <AlertDialog open={true}>
            <AlertDialogContent className="max-w-md pointer-events-auto border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)] overflow-hidden rounded-2xl">
              {/* Background decorative glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${isTrialExpired ? "from-destructive/10" : "from-primary/10"} to-transparent z-[-1]`}
              />
              <div
                className={`absolute -top-24 -right-24 size-48 rounded-full ${isTrialExpired ? "bg-destructive/20" : "bg-primary/20"} blur-5xl z-[-1]`}
              />

              {/* Cancel Button (Only for Active Trial) */}
              {!isTrialExpired && (
                <button
                  onClick={() => setIsTrialBannerDismissed(true)}
                  className="absolute right-4 top-4 text-foreground/50 hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors z-10"
                >
                  <X className="size-5" />
                </button>
              )}

              <AlertDialogHeader className="relative">
                <div
                  className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border shadow-inner ${isTrialExpired ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"}`}
                >
                  <svg
                    className={`size-8 drop-shadow-sm ${isTrialExpired ? "text-destructive" : "text-primary"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {isTrialExpired ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    )}
                  </svg>
                </div>
                <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">
                  {isTrialExpired ? "Trial Expired" : "Free Trial Active"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-sm mt-3 text-foreground/70 leading-relaxed px-2">
                  {isTrialExpired
                    ? "Your free trial has ended. Please upgrade to a premium plan to unlock your store and continue using all our powerful POS features."
                    : `You have ${trialDaysLeft} days left in your free trial. Upgrade now to avoid any interruption.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center mt-8">
                <Button
                  size="lg"
                  onClick={() => {
                    if (location.pathname !== "/settings") {
                      router.navigate({ to: "/settings", search: { tab: "billing" } });
                    }
                    if (!isTrialExpired) setIsTrialBannerDismissed(true);
                  }}
                  className={`w-full font-semibold shadow-lg transition-all h-12 ${isTrialExpired ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-primary/25" : "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-primary/25"}`}
                >
                  {isTrialExpired ? "Unlock My Store" : "Upgrade Now"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar (hidden on mobile+tablet, shown on lg+) */}
        <aside className="hidden w-auto shrink-0 border-r border-sidebar-border lg:flex transition-all duration-300 z-40">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col relative">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-muted/20 relative bottom-nav-spacer">
            {isAuthenticated &&
              (isSuspended || (isTrialExpired && location.pathname !== "/settings")) ? (
              <div className="flex h-full w-full items-center justify-center opacity-10 select-none pointer-events-none">
                <svg
                  className="size-32 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            ) : (
              <div className="page-enter">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>
      {/* Mobile bottom navigation (hidden on md+) */}
      <BottomNav />
      {canAccessAiCopilot && <AiCopilotDrawer />}
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "bg-card text-card-foreground border-border shadow-elevated",
          },
        }}
      />
    </>
  );
}
