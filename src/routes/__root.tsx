import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { APP_GROUPS } from "@/lib/menu-config";
import { AppHeader } from "@/components/layout/AppHeader";
import { initializeLocalDb } from "@/lib/sync";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getTrialDaysLeft } from "@/lib/utils";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AiCopilotDrawer } from "@/components/ai/AiCopilotDrawer";
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
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
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
      { title: "Grocer.Pro — Modern Grocery POS" },
      {
        name: "description",
        content:
          "Premium POS and inventory management for grocery, daily goods, and retail chains.",
      },
      { property: "og:title", content: "Grocer.Pro — Modern Grocery POS" },
      {
        property: "og:description",
        content: "Premium POS and inventory management for grocery and retail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Grocer.Pro — Modern Grocery POS" },
      { name: "description", content: "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses." },
      { property: "og:description", content: "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses." },
      { name: "twitter:description", content: "RetailFlow POS is a modern, enterprise-grade point-of-sale system for retail businesses." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23609d97-47b9-4225-80b8-cae2207d9819/id-preview-f3671f40--8e1ae09d-07b5-457e-8d48-a6bfda446e12.lovable.app-1782548664236.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23609d97-47b9-4225-80b8-cae2207d9819/id-preview-f3671f40--8e1ae09d-07b5-457e-8d48-a6bfda446e12.lovable.app-1782548664236.png" },
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
    initializeLocalDb();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, isTrialExpired, isEmailVerified, user, saasPlan, saasOrg, settings, subscriptionStatus } = useAuth();
  const location = useRouterState({ select: (s) => s.location });
  const router = useRouter();

  const publicRoutes = ["/login", "/register", "/verify-email"];
  const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith("/invite");

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
  }, [isLoading, isAuthenticated, isEmailVerified, isTrialExpired, location.pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Hide sidebar and header on public pages
  if (isPublicRoute) {
    return <Outlet />;
  }

  // Route Security Middleware (SaaS Feature Flags)
  const isSuperAdmin = user?.email?.toLowerCase().includes("superadmin");
  const isSuspended = saasOrg?.status === "suspended" && !isSuperAdmin;
  let unauthorizedMessage = null;

  if (isAuthenticated && !isSuperAdmin) {
    if (location.pathname.startsWith("/super-admin")) {
      unauthorizedMessage = "You do not have permission to access the Super Admin dashboard.";
    } else if (saasPlan && Array.isArray(saasPlan.features)) {
      const essentialRoutes = ["/", "/profile", "/settings", "/notifications", "/help"];
      if (!essentialRoutes.includes(location.pathname)) {
        const allItems = APP_GROUPS.flatMap(g => g.items);
        const matchingItems = allItems.filter(item => 
          location.pathname === item.to || location.pathname.startsWith(item.to + "/")
        );
        if (matchingItems.length > 0) {
          const isAllowed = matchingItems.some(item => 
            essentialRoutes.includes(item.to) || saasPlan.features.includes(item.to)
          );
          if (!isAllowed) {
            const blockedItem = matchingItems.sort((a, b) => b.to.length - a.to.length)[0];
            unauthorizedMessage = `The "${blockedItem.label}" feature is not available on your current plan (${saasPlan.name || 'Current Plan'}). Please upgrade your subscription to access this feature.`;
          }
        }
      }
    }
  }

  if (unauthorizedMessage) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:flex">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-muted/20 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  const trialDaysLeft = (subscriptionStatus === "trial" && !isTrialExpired) ? getTrialDaysLeft(expiryDateStr) : 0;

  return (
    <>
      {isAuthenticated && isSuspended && (
        <AlertDialog open={true}>
          <AlertDialogContent className="max-w-md pointer-events-auto border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)] overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent z-[-1]" />
            <AlertDialogHeader className="relative">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-inner">
                <svg className="size-8 text-destructive drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">Account Suspended</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm mt-3 text-foreground/70 leading-relaxed px-2">
                Your account has been suspended by the administrator. Please contact support for more information.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isAuthenticated && isTrialExpired && !isSuspended && location.pathname !== "/settings" && (
        <AlertDialog open={true}>
          <AlertDialogContent className="max-w-md pointer-events-auto border-border/50 bg-background/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(255,0,0,0.15)] overflow-hidden rounded-2xl">
            {/* Background decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent z-[-1]" />
            <div className="absolute -top-24 -right-24 size-48 rounded-full bg-destructive/20 blur-5xl z-[-1]" />

            <AlertDialogHeader className="relative">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-inner">
                <svg className="size-8 text-destructive drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <AlertDialogTitle className="text-center text-2xl font-bold tracking-tight">Trial Expired</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm mt-3 text-foreground/70 leading-relaxed px-2">
                Your free trial has ended. Please upgrade to a premium plan to unlock your store and continue using all our powerful POS features.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-8">
              <Button
                size="lg"
                onClick={() => {
                  if (location.pathname !== "/settings") {
                    router.navigate({ to: "/settings", search: { tab: "billing" } });
                  }
                }}
                className="w-full font-semibold shadow-lg hover:shadow-primary/25 transition-all bg-primary hover:bg-primary/90 text-primary-foreground h-12"
              >
                Unlock My Store
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:flex">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col relative">
          {saasOrg?.status === "trial" && trialDaysLeft > 0 && (
            <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4 z-50">
              <span>Your trial ends in {trialDaysLeft} days.</span>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => router.navigate({ to: "/settings", search: { tab: "billing" } })}>
                Upgrade Now
              </Button>
            </div>
          )}
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-muted/20 relative">
            {isAuthenticated && (isSuspended || (isTrialExpired && location.pathname !== "/settings")) ? (
              <div className="flex h-full w-full items-center justify-center opacity-10 select-none pointer-events-none">
                <svg className="size-32 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
      <AiCopilotDrawer />
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
