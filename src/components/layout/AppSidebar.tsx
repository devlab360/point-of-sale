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
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { APP_GROUPS, hasPermissionForRoute } from "@/lib/menu-config";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user, logout, saasPlan } = useAuth();
  const { t } = useLanguage();

  const unreadCount = useLiveQuery(() => localDb.notifications.filter(n => !n.read).count()) || 0;
  const settings = useLiveQuery(() => localDb.settings.get("default"));
  const initials = (user?.name || "U").split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const isSuperAdminUser = user?.email?.toLowerCase().includes("superadmin");

  let filteredGroups = APP_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const result = hasPermissionForRoute(user, item.to, !!isSuperAdminUser, saasPlan);
      return result.allowed;
    })
  })).filter(group => group.items.length > 0);

  // If Super Admin, override everything and ONLY show the super admin view
  if (isSuperAdminUser) {
    filteredGroups = [
      {
        label: "SaaS Management", tkey: "saas",
        items: [
          { to: "/super-admin", label: "Dashboard", tkey: "superAdmin", icon: LayoutDashboard, roles: ["admin"] },
          { to: "/super-admin/users", label: "User Management", tkey: "saasUsers", icon: Users, roles: ["admin"] },
          { to: "/super-admin/plans", label: "Plan Configuration", tkey: "saasPlans", icon: CreditCard, roles: ["admin"] }
        ]
      },
      {
        label: "System", tkey: "system",
        items: [
          { to: "/settings", label: "Global Settings", tkey: "settings", icon: Settings, roles: ["admin"] },
          { to: "/profile", label: "Profile", tkey: "profile", icon: CircleUser }
        ]
      }
    ];
  }

  const allMenuPaths = filteredGroups.flatMap(g => g.items.map(i => i.to));

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    if (pathname === to) return true;
    if (pathname.startsWith(to + "/")) {
      const moreSpecificMatch = allMenuPaths.some(
        other => (pathname === other || pathname.startsWith(other + "/")) && other.length > to.length
      );
      return !moreSpecificMatch;
    }
    return false;
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground select-none">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5 bg-sidebar/80 backdrop-blur-md">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 ring-2 ring-primary/20 overflow-hidden">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="size-full object-cover bg-white" />
          ) : (
            <Store className="size-5" strokeWidth={2.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold tracking-tight text-foreground">GROCER.PRO</div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-success inline-block animate-pulse"></span>
            {settings?.storeName || "Main Store"}
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5">
        {filteredGroups.map((group) => {
          const isClosed = collapsed[group.label];
          const hasActiveChild = group.items.some((i) => isActive(i.to));
          return (
            <div key={group.label} className="group/section">
              <button
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200",
                  hasActiveChild
                    ? "text-primary font-black bg-primary/5"
                    : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full transition-colors", hasActiveChild ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "bg-transparent group-hover/section:bg-muted-foreground/40")} />
                  {t(group.tkey) || group.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground/60 px-1.5 py-0.2 rounded bg-sidebar-accent/30">{group.items.length}</span>
                  <ChevronDown
                    className={cn("size-3.5 transition-transform duration-200 text-muted-foreground", isClosed && "-rotate-90")}
                  />
                </div>
              </button>
              {!isClosed && (
                <div className="mt-1.5 ml-3 pl-2.5 border-l-2 border-sidebar-border/70 space-y-1 py-0.5 transition-all">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors duration-150",
                          active
                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-bold shadow-sm before:absolute before:-left-[11px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary before:shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0 transition-colors duration-150",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                          )}
                          strokeWidth={active ? 2.5 : 2}
                        />
                        <span className="flex-1 text-left line-clamp-1">{t(item.tkey) || item.label}</span>
                        {item.label === "Notifications" && unreadCount > 0 ? (
                          <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm", active ? "bg-primary text-primary-foreground animate-pulse" : "bg-destructive text-destructive-foreground animate-bounce")}>
                            {unreadCount}
                          </span>
                        ) : item.badge && (
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
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border/80 p-3 bg-sidebar/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 shadow-soft transition-colors duration-150 hover:bg-sidebar-accent/60 hover:border-sidebar-border hover:shadow-md">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-tr from-primary/25 via-primary/10 to-transparent border border-primary/30 text-xs font-extrabold text-primary shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-foreground">{user?.name || "Admin"}</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-success inline-block"></span>
              {user?.role || "Staff"}
            </div>
          </div>
          <button
            onClick={logout}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-transparent text-muted-foreground hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive transition-colors duration-150"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
