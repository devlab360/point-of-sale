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

  const isSuperAdminUser = user?.email?.toLowerCase().includes("superadmin");

  let filteredGroups = APP_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const result = hasPermissionForRoute(user, item.to, !!isSuperAdminUser, saasPlan);
      return result.allowed;
    }),
  })).filter((group) => group.items.length > 0);

  // If Super Admin, override everything and ONLY show the super admin view
  if (isSuperAdminUser) {
    filteredGroups = [
      {
        label: "SaaS Management",
        tkey: "saas",
        items: [
          {
            to: "/super-admin",
            label: "Dashboard",
            tkey: "superAdmin",
            icon: LayoutDashboard,
            roles: ["admin"],
          },
          {
            to: "/super-admin/users",
            label: "User Management",
            tkey: "saasUsers",
            icon: Users,
            roles: ["admin"],
          },
          {
            to: "/super-admin/plans",
            label: "Plan Configuration",
            tkey: "saasPlans",
            icon: CreditCard,
            roles: ["admin"],
          },
        ],
      },
      {
        label: "System",
        tkey: "system",
        items: [
          {
            to: "/settings",
            label: "Global Settings",
            tkey: "settings",
            icon: Settings,
            roles: ["admin"],
          },
          { to: "/profile", label: "Profile", tkey: "profile", icon: CircleUser },
        ],
      },
    ];
  }

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
        "relative flex h-full flex-col bg-sidebar text-sidebar-foreground select-none transition-all duration-300 z-20",
        isMinimized ? "w-[4.5rem]" : "w-64",
      )}
    >
      <button
        onClick={toggleMinimize}
        className={cn(
          "absolute -right-3 top-5 z-50 flex size-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground hover:scale-110",
          isMinimized && "rotate-180",
        )}
      >
        <ChevronLeft className="size-3.5" strokeWidth={2.5} />
      </button>

      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-md",
          isMinimized ? "justify-center px-0" : "px-5",
        )}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 ring-2 ring-primary/20 overflow-hidden">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="size-full object-cover bg-white" />
          ) : (
            <Store className="size-5" strokeWidth={2.5} />
          )}
        </div>
        {!isMinimized && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold tracking-tight text-foreground">
              GROCER.PRO
            </div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-primary/80 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success inline-block animate-pulse"></span>
              {settings?.storeName || "Main Store"}
            </div>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5">
        {filteredGroups.map((group) => {
          const hasActiveChild = group.items.some((i) => isActive(i.to));
          // If not explicitly toggled in `collapsed` state, we assume it is closed UNLESS it has an active child.
          const isClosed =
            collapsed[group.label] !== undefined ? collapsed[group.label] : !hasActiveChild;
          return (
            <div key={group.label} className="group/section">
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
                  "flex w-full items-center justify-between rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200",
                  isMinimized ? "px-0 justify-center" : "px-3",
                  hasActiveChild
                    ? "text-primary bg-primary/5"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex items-center",
                    isMinimized ? "justify-center w-full" : "gap-1.5",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      hasActiveChild
                        ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                        : "bg-transparent group-hover/section:bg-muted-foreground/40",
                    )}
                  />
                  {!isMinimized && (t(group.tkey) || group.label)}
                </span>
                {!isMinimized && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground/60 px-1.5 py-0.2 rounded bg-sidebar-accent/30">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-200 text-muted-foreground",
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
                      : "ml-4 pl-3 border-l-[1.5px] border-sidebar-border/60",
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
                          "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-200",
                          isMinimized ? "justify-center px-0" : "gap-3 px-3",
                          active
                            ? "bg-primary/15 text-primary font-semibold shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0 transition-colors duration-150",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                          strokeWidth={active ? 2.5 : 2}
                        />
                        {!isMinimized && (
                          <span className="flex-1 text-left line-clamp-1">
                            {t(item.tkey) || item.label}
                          </span>
                        )}
                        {!isMinimized && item.label === "Notifications" && unreadCount > 0 ? (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
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
                              "rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm",
                              active
                                ? "bg-primary text-primary-foreground"
                                : item.badge === "Live"
                                  ? "bg-success/20 text-success ring-1 ring-success/30 animate-pulse"
                                  : "bg-destructive/15 text-destructive",
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : isMinimized &&
                          ((item.label === "Notifications" && unreadCount > 0) || item.badge) ? (
                          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive animate-pulse" />
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
          "shrink-0 border-t border-sidebar-border/80 bg-sidebar/60 backdrop-blur-sm",
          isMinimized ? "p-2" : "p-3",
        )}
      >
        <div
          className={cn(
            "flex items-center rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 shadow-soft transition-colors duration-150 hover:bg-sidebar-accent/60 hover:border-sidebar-border hover:shadow-md",
            isMinimized ? "flex-col p-1.5 gap-2" : "gap-3 p-2.5",
          )}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Profile"
              className="size-9 shrink-0 rounded-lg object-cover border border-primary/30 shadow-sm"
            />
          ) : (
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-tr from-primary/25 via-primary/10 to-transparent border border-primary/30 text-xs font-extrabold text-primary shadow-sm">
              {initials}
            </div>
          )}
          {!isMinimized && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-foreground">
                {user?.name || "Admin"}
              </div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-success inline-block"></span>
                {user?.role || "Staff"}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              "grid shrink-0 place-items-center rounded-lg border border-transparent text-muted-foreground hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive transition-colors duration-150",
              isMinimized ? "size-9 w-full" : "size-8",
            )}
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
