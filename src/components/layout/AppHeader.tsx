import { useEffect, useState } from "react";
import { Bell, Command, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "./AppSidebar";
import { applyTheme, getInitialTheme, type Theme } from "@/lib/theme";
import { notifications } from "@/lib/dummy";
import { cn } from "@/lib/utils";

function pathToCrumbs(pathname: string) {
  if (pathname === "/") return [{ label: "Dashboard", to: "/" }];
  const parts = pathname.split("/").filter(Boolean);
  return [
    { label: "Home", to: "/" },
    ...parts.map((p, i) => ({
      label: p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      to: "/" + parts.slice(0, i + 1).join("/"),
    })),
  ];
}

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathToCrumbs(pathname);
  const unread = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center md:flex">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <li key={c.to} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-foreground">{c.label}</span>
              ) : (
                <Link to={c.to} className="text-muted-foreground hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, orders, customers..."
            className="h-9 w-64 rounded-lg border border-border bg-muted/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 xl:w-80"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline-flex">
            <Command className="size-3" />K
          </kbd>
        </div>

        <Button asChild size="sm" className="hidden sm:flex">
          <Link to="/pos">
            <Plus className="size-4" /> New Sale
          </Link>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <span className="text-xs font-normal text-muted-foreground">{unread} unread</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-1 py-2.5">
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      n.type === "warning" && "bg-warning",
                      n.type === "info" && "bg-info",
                      n.type === "success" && "bg-success",
                    )}
                  />
                  <span className="flex-1 text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                </div>
                <span className="pl-3.5 text-xs text-muted-foreground">{n.body}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="justify-center text-sm font-medium">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-sm font-bold text-primary-foreground">
            SM
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">Sarah Miller</div>
              <div className="text-xs font-normal text-muted-foreground">sarah@grocer.pro</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/help">Help center</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
