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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type Item = { to: string; label: string; tkey: string; icon: typeof Package; badge?: string; roles?: string[] };
type Group = { label: string; tkey: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview", tkey: "overview",
    items: [
      { to: "/", label: "Dashboard", tkey: "dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
      { to: "/pos", label: "POS Terminal", tkey: "pos", icon: ScanBarcode, badge: "Live" },
    ],
  },
  {
    label: "Catalog", tkey: "catalog",
    items: [
      { to: "/products", label: "Products", tkey: "products", icon: Package, roles: ["admin", "manager"] },
      { to: "/categories", label: "Categories", tkey: "categories", icon: Tag, roles: ["admin", "manager"] },
      { to: "/brands", label: "Brands", tkey: "brands", icon: Award, roles: ["admin", "manager"] },
      { to: "/units", label: "Units", tkey: "units", icon: Ruler, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Stock", tkey: "stock",
    items: [
      { to: "/inventory", label: "Inventory", tkey: "inventory", icon: Boxes, roles: ["admin", "manager"] },
      { to: "/inventory/adjustments", label: "Adjustments", tkey: "adjustments", icon: PackageMinus, roles: ["admin", "manager"] },
      { to: "/inventory/transfers", label: "Transfers", tkey: "transfers", icon: ArrowLeftRight, roles: ["admin", "manager"] },
      { to: "/inventory/history", label: "Stock History", tkey: "stockHistory", icon: History, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Trade & B2B", tkey: "tradeB2B",
    items: [
      { to: "/purchases", label: "Purchases", tkey: "purchases", icon: ShoppingCart, roles: ["admin", "manager"] },
      { to: "/purchases/returns", label: "Purchase Returns", tkey: "purchaseReturns", icon: Undo2, roles: ["admin", "manager"] },
      { to: "/sales", label: "Sales Invoices", tkey: "salesInvoices", icon: ReceiptText },
      { to: "/quotations", label: "Quotations", tkey: "quotations", icon: FileText, roles: ["admin", "manager"] },
      { to: "/delivery-challans", label: "Delivery Challans", tkey: "deliveryChallans", icon: Truck, roles: ["admin", "manager"] },
      { to: "/sales/returns", label: "Sales Returns", tkey: "salesReturns", icon: Undo2 },
    ],
  },
  {
    label: "People", tkey: "people",
    items: [
      { to: "/customers", label: "Customers", tkey: "customers", icon: Users },
      { to: "/suppliers", label: "Suppliers", tkey: "suppliers", icon: Truck, roles: ["admin", "manager"] },
      { to: "/users", label: "Employees", tkey: "employees", icon: UserCog, roles: ["admin"] },
    ],
  },
  {
    label: "Finance & Accounts", tkey: "finance",
    items: [
      { to: "/accounts", label: "Chart of Accounts", tkey: "accounts", icon: BookOpen, roles: ["admin", "manager"] },
      { to: "/expenses", label: "Expenses", tkey: "expenses", icon: Wallet, roles: ["admin", "manager"] },
      { to: "/reports", label: "Financial Reports", tkey: "reports", icon: BarChart3, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Services & Verticals", tkey: "services",
    items: [
      { to: "/repairs", label: "Repair Job Sheets", tkey: "repairs", icon: Wrench, roles: ["admin", "manager"] },
      { to: "/subscriptions", label: "Subscriptions", tkey: "subscriptions", icon: Repeat, roles: ["admin", "manager"] },
      { to: "/rentals", label: "Equipment Rentals", tkey: "rentals", icon: KeyRound, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Marketing", tkey: "marketing",
    items: [
      { to: "/coupons", label: "Coupons", tkey: "coupons", icon: Ticket, roles: ["admin", "manager"] },
      { to: "/gift-cards", label: "Gift Cards", tkey: "giftCards", icon: Gift },
      { to: "/loyalty", label: "Loyalty", tkey: "loyalty", icon: Star, roles: ["admin", "manager"] },
      { to: "/promotions", label: "Promotions", tkey: "promotions", icon: Megaphone, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "System", tkey: "system",
    items: [
      { to: "/super-admin", label: "Super Admin SaaS", tkey: "superAdmin", icon: ShieldAlert, roles: ["admin"] },
      { to: "/portal", label: "Client Portal", tkey: "clientPortal", icon: UserCheck },
      { to: "/settings", label: "Settings", tkey: "settings", icon: Settings, roles: ["admin"] },
      { to: "/notifications", label: "Notifications", tkey: "notifications", icon: Bell },
      { to: "/activity", label: "Activity Log", tkey: "activityLog", icon: Activity, roles: ["admin", "manager"] },
      { to: "/profile", label: "Profile", tkey: "profile", icon: CircleUser },
      { to: "/help", label: "Help Center", tkey: "help", icon: LifeBuoy },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  const unreadCount = useLiveQuery(() => localDb.notifications.filter(n => !n.read).count()) || 0;
  const settings = useLiveQuery(() => localDb.settings.get("default"));
  const initials = (user?.name || "U").split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const isSuperAdminUser = user?.email?.toLowerCase() === "superadmin@grocer.pro" || user?.email?.toLowerCase().includes("superadmin");

  const filteredGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.to === "/super-admin" && !isSuperAdminUser) return false;
      return !item.roles || (user && item.roles.includes(user.role.toLowerCase()));
    })
  })).filter(group => group.items.length > 0);

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
