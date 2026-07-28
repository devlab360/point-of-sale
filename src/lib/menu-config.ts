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

export type MenuItem = { to: string; label: string; tkey: string; icon: any; badge?: string; roles?: string[] };
export type MenuGroup = { label: string; tkey: string; items: MenuItem[] };

export const APP_GROUPS: MenuGroup[] = [
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

export const PERMISSION_ROUTE_MAP: Record<string, string[]> = {
  pos: ["/pos"],
  inventory: [
    "/products", "/categories", "/brands", "/units", "/suppliers",
    "/purchases", "/purchases/returns", "/inventory", "/inventory/adjustments",
    "/inventory/transfers", "/inventory/history", "/print-barcodes",
    "/repairs", "/subscriptions", "/rentals",
    "/coupons", "/gift-cards", "/loyalty", "/promotions",
    "/quotations", "/delivery-challans",
  ],
  reports: [
    "/reports", "/customer-ledger", "/supplier-ledger",
    "/accounts", "/vouchers", "/day-book", "/activity",
  ],
  customers: ["/customers", "/portal"],
  expenses: ["/expenses"],
  returns: ["/sales/returns", "/purchases/returns"],
  settings: ["/settings", "/users", "/locations", "/shifts", "/branches"],
};

const DEFAULT_ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  admin: ["pos", "inventory", "reports", "customers", "expenses", "discounts", "returns", "settings"],
  manager: ["pos", "inventory", "reports", "customers", "expenses", "discounts", "returns"],
  cashier: ["pos", "customers", "discounts"],
};

export function hasPermissionForRoute(user: any, routePath: string, isSuperAdminUser: boolean, saasPlan: any): { allowed: boolean; reason?: string } {
  if (isSuperAdminUser) return { allowed: true };
  if (routePath.startsWith("/super-admin")) return { allowed: false, reason: "You do not have permission to access the Super Admin dashboard." };

  // Always allow essential routes
  const essentialRoutes = ["/", "/profile", "/settings", "/notifications", "/help", "/pos", "/sales"];
  if (essentialRoutes.some(r => routePath === r || routePath.startsWith(r + "/"))) return { allowed: true };

  const allItems = APP_GROUPS.flatMap(g => g.items);
  const matchedItem = allItems.find(item => routePath === item.to || routePath.startsWith(item.to + "/"));
  const targetPath = matchedItem ? matchedItem.to : routePath;

  // ── Plan Feature Check ──────────────────────────────────────────────────────
  // saasPlan.features contains feature KEYS (e.g. "inventory", "reports"), NOT route paths
  // Find which feature key this route belongs to
  if (saasPlan && Array.isArray(saasPlan.features) && saasPlan.features.length > 0) {
    const requiredFeatureEntry = Object.entries(PERMISSION_ROUTE_MAP).find(([_, paths]) =>
      paths.some(p => targetPath === p || targetPath.startsWith(p))
    );
    if (requiredFeatureEntry) {
      const [featureKey] = requiredFeatureEntry;
      if (!saasPlan.features.includes(featureKey)) {
        const label = matchedItem ? matchedItem.label : targetPath;
        return {
          allowed: false,
          reason: `The "${label}" feature is not available on your current plan (${saasPlan.name || 'Current Plan'}). Please upgrade your subscription to access this feature.`
        };
      }
    }
  }
  // If saasPlan is null/not loaded yet — allow (don't block during loading)

  // ── Role-based Check ────────────────────────────────────────────────────────
  if (matchedItem && matchedItem.roles && user && user.role) {
    if (!matchedItem.roles.includes(user.role.toLowerCase())) {
      return { allowed: false, reason: `Your role (${user.role}) does not have access to ${matchedItem.label}.` };
    }
  }

  // ── Custom Permission Check (non-admin users) ───────────────────────────────
  if (user && user.role?.toLowerCase() !== "admin") {
    const userPerms: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : (DEFAULT_ROLE_PERMISSIONS_FALLBACK[user.role?.toLowerCase()] || ["pos"]);

    const requiredPermEntry = Object.entries(PERMISSION_ROUTE_MAP).find(([_, paths]) =>
      paths.some(p => targetPath === p || targetPath.startsWith(p))
    );
    if (requiredPermEntry && !userPerms.includes(requiredPermEntry[0])) {
      const label = matchedItem ? matchedItem.label : targetPath;
      return { allowed: false, reason: `You do not have permission to access "${label}" based on your employee permissions assigned by store admin.` };
    }
  }

  return { allowed: true };
}

