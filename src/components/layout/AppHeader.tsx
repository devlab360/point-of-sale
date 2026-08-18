import { useEffect, useState, useMemo } from "react";
import {
  Bell,
  Command,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  LogOut,
  Wallet,
  Package,
  Users,
  ReceiptText,
  ArrowRight,
  ExternalLink,
  Truck,
  ShoppingBag,
  Receipt,
  Compass,
} from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { hasPermissionForRoute } from "@/lib/menu-config";
import { SyncStatus } from "@/components/SyncStatus";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductsFn } from "@/api/products";
import { getCustomersFn } from "@/api/customers";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { getSalesFn } from "@/api/sales";
import { getExpensesFn } from "@/api/expenses";
import { getNotificationsFn, markNotificationReadFn } from "@/api/notifications";
import { PersistStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { InstallAppButton } from "@/components/InstallAppButton";

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
  const { formatAppDate } = useAppFormatter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const orgId = PersistStore.getOrgId() || "default";

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => (await getProductsFn({ data: {} })).data || [],
  });
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => (await getCustomersFn({ data: {} })).data || [],
  });
  const { data: allOrders = [] } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => (await getSalesFn({ data: {} })).data || [],
  });
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => (await getExpensesFn({ data: {} })).data || [],
  });

  const allSuppliers: any[] = [];
  const allPurchases: any[] = [];

  const APP_MODULES = useMemo(
    () => [
      { title: "POS Terminal", path: "/pos", category: "Billing", icon: "🛒" },
      { title: "Products & Catalog", path: "/products", category: "Catalog", icon: "📦" },
      { title: "Categories", path: "/categories", category: "Catalog", icon: "🏷️" },
      { title: "Brands", path: "/brands", category: "Catalog", icon: "⭐" },
      { title: "Units of Measure", path: "/units", category: "Catalog", icon: "📏" },
      { title: "Inventory Status", path: "/inventory", category: "Stock", icon: "📊" },
      { title: "Stock Adjustments", path: "/inventory/adjustments", category: "Stock", icon: "⚖️" },
      { title: "Stock Transfers", path: "/inventory/transfers", category: "Stock", icon: "🔄" },
      { title: "Customers & Loyalty", path: "/customers", category: "CRM", icon: "👥" },
      { title: "Suppliers & Vendors", path: "/suppliers", category: "CRM", icon: "🚚" },
      { title: "Sales Invoices", path: "/sales", category: "Billing", icon: "🧾" },
      { title: "Sales Returns", path: "/sales/returns", category: "Billing", icon: "↩️" },
      { title: "Quotations & Estimates", path: "/quotations", category: "Billing", icon: "📋" },
      { title: "Delivery Challans", path: "/delivery-challans", category: "Billing", icon: "📦" },
      { title: "Purchase Orders", path: "/purchases", category: "Purchasing", icon: "🛍️" },
      { title: "Purchase Returns", path: "/purchases/returns", category: "Purchasing", icon: "↩️" },
      { title: "Expenses & Accounts", path: "/expenses", category: "Finance", icon: "💸" },
      { title: "Coupons & Discounts", path: "/coupons", category: "Marketing", icon: "🎟️" },
      { title: "Promotions", path: "/promotions", category: "Marketing", icon: "📢" },
      { title: "Gift Cards", path: "/gift-cards", category: "Marketing", icon: "🎁" },
      { title: "Repairs & Services", path: "/repairs", category: "Services", icon: "🔧" },
      { title: "Equipment Rentals", path: "/rentals", category: "Services", icon: "🚜" },
      { title: "Analytics & Reports", path: "/reports", category: "Analytics", icon: "📈" },
      {
        title: "Users & Staff Permissions",
        path: "/users",
        category: "Administration",
        icon: "🛡️",
      },
      { title: "Settings & Store Logo", path: "/settings", category: "Administration", icon: "⚙️" },
      {
        title: "SaaS Admin & Subscription Plans",
        path: "/super-admin/plans",
        category: "SaaS",
        icon: "💳",
      },
    ],
    [],
  );

  const searchProducts = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allProducts
      .filter((p: any) =>
        Boolean(
          (p.name && String(p.name).toLowerCase().includes(q)) ||
          (p.sku && String(p.sku).toLowerCase().includes(q)) ||
          (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
          (p.category && String(p.category).toLowerCase().includes(q)) ||
          (p.brand && String(p.brand).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allProducts, searchQuery]);

  const searchCustomers = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allCustomers
      .filter((c: any) =>
        Boolean(
          (c.name && String(c.name).toLowerCase().includes(q)) ||
          (c.phone && String(c.phone).includes(q)) ||
          (c.email && String(c.email).toLowerCase().includes(q)) ||
          (c.gstin && String(c.gstin).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allCustomers, searchQuery]);

  const searchOrders = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allOrders
      .filter((s: any) =>
        Boolean(
          (s.id && String(s.id).toLowerCase().includes(q)) ||
          (s.customerName && String(s.customerName).toLowerCase().includes(q)) ||
          (s.paymentMethod && String(s.paymentMethod).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allOrders, searchQuery]);

  const searchSuppliers = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allSuppliers
      .filter((s) =>
        Boolean(
          (s.name && String(s.name).toLowerCase().includes(q)) ||
          (s.phone && String(s.phone).includes(q)) ||
          (s.email && String(s.email).toLowerCase().includes(q)) ||
          (s.contact && String(s.contact).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allSuppliers, searchQuery]);

  const searchPurchases = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allPurchases
      .filter((p) =>
        Boolean(
          (p.id && String(p.id).toLowerCase().includes(q)) ||
          (p.invoiceNo && String(p.invoiceNo).toLowerCase().includes(q)) ||
          (p.supplier && String(p.supplier).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allPurchases, searchQuery]);

  const searchExpenses = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return allExpenses
      .filter((e: any) =>
        Boolean(
          (e.category && String(e.category).toLowerCase().includes(q)) ||
          (e.description && String(e.description).toLowerCase().includes(q)),
        ),
      )
      .slice(0, 5);
  }, [allExpenses, searchQuery]);

  const searchModules = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return APP_MODULES.filter(
      (m) => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [APP_MODULES, searchQuery]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathToCrumbs(pathname);
  const queryClient = useQueryClient();
  const { data: rawNotifsData } = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: async () => ((await getNotificationsFn({ data: {} })) as any)?.data || [],
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const notifications: any[] = useMemo(() => {
    const list = (rawNotifsData || []) as any[];
    return list
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp || b.createdAt || 0).getTime() -
          new Date(a.timestamp || a.createdAt || 0).getTime(),
      );
  }, [rawNotifsData]);

  const unread = useMemo(() => notifications.filter((n: any) => !n.read).length, [notifications]);

  const { user, logout, saasPlan } = useAuth();
  const isSuperAdminUser = user?.email?.toLowerCase().includes("superadmin");
  const canAccessPos =
    !isSuperAdminUser &&
    (!saasPlan || !Array.isArray(saasPlan.features) || saasPlan.features.includes("/pos"));
  const { language, setLanguage, t } = useLanguage();
  const activeLanguageObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const activeShift: any = undefined;

  const profile = user || {
    name: "Admin",
    email: "admin@nexispos.com",
  };
  const initials = (profile.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

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

  const handleCloseRegister = async () => {
    if (!activeShift) return;

    // In a real app, this would open a modal to count cash. For now, auto-close.
    const actualCash = window.prompt(
      `Closing Register.\nExpected Cash: $${Number(activeShift.expectedCash || 0).toFixed(2)}\nEnter actual cash in drawer:`,
      activeShift.expectedCash.toString(),
    );

    if (actualCash === null) return;

    const parsedCash = parseFloat(actualCash);
    if (isNaN(parsedCash)) {
      toast.error("Invalid amount");
      return;
    }

    const difference = parsedCash - activeShift.expectedCash;

    toast.success("Register closed. Discrepancy logged. (Stubbed for Phase 4)");
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
        <div
          onClick={() => setSearchOpen(true)}
          className="relative hidden md:block cursor-pointer shrink-1 min-w-0"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <div className="flex items-center h-9 w-48 lg:w-64 xl:w-80 rounded-lg border border-border bg-muted/50 pl-9 pr-2 lg:pr-12 text-sm text-muted-foreground select-none hover:border-ring transition-colors overflow-hidden">
            <span className="truncate">Search app, products, orders...</span>
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
            <Command className="size-3" />K
          </kbd>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSearchOpen(true)}
          title="Global Search"
        >
          <Search className="size-5" />
        </Button>

        <InstallAppButton />
        <SyncStatus />

        {canAccessPos && (
          <Button asChild size="sm" className="hidden sm:flex">
            <Link to="/pos">
              <Plus className="size-4" /> New Sale
            </Link>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs font-semibold gap-1"
              title="Select Language"
            >
              <span>{activeLanguageObj.flag}</span>
              <span className="hidden sm:inline">{activeLanguageObj.code.toUpperCase()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`flex items-center justify-between text-xs cursor-pointer ${language === l.code ? "font-bold text-primary bg-primary/10" : ""}`}
              >
                <span>
                  {l.flag} {l.nativeName} ({l.label})
                </span>
                {language === l.code && <span className="text-primary font-bold">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          <Sun className="size-5 dark:hidden" />
          <Moon className="hidden size-5 dark:block" />
        </Button>

        {hasPermissionForRoute(user, "/notifications", !!user?.email?.toLowerCase().includes("superadmin"), saasPlan).allowed && (
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
                <DropdownMenuItem
                  key={n.id}
                  onClick={async () => {
                    if (!n.read) {
                      await markNotificationReadFn({ data: { id: n.id } });
                      queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    }
                    if (n.link) navigate({ to: n.link as any });
                    else navigate({ to: "/notifications" });
                  }}
                  className="flex-col items-start gap-1 py-2.5 cursor-pointer hover:bg-muted/50"
                >
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        !n.read && "ring-2 ring-primary animate-pulse",
                        n.type === "warning" && "bg-warning",
                        n.type === "info" && "bg-info",
                        n.type === "success" && "bg-success",
                      )}
                    />
                    <span className="flex-1 text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatAppDate(n.timestamp, "time")}
                    </span>
                  </div>
                  <span className="pl-3.5 text-xs text-muted-foreground">{n.description}</span>
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
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-sm font-bold text-primary-foreground overflow-hidden">
            {(profile as any).avatar ? (
              <img src={(profile as any).avatar} alt="Profile" className="size-full object-cover" />
            ) : (
              initials
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{profile.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{profile.email}</div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">{t("profile") || "Profile"}</Link>
            </DropdownMenuItem>
            {user?.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link to="/settings">{t("settings") || "Settings"}</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/help">{t("help") || "Help center"}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {activeShift && (
              <DropdownMenuItem
                onClick={handleCloseRegister}
                className="text-warning flex items-center gap-2 font-medium"
              >
                <Wallet className="size-4" /> {t("closeRegister") || "Close Register"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive flex items-center gap-2 font-medium"
            >
              <LogOut className="size-4" /> {t("logout") || "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden [&>button]:hidden top-[20%] translate-y-0 shadow-2xl border-border/80">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <div className="flex items-center border-b border-border px-4 bg-muted/20">
            <Search className="size-5 text-muted-foreground shrink-0 mr-2.5" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, products, customers, orders, suppliers, expenses..."
              className="flex-1 h-13 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs font-semibold"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 bg-background">
            {!searchQuery.trim() || searchQuery.length < 1 ? (
              <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Command className="size-8 opacity-30 animate-pulse" />
                <span>Type to search across pages, products, customers, orders & finances...</span>
              </div>
            ) : searchModules.length === 0 &&
              searchProducts.length === 0 &&
              searchCustomers.length === 0 &&
              searchOrders.length === 0 &&
              searchSuppliers.length === 0 &&
              searchPurchases.length === 0 &&
              searchExpenses.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No matching results found for "
                <span className="font-semibold text-foreground">{searchQuery}</span>".
              </div>
            ) : (
              <>
                {searchModules.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Compass className="size-3.5 text-primary" /> Navigation Modules & Pages (
                      {searchModules.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {searchModules.map((m) => (
                        <div
                          key={m.path}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: m.path as any });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50 bg-muted/20"
                        >
                          <div className="font-medium flex items-center gap-2.5">
                            <span className="text-base">{m.icon}</span>
                            <div>
                              <div className="font-semibold text-foreground">{m.title}</div>
                              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                {m.category}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchProducts.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Package className="size-3.5 text-primary" /> Products (
                      {searchProducts.length})
                    </div>
                    <div className="space-y-1">
                      {searchProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/products" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                ({p.sku})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-semibold text-primary">
                            {formatCurrency(p.price || 0)}{" "}
                            <ArrowRight className="size-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchCustomers.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Users className="size-3.5 text-info" /> Customers ({searchCustomers.length})
                    </div>
                    <div className="space-y-1">
                      {searchCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/customers" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{c.phone || c.email || "No contact"}</span>{" "}
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchOrders.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <ReceiptText className="size-3.5 text-success" /> Orders / Sales (
                      {searchOrders.length})
                    </div>
                    <div className="space-y-1">
                      {searchOrders.map((o) => (
                        <div
                          key={o.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/sales" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium">Order #{o.id}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <span>
                              {o.customerName || "Walk-in Customer"} · {formatCurrency(o.total || 0)}
                            </span>{" "}
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchSuppliers.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Truck className="size-3.5 text-warning" /> Suppliers & Vendors (
                      {searchSuppliers.length})
                    </div>
                    <div className="space-y-1">
                      {searchSuppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/suppliers" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{s.phone || s.contact || "No contact"}</span>{" "}
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchPurchases.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-destructive" /> Purchase Orders (
                      {searchPurchases.length})
                    </div>
                    <div className="space-y-1">
                      {searchPurchases.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/purchases" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium">Purchase #{p.invoiceNo || p.id}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <span>
                              {p.supplier || "Vendor"} · {formatCurrency(p.total || 0)}
                            </span>{" "}
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {searchExpenses.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-purple-500" /> Expenses & Accounts (
                      {searchExpenses.length})
                    </div>
                    <div className="space-y-1">
                      {searchExpenses.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => {
                            setSearchOpen(false);
                            navigate({ to: "/expenses" });
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors text-sm border border-transparent hover:border-border/50"
                        >
                          <div className="font-medium">{e.category || "Expense"}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <span>
                              {e.description || "No description"} · {formatCurrency(e.amount || 0)}
                            </span>{" "}
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
