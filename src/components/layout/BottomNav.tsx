import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, ScanBarcode, Package, ReceiptText, Grid3x3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { APP_GROUPS, hasPermissionForRoute } from "@/lib/menu-config";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";

const NAV_ITEMS = [
  { to: "/", label: "Home", tkey: "dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", tkey: "pos", icon: ScanBarcode },
  { to: "/products", label: "Products", tkey: "products", icon: Package },
  { to: "/sales", label: "Sales", tkey: "salesInvoices", icon: ReceiptText },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, saasPlan, effectiveMenus } = useAuth();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => {
      const res = await getSettingsFn({ data: {} });
      if (res.success) return res.data;
      return null;
    },
  });
  const settings = settingsData || {};

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(to + "/");
  };

  // Check if current page matches any of the 4 main nav items
  const isOnMainNav = NAV_ITEMS.some((item) => isActive(item.to));

  // Filter menu groups for the "More" overlay (same logic as sidebar)
  const filteredGroups = APP_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.to === "/" || item.to === "/profile" || item.to === "/help") return true;
      const permResult = hasPermissionForRoute(
        user,
        item.to,
        user?.role === "super_admin",
        saasPlan,
        settings?.businessType,
      );
      if (!permResult.allowed) return false;
      if (effectiveMenus.includes("all")) return true;
      const cleanRoute = item.to.replace(/^\//, "");
      if (effectiveMenus.length > 0) {
        return (
          (item.menuKey && effectiveMenus.includes(item.menuKey)) ||
          effectiveMenus.includes(item.to) ||
          effectiveMenus.includes(cleanRoute)
        );
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-border bg-card/95 backdrop-blur-xl shadow-bottom-nav md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="navigation"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.filter((item) => {
          if (item.to === "/") return true;
          return hasPermissionForRoute(
            user,
            item.to,
            user?.role === "super_admin",
            saasPlan,
            settings?.businessType,
          ).allowed;
        }).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-semibold transition-colors touch-target",
                active ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl px-4 py-1 transition-all",
                  active && "bg-primary/12",
                )}
              >
                <Icon
                  className={cn("size-5", active && "text-primary")}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span className="leading-none">{t(item.tkey) || item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-semibold transition-colors touch-target",
            moreOpen || !isOnMainNav
              ? "text-primary"
              : "text-muted-foreground active:text-foreground",
          )}
          aria-label="More navigation options"
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-xl px-4 py-1 transition-all",
              (moreOpen || !isOnMainNav) && "bg-primary/12",
            )}
          >
            <Grid3x3
              className={cn("size-5", (moreOpen || !isOnMainNav) && "text-primary")}
              strokeWidth={moreOpen || !isOnMainNav ? 2.5 : 2}
            />
          </div>
          <span className="leading-none">More</span>
          {(moreOpen || !isOnMainNav) && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
          )}
        </button>
      </nav>

      {/* More Menu Overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-base font-bold text-foreground">All Modules</h2>
            <button
              onClick={() => setMoreOpen(false)}
              className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors touch-target"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable Module List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-caption text-muted-foreground mb-2 px-1">
                  {t(group.tkey) || group.label}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all active:scale-95",
                          active
                            ? "border-primary/30 bg-primary/8 text-primary shadow-sm"
                            : "border-border/50 bg-card text-foreground hover:border-border hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-10 place-items-center rounded-xl",
                            active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/60 text-muted-foreground",
                          )}
                        >
                          <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                        </div>
                        <span className="text-[11px] font-medium leading-tight line-clamp-2">
                          {t(item.tkey) || item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5",
                              item.badge === "Live"
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
