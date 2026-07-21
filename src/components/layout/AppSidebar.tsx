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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";


type Item = { to: string; label: string; icon: typeof Package; badge?: string };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pos", label: "POS Terminal", icon: ScanBarcode, badge: "Live" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: Tag },
      { to: "/brands", label: "Brands", icon: Award },
      { to: "/units", label: "Units", icon: Ruler },
    ],
  },
  {
    label: "Stock",
    items: [
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/inventory/adjustments", label: "Adjustments", icon: PackageMinus },
      { to: "/inventory/transfers", label: "Transfers", icon: ArrowLeftRight },
      { to: "/inventory/history", label: "Stock History", icon: History },
    ],
  },
  {
    label: "Trade",
    items: [
      { to: "/purchases", label: "Purchases", icon: ShoppingCart },
      { to: "/purchases/returns", label: "Purchase Returns", icon: Undo2 },
      { to: "/sales", label: "Sales", icon: ReceiptText },
      { to: "/sales/returns", label: "Sales Returns", icon: Undo2 },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
      { to: "/users", label: "Employees", icon: UserCog },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/coupons", label: "Coupons", icon: Ticket },
      { to: "/gift-cards", label: "Gift Cards", icon: Gift },
      { to: "/loyalty", label: "Loyalty", icon: Star },
      { to: "/promotions", label: "Promotions", icon: Megaphone },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/activity", label: "Activity Log", icon: Activity },
      { to: "/profile", label: "Profile", icon: CircleUser },
      { to: "/help", label: "Help Center", icon: LifeBuoy },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  const profile = useLiveQuery(() => localDb.users.get("me")) || {
    name: "Admin",
    role: "Staff",
  };
  const unreadCount = useLiveQuery(() => localDb.notifications.filter(n => !n.read).count()) || 0;
  const settings = useLiveQuery(() => localDb.settings.get("default"));
  const initials = (profile.name || "U").split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();


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
        {groups.map((group) => {
          const isClosed = collapsed[group.label];
          return (
            <div key={group.label} className="mb-3">
              <button
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))
                }
                className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                <span>{group.label}</span>
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
                        <span className="flex-1 truncate">{item.label}</span>
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
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/60">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-sm font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile.role}</div>
          </div>
          <div className="size-2 rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}
