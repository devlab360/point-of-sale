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

import { APP_GROUPS } from "@/lib/menu-config";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user, logout, saasPlan } = useAuth();
  const { t } = useLanguage();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  const unreadCount = useLiveQuery(() => localDb.notifications.filter(n => !n.read).count()) || 0;
  const settings = useLiveQuery(() => localDb.settings.get("default"));
  const initials = (user?.name || "U").split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const isSuperAdminUser = user?.email?.toLowerCase().includes("superadmin");

  let filteredGroups = APP_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // 1. Role Check
      const hasRole = !item.roles || (user && item.roles.includes(user.role.toLowerCase()));
      if (!hasRole) return false;

      // 2. SaaS Subscription Feature Check (for non-superadmins)
      // The plan's features array should contain the allowed route paths (e.g., "/pos", "/products")
      if (!isSuperAdminUser && saasPlan && Array.isArray(saasPlan.features)) {
        // Essential routes that should always be allowed if they exist
        const essentialRoutes = ["/", "/profile", "/settings", "/notifications", "/help"];
        if (!essentialRoutes.includes(item.to) && !saasPlan.features.includes(item.to)) {
          return false;
        }
      }

      // 3. Super Admin Specific Routing Check
      if (item.to === "/super-admin" && !isSuperAdminUser) return false;

      return true;
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

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
          <Store className="size-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight">GROCER.PRO</div>
          <div className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {settings?.storeName || "Main Store"}
          </div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => {
          const isClosed = collapsed[group.label];
          return (
            <div key={group.label} className="mb-3">
              <button
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))
                }
                className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                <span>{t(group.tkey) || group.label}</span>
                <ChevronDown
                  className={cn("size-3 transition-transform", isClosed && "-rotate-90")}
                />
              </button>
              {!isClosed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                          strokeWidth={2}
                        />
                        <span className="flex-1 text-left line-clamp-1">{t(item.tkey) || item.label}</span>
                        {item.label === "Notifications" && unreadCount > 0 ? (
                          <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-primary text-primary-foreground" : "bg-destructive/15 text-destructive")}>
                            {unreadCount}
                          </span>
                        ) : item.badge && (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                              active
                                ? "bg-primary text-primary-foreground"
                                : item.badge === "Live"
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
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="mt-3 flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user?.name || "Admin"}</div>
            <div className="truncate text-xs capitalize text-muted-foreground">{user?.role || "Staff"}</div>
          </div>
          <button
            onClick={logout}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
