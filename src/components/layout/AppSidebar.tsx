import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { APP_GROUPS, hasPermissionForRoute, MenuItem, SubMenuItem } from "@/lib/menu-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPos = pathname === "/pos" || pathname.startsWith("/pos/");

  const [openParents, setOpenParents] = useState<Record<string, boolean>>(() => {
    // Auto-open parent if a child route is active
    const initial: Record<string, boolean> = {};
    APP_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"))) {
          initial[item.label] = true;
        }
      });
    });
    return initial;
  });

  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/pos" || window.location.pathname.startsWith("/pos/")) {
        return true;
      }
      return localStorage.getItem("sidebarMinimized") === "true";
    }
    return false;
  });

  // Automatically collapse sidebar when on POS screen; restore saved preference when leaving POS
  useEffect(() => {
    if (isPos) {
      setIsMinimized(true);
    } else {
      const saved = localStorage.getItem("sidebarMinimized");
      setIsMinimized(saved === "true");
    }
  }, [isPos]);

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    if (!isPos) {
      localStorage.setItem("sidebarMinimized", String(newState));
    }
  };

  const toggleParent = (label: string) => {
    setOpenParents((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const { user, logout, saasPlan } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
  const unreadCount = 0;
  const initials = (settings?.storeName || user?.name || "OD")
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const { effectiveMenus } = useAuth();

  const isRouteAllowed = (to: string, menuKey?: string) => {
    if (to === "/" || to === "/profile" || to === "/help") return true;
    const permResult = hasPermissionForRoute(
      user,
      to,
      user?.role === "super_admin",
      saasPlan,
      settings?.businessType,
    );
    if (!permResult.allowed) return false;
    if (effectiveMenus.includes("all")) return true;
    const cleanRoute = to.replace(/^\//, "");
    if (effectiveMenus.length > 0) {
      return (
        (menuKey && effectiveMenus.includes(menuKey)) ||
        effectiveMenus.includes(to) ||
        effectiveMenus.includes(cleanRoute)
      );
    }
    return true;
  };

  const filteredGroups = APP_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .map((item) => {
        if (item.children) {
          const allowedChildren = item.children.filter((child) =>
            isRouteAllowed(child.to, item.menuKey),
          );
          if (allowedChildren.length === 0) return null;
          return {
            ...item,
            children: allowedChildren,
          };
        }
        if (!isRouteAllowed(item.to, item.menuKey)) return null;
        return item;
      })
      .filter((item): item is MenuItem => item !== null),
  })).filter((group) => group.items.length > 0);

  const isExactActive = (to: string) => pathname === to;
  const isDashboardActive = pathname === "/";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-card text-sidebar-foreground select-none transition-all duration-300 z-20 border-r border-border/80 shadow-xs",
        isMinimized ? "w-[4.75rem]" : "w-64",
      )}
    >
      {/* Minimize Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleMinimize}
            className={cn(
              "absolute -right-3.5 top-6 z-50 hidden lg:flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95",
              isMinimized && "rotate-180",
            )}
            aria-label={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronLeft className="size-4" strokeWidth={2.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-xs">
          {isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
        </TooltipContent>
      </Tooltip>

      {/* Brand Header */}
      {isMinimized ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/"
              onClick={onNavigate}
              className="flex h-20 shrink-0 items-center justify-center border-b border-border/70 bg-card px-0 cursor-pointer hover:bg-muted/30 transition-colors group"
            >
              <div className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 shadow-xs overflow-hidden font-serif font-black text-sm tracking-wider group-hover:scale-105 transition-transform">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="size-full object-cover bg-white" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            {settings?.storeName || "ONEDESK360"}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Link
          to="/"
          onClick={onNavigate}
          className="flex h-20 shrink-0 items-center gap-3 border-b border-border/70 bg-card px-4 cursor-pointer hover:bg-muted/30 transition-colors group"
        >
          <div className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-black text-[#B58D4C] border border-[#B58D4C]/30 shadow-xs overflow-hidden font-serif font-black text-sm tracking-wider group-hover:scale-105 transition-transform">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="size-full object-cover bg-white" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-base font-bold tracking-wide text-foreground group-hover:text-primary transition-colors uppercase">
              <span>{settings?.storeName || "ONEDESK360"}</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B58D4C] mt-0.5">
              <span>ADMIN DASHBOARD</span>
            </div>
          </div>
        </Link>
      )}

      {/* Main Nav Scroll View */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-1">
        {/* Top-Level Prominent Dashboard Button */}
        {isMinimized ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/"
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-center rounded-xl py-3 text-[14.5px] font-bold transition-all duration-150 shadow-xs px-0",
                  isDashboardActive
                    ? "bg-[#B58D4C] text-white shadow-sm"
                    : "bg-muted/30 text-foreground hover:bg-muted/60",
                )}
              >
                <LayoutGrid className={cn("size-5 shrink-0 stroke-[2]", isDashboardActive ? "text-white" : "text-foreground/80")} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              Dashboard
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/"
            onClick={onNavigate}
            className={cn(
              "flex items-center rounded-xl py-3 text-[14.5px] font-bold transition-all duration-150 shadow-xs gap-3 px-3.5",
              isDashboardActive
                ? "bg-[#B58D4C] text-white shadow-sm"
                : "bg-muted/30 text-foreground hover:bg-muted/60",
            )}
          >
            <LayoutGrid className={cn("size-5 shrink-0 stroke-[2]", isDashboardActive ? "text-white" : "text-foreground/80")} />
            <span>Dashboard</span>
          </Link>
        )}

        {/* Category Sections */}
        {filteredGroups.map((group) => {
          return (
            <div key={group.label} className="pt-2.5">
              {/* Section Header */}
              {!isMinimized && (
                <div className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground/80">
                  {t(group.tkey, group.label)}
                </div>
              )}

              {/* Group Items */}
              <div className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isChildActive = hasChildren && item.children?.some((c) => isExactActive(c.to));
                  const isItemActive = isExactActive(item.to);
                  const isOpen = openParents[item.label] ?? isChildActive;

                  if (hasChildren) {
                    if (isMinimized) {
                      return (
                        <Tooltip key={item.label}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => toggleParent(item.label)}
                              className={cn(
                                "flex w-full items-center justify-center rounded-xl py-2.5 text-[14px] font-medium transition-all duration-150 cursor-pointer px-0",
                                isChildActive || isOpen
                                  ? "text-foreground font-semibold bg-muted/40"
                                  : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                              )}
                            >
                              <Icon className={cn("size-5 shrink-0 stroke-[1.6]", isChildActive ? "text-[#B58D4C]" : "text-foreground/75")} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="flex flex-col gap-1 py-2 px-3 shadow-xl">
                            <div className="font-bold text-xs text-background border-b border-background/20 pb-1">
                              {t(item.tkey, item.label)}
                            </div>
                            <div className="flex flex-col gap-0.5 text-[11px] font-normal text-background/90">
                              {item.children?.map((c) => (
                                <span key={c.to} className={cn("truncate", isExactActive(c.to) && "font-bold text-[#B58D4C]")}>
                                  • {t(c.tkey, c.label)}
                                </span>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <div key={item.label} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleParent(item.label)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl py-2.5 text-[14px] font-medium transition-all duration-150 cursor-pointer gap-3 px-3",
                            isChildActive || isOpen
                              ? "text-foreground font-semibold bg-muted/40"
                              : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={cn("size-5 shrink-0 stroke-[1.6]", isChildActive ? "text-[#B58D4C]" : "text-foreground/75")} />
                            <span className="truncate text-left">{t(item.tkey, item.label)}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                              !isOpen && "-rotate-90",
                            )}
                          />
                        </button>

                        {/* Indented Sub-Items with Left Vertical Accent Line */}
                        {isOpen && (
                          <div className="relative ml-5 pl-4 py-1 space-y-1">
                            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#B58D4C]/40 rounded-full" />
                            {item.children?.map((child) => {
                              const active = isExactActive(child.to);
                              return (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  onClick={onNavigate}
                                  className={cn(
                                    "block py-1.5 text-[13.5px] transition-colors rounded-md cursor-pointer",
                                    active
                                      ? "text-[#B58D4C] font-bold"
                                      : "text-muted-foreground hover:text-foreground font-medium",
                                  )}
                                >
                                  {t(child.tkey, child.label)}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Direct Link Item (no children)
                  if (isMinimized) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to}
                            onClick={onNavigate}
                            className={cn(
                              "group flex items-center justify-center rounded-xl py-2.5 text-[14px] font-medium transition-all duration-150 cursor-pointer px-0",
                              isItemActive
                                ? "bg-[#B58D4C] text-white font-semibold shadow-xs"
                                : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                            )}
                          >
                            <Icon className={cn("size-5 shrink-0 stroke-[1.6]", isItemActive ? "text-white" : "text-foreground/75")} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-bold text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>{t(item.tkey, item.label)}</span>
                            {item.badge && (
                              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center justify-between rounded-xl py-2.5 text-[14px] font-medium transition-all duration-150 cursor-pointer gap-3 px-3",
                        isItemActive
                          ? "bg-[#B58D4C] text-white font-semibold shadow-xs"
                          : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={cn("size-5 shrink-0 stroke-[1.6]", isItemActive ? "text-white" : "text-foreground/75")} />
                        <span className="truncate text-left">{t(item.tkey, item.label)}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                            isItemActive
                              ? "bg-white/20 text-white"
                              : item.badge === "Live"
                                ? "bg-success/15 text-success ring-1 ring-success/30"
                                : "bg-destructive/10 text-destructive",
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
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="shrink-0 border-t border-border/80 bg-card p-3">
        <div
          className={cn(
            "flex items-center rounded-xl border border-border/80 bg-background/60 p-2.5 shadow-2xs transition-all duration-150 hover:border-primary/30",
            isMinimized ? "flex-col p-1.5 gap-1.5" : "gap-2.5",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/profile"
                onClick={onNavigate}
                className={cn(
                  "flex items-center min-w-0 flex-1 cursor-pointer transition-opacity hover:opacity-80",
                  isMinimized ? "flex-col gap-1.5" : "gap-2.5",
                )}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="size-8 shrink-0 rounded-lg object-cover border border-primary/30 shadow-xs"
                  />
                ) : (
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#B58D4C]/15 border border-[#B58D4C]/30 text-xs font-bold text-[#B58D4C]">
                    {initials}
                  </div>
                )}
                {!isMinimized && (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs sm:text-sm font-bold text-foreground">
                      {user?.name || "Admin"}
                    </div>
                    <div className="truncate text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span className="size-1.5 rounded-full bg-success inline-block"></span>
                      <span className="capitalize">{user?.role || "Store Owner"}</span>
                    </div>
                  </div>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">View Profile</TooltipContent>
          </Tooltip>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowLogoutConfirm(true)}
            className={cn(
              "shrink-0 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive",
              isMinimized ? "size-8 w-full" : "size-7.5",
            )}
            tooltip="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>

        <LogoutConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          onConfirm={logout}
          userName={user?.name}
          userEmail={user?.email}
        />
      </div>
    </div>
  );
}
