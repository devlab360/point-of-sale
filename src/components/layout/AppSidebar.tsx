import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Tag,
  Award,
  Ruler,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  ReceiptText,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Ticket,
  Gift,
  Star,
  Megaphone,
  UserCog,
  Settings,
  Bell,
  Activity,
  CircleUser,
  LifeBuoy,
  Store,
  History,
  PackageMinus,
  Undo2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileText,
  MessageCircle,
  BookOpen,
  Wrench,
  Repeat,
  KeyRound,
  UserCheck,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { APP_GROUPS, hasPermissionForRoute } from "@/lib/menu-config";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarMinimized") === "true";
    }
    return false;
  });

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem("sidebarMinimized", String(newState));
  };

  const { user, logout, saasPlan } = useAuth();
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
  const unreadCount = 0; // Notifications to be implemented via server API
  const initials = (user?.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isMobile = useIsMobile();

  const { effectiveMenus } = useAuth();
  let filteredGroups = APP_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // Core system routes always accessible
      if (item.to === "/" || item.to === "/profile" || item.to === "/help") return true;

      // 1. Employee / Role permission check
      const permResult = hasPermissionForRoute(
        user,
        item.to,
        user?.role === "super_admin",
        saasPlan,
        settings?.businessType,
      );
      if (!permResult.allowed) return false;

      // 2. Allow access if 'all' is granted (super admin)
      if (effectiveMenus.includes("all")) return true;

      // 3. Plan / Tenant active menu checks
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

  const allMenuPaths = filteredGroups.flatMap((g) => g.items.map((i) => i.to));

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    if (pathname === to) return true;
    if (pathname.startsWith(to + "/")) {
      const moreSpecificMatch = allMenuPaths.some(
        (other) =>
          (pathname === other || pathname.startsWith(other + "/")) && other.length > to.length,
      );
      return !moreSpecificMatch;
    }
    return false;
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-sidebar text-sidebar-foreground select-none transition-all duration-300 z-20 border-r border-sidebar-border/80 shadow-xs",
        isMinimized ? "w-[4.75rem]" : "w-64",
      )}
    >
      <button
        onClick={toggleMinimize}
        className={cn(
          "absolute -right-3.5 top-6 z-50 hidden lg:flex size-7 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-card transition-all hover:bg-accent hover:text-foreground hover:scale-110 active:scale-95",
          isMinimized && "rotate-180",
        )}
      >
        <ChevronLeft className="size-4" strokeWidth={2.5} />
      </button>

      <div
        className={cn(
          "flex h-20 shrink-0 items-center gap-3.5 border-b border-sidebar-border/60 bg-sidebar/90 backdrop-blur-xl",
          isMinimized ? "justify-center px-0" : "px-5",
        )}
      >
        <div className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/20 overflow-hidden group">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="size-full object-cover bg-white" />
          ) : (
            <Store
              className="size-5 text-white transition-transform group-hover:scale-110"
              strokeWidth={2.5}
            />
          )}
          <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {!isMinimized && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-extrabold tracking-tight font-display text-foreground flex items-center gap-1.5">
              <span>OneDesk360</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-success"></span>
              </span>
              <span className="truncate">{settings?.storeName || "Main Store"}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-4">
        {filteredGroups.map((group) => {
          const hasActiveChild = group.items.some((i) => isActive(i.to));
          const isClosed =
            collapsed[group.label] !== undefined ? collapsed[group.label] : !hasActiveChild;
          return (
            <div key={group.label} className="group/section space-y-1">
              <button
                onClick={() =>
                  setCollapsed((c) => {
                    const currentState =
                      c[group.label] !== undefined ? c[group.label] : !hasActiveChild;
                    return { ...c, [group.label]: !currentState };
                  })
                }
                title={isMinimized ? t(group.tkey) || group.label : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl py-2 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200",
                  isMinimized ? "px-0 justify-center" : "px-3",
                  hasActiveChild
                    ? "text-primary font-black"
                    : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex items-center min-w-0 flex-1",
                    isMinimized ? "justify-center w-full" : "gap-2",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full transition-all duration-300",
                      hasActiveChild
                        ? "bg-primary scale-125 shadow-[0_0_10px_rgba(79,70,229,0.8)]"
                        : "bg-muted-foreground/30 group-hover/section:bg-muted-foreground/60",
                    )}
                  />
                  {!isMinimized && (
                    <span className="truncate text-left font-display tracking-wider">
                      {t(group.tkey) || group.label}
                    </span>
                  )}
                </span>
                {!isMinimized && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-sidebar-accent/60 font-semibold">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 transition-transform duration-200 text-muted-foreground",
                        isClosed && "-rotate-90",
                      )}
                    />
                  </div>
                )}
              </button>
              {(!isClosed || isMinimized) && (
                <div
                  className={cn(
                    "mt-1 space-y-1 transition-all",
                    isMinimized
                      ? "ml-0 pl-0 border-none"
                      : "ml-3.5 pl-2.5 border-l-2 border-sidebar-border/70",
                  )}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        title={isMinimized ? t(item.tkey) || item.label : undefined}
                        className={cn(
                          "group relative flex items-center rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 overflow-hidden",
                          isMinimized ? "justify-center px-0" : "gap-3 px-3",
                          active
                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-bold shadow-xs border border-primary/20"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                        )}
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-all duration-200",
                            active
                              ? "text-primary scale-110 stroke-[2.5]"
                              : "text-muted-foreground group-hover:text-foreground group-hover:scale-105",
                          )}
                        />
                        {!isMinimized && (
                          <span className="flex-1 text-left truncate min-w-0">
                            {t(item.tkey) || item.label}
                          </span>
                        )}
                        {!isMinimized && item.label === "Notifications" && unreadCount > 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-xs",
                              active
                                ? "bg-primary text-primary-foreground animate-pulse"
                                : "bg-destructive text-destructive-foreground animate-bounce",
                            )}
                          >
                            {unreadCount}
                          </span>
                        ) : !isMinimized && item.badge ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-2xs",
                              active
                                ? "bg-primary text-primary-foreground"
                                : item.badge === "Live"
                                  ? "bg-success/20 text-success ring-1 ring-success/40 animate-pulse"
                                  : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : isMinimized &&
                          ((item.label === "Notifications" && unreadCount > 0) || item.badge) ? (
                          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive animate-pulse" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border/80 bg-sidebar/80 backdrop-blur-md p-3.5",
        )}
      >
        <div
          className={cn(
            "flex items-center rounded-2xl border border-sidebar-border/80 bg-card p-2.5 shadow-soft transition-all duration-200 hover:shadow-card-hover hover:border-primary/30",
            isMinimized ? "flex-col p-2 gap-2" : "gap-3",
          )}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Profile"
              className="size-9 shrink-0 rounded-xl object-cover border border-primary/30 shadow-xs"
            />
          ) : (
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-primary/20 to-indigo-500/10 border border-primary/30 text-xs font-black font-display text-primary shadow-xs">
              {initials}
            </div>
          )}
          {!isMinimized && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-foreground">
                {user?.name || "Admin"}
              </div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-success inline-block"></span>
                <span>{user?.role || "Staff"}</span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              "grid shrink-0 place-items-center rounded-xl border border-transparent text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 active:scale-95",
              isMinimized ? "size-9 w-full" : "size-8",
            )}
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        {!isMinimized && (
          <div className="mt-2.5 text-center text-[10px] font-medium text-muted-foreground/70">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://devlab360.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
            >
              DevLab360
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
