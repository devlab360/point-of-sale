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
import { AppHeader } from "@/components/layout/AppHeader";
import { initializeLocalDb } from "@/lib/sync";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, isTrialExpired } = useAuth();
  const location = useRouterState({ select: (s) => s.location });
  const router = useRouter();

  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith("/invite");

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        router.navigate({ to: "/login", replace: true });
      } else if (isAuthenticated && isPublicRoute) {
        router.navigate({ to: "/", replace: true });
      } else if (isAuthenticated && isTrialExpired && location.pathname !== "/settings") {
        router.navigate({ to: "/settings", search: { tab: "billing" }, replace: true });
      }
    }
  }, [isLoading, isAuthenticated, isTrialExpired, location.pathname, router]);

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

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:flex">
          <AppSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-muted/20">
            <Outlet />
          </main>
        </div>
      </div>
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
