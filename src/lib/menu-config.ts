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
  Utensils,
  ChefHat,
  CalendarDays,
} from "lucide-react";
import { BusinessCapability, hasCapability } from "./business-templates";

export type MenuItem = {
  to: string;
  label: string;
  tkey: string;
  icon: any;
  badge?: string;
  roles?: string[];
};
export type MenuGroup = { label: string; tkey: string; items: MenuItem[] };

export const APP_GROUPS: MenuGroup[] = [
  {
    label: "Overview",
    tkey: "overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        tkey: "dashboard",
        icon: LayoutDashboard,
      },
      { to: "/pos", label: "POS Terminal", tkey: "pos", icon: ScanBarcode, badge: "Live" },
    ],
  },
  {
    label: "Catalog",
    tkey: "catalog",
    items: [
      {
        to: "/products",
        label: "Products",
        tkey: "products",
        icon: Package,
        roles: ["admin", "manager"],
      },
      {
        to: "/services",
        label: "Services",
        tkey: "services",
        icon: Wrench,
        roles: ["admin", "manager"],
      },
      {
        to: "/categories",
        label: "Categories",
        tkey: "categories",
        icon: Tag,
        roles: ["admin", "manager"],
      },
      { to: "/brands", label: "Brands", tkey: "brands", icon: Award, roles: ["admin", "manager"] },
      { to: "/units", label: "Units", tkey: "units", icon: Ruler, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Stock",
    tkey: "stock",
    items: [
      {
        to: "/inventory",
        label: "Inventory",
        tkey: "inventory",
        icon: Boxes,
        roles: ["admin", "manager"],
      },
      {
        to: "/inventory/adjustments",
        label: "Adjustments",
        tkey: "adjustments",
        icon: PackageMinus,
        roles: ["admin", "manager"],
      },
      {
        to: "/inventory/transfers",
        label: "Transfers",
        tkey: "transfers",
        icon: ArrowLeftRight,
        roles: ["admin", "manager"],
      },
      {
        to: "/inventory/history",
        label: "Stock History",
        tkey: "stockHistory",
        icon: History,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "Trade & B2B",
    tkey: "tradeB2B",
    items: [
      {
        to: "/purchases",
        label: "Purchases",
        tkey: "purchases",
        icon: ShoppingCart,
        roles: ["admin", "manager"],
      },
      {
        to: "/purchases/returns",
        label: "Purchase Returns",
        tkey: "purchaseReturns",
        icon: Undo2,
        roles: ["admin", "manager"],
      },
      { to: "/sales", label: "Sales Invoices", tkey: "salesInvoices", icon: ReceiptText },
      {
        to: "/quotations",
        label: "Quotations",
        tkey: "quotations",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        to: "/delivery-challans",
        label: "Delivery Challans",
        tkey: "deliveryChallans",
        icon: Truck,
        roles: ["admin", "manager"],
      },
      { to: "/sales/returns", label: "Sales Returns", tkey: "salesReturns", icon: Undo2 },
    ],
  },
  {
    label: "People",
    tkey: "people",
    items: [
      { to: "/customers", label: "Customers", tkey: "customers", icon: Users },
      {
        to: "/suppliers",
        label: "Suppliers",
        tkey: "suppliers",
        icon: Truck,
        roles: ["admin", "manager"],
      },
      { to: "/users", label: "Employees", tkey: "employees", icon: UserCog, roles: ["admin"] },
    ],
  },
  {
    label: "Finance & Accounts",
    tkey: "finance",
    items: [
      {
        to: "/accounts",
        label: "Chart of Accounts",
        tkey: "accounts",
        icon: BookOpen,
        roles: ["admin", "manager"],
      },
      {
        to: "/accounting-reports",
        label: "Accounting Reports",
        tkey: "accounting_reports",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        to: "/expenses",
        label: "Expenses",
        tkey: "expenses",
        icon: Wallet,
        roles: ["admin", "manager"],
      },
      {
        to: "/reports",
        label: "Financial Reports",
        tkey: "reports",
        icon: BarChart3,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "Services & Verticals",
    tkey: "services",
    items: [
      {
        to: "/repairs",
        label: "Repair Job Sheets",
        tkey: "repairs",
        icon: Wrench,
        roles: ["admin", "manager"],
      },
      {
        to: "/subscriptions",
        label: "Subscriptions",
        tkey: "subscriptions",
        icon: Repeat,
        roles: ["admin", "manager"],
      },
      {
        to: "/rentals",
        label: "Equipment Rentals",
        tkey: "rentals",
        icon: KeyRound,
        roles: ["admin", "manager"],
      },
      {
        to: "/tables",
        label: "Tables",
        tkey: "tables",
        icon: Utensils,
        roles: ["admin", "manager", "cashier"],
      },
      {
        to: "/kitchen",
        label: "Kitchen (KOT)",
        tkey: "kitchen",
        icon: ChefHat,
        roles: ["admin", "manager", "cashier"],
      },
      {
        to: "/appointments",
        label: "Appointments",
        tkey: "appointments",
        icon: CalendarDays,
        roles: ["admin", "manager", "cashier"],
      },
    ],
  },
  {
    label: "Marketing",
    tkey: "marketing",
    items: [
      {
        to: "/coupons",
        label: "Coupons",
        tkey: "coupons",
        icon: Ticket,
        roles: ["admin", "manager"],
      },
      { to: "/gift-cards", label: "Gift Cards", tkey: "giftCards", icon: Gift },
      {
        to: "/loyalty",
        label: "Loyalty",
        tkey: "loyalty",
        icon: Star,
        roles: ["admin", "manager"],
      },
      {
        to: "/promotions",
        label: "Promotions",
        tkey: "promotions",
        icon: Megaphone,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "System",
    tkey: "system",
    items: [
      { to: "/portal", label: "Client Portal", tkey: "clientPortal", icon: UserCheck },
      { to: "/settings", label: "Settings", tkey: "settings", icon: Settings, roles: ["admin"] },
      { to: "/notifications", label: "Notifications", tkey: "notifications", icon: Bell },
      {
        to: "/activity",
        label: "Activity Log",
        tkey: "activityLog",
        icon: Activity,
        roles: ["admin", "manager"],
      },
      { to: "/profile", label: "Profile", tkey: "profile", icon: CircleUser },
      { to: "/help", label: "Help Center", tkey: "help", icon: LifeBuoy },
    ],
  },
];

export const PERMISSION_ROUTE_MAP: Record<string, string[]> = {
  pos: ["/pos"],
  inventory: [
    "/products",
    "/services",
    "/categories",
    "/brands",
    "/units",
    "/suppliers",
    "/purchases",
    "/purchases/returns",
    "/inventory",
    "/inventory/adjustments",
    "/inventory/transfers",
    "/inventory/history",
    "/print-barcodes",
    "/repairs",
    "/subscriptions",
    "/rentals",
    "/coupons",
    "/gift-cards",
    "/loyalty",
    "/promotions",
    "/quotations",
    "/delivery-challans",
  ],
  tables: ["/tables"],
  kitchen: ["/kitchen"],
  appointments: ["/appointments"],
  reports: [
    "/reports",
    "/customer-ledger",
    "/supplier-ledger",
    "/accounts",
    "/vouchers",
    "/day-book",
    "/activity",
  ],
  customers: ["/customers", "/portal"],
  expenses: ["/expenses"],
  returns: ["/sales/returns", "/purchases/returns"],
  settings: ["/settings", "/users", "/locations", "/shifts", "/branches"],
  notifications: ["/notifications"],
};

const DEFAULT_ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  admin: [
    "pos",
    "inventory",
    "reports",
    "customers",
    "expenses",
    "discounts",
    "returns",
    "settings",
    "notifications",
    "tables",
    "kitchen",
    "appointments",
  ],
  manager: ["pos", "inventory", "reports", "customers", "expenses", "discounts", "returns", "notifications", "tables", "kitchen", "appointments"],
  cashier: ["pos", "customers", "discounts", "tables", "kitchen", "appointments"],
};

export const ROUTE_CAPABILITY_MAP: Record<string, BusinessCapability[]> = {
  "/pos": ["POS"],
  "/products": ["PRODUCTS"],
  "/services": ["SERVICES"],
  "/categories": ["PRODUCTS", "SERVICES"], // Often shared
  "/brands": ["PRODUCTS"],
  "/units": ["PRODUCTS"],
  "/inventory": ["INVENTORY"],
  "/inventory/adjustments": ["INVENTORY"],
  "/inventory/transfers": ["INVENTORY"],
  "/inventory/history": ["INVENTORY"],
  "/purchases": ["PURCHASES"],
  "/purchases/returns": ["PURCHASES"],
  "/sales": ["POS"], // Technically invoicing
  "/quotations": ["QUOTATIONS"],
  "/delivery-challans": ["DELIVERY_CHALLANS"],
  "/sales/returns": ["POS"],
  "/customers": ["CUSTOMERS"],
  "/suppliers": ["SUPPLIERS"],
  "/users": ["STAFF", "SETTINGS"], // Using SETTINGS as fallback for employees management if STAFF isn't there
  "/accounts": ["ACCOUNTS"],
  "/expenses": ["EXPENSES"],
  "/reports": ["REPORTS"],
  "/repairs": ["REPAIRS", "JOB_CARDS", "REPAIR_STATUS"],
  "/subscriptions": ["SUBSCRIPTIONS"],
  "/rentals": ["RENTALS"],
  "/coupons": ["COUPONS"],
  "/gift-cards": ["GIFT_CARDS"],
  "/loyalty": ["LOYALTY"],
  "/promotions": ["PROMOTIONS"],
  "/settings": ["SETTINGS"],
  "/notifications": [],
  "/activity": ["REPORTS", "SETTINGS"],
  "/profile": [],
  "/help": [],
  "/portal": ["CUSTOMERS"],
  "/tables": ["TABLES"],
  "/kitchen": ["KITCHEN"],
  "/appointments": ["APPOINTMENTS"],
};

export function hasPermissionForRoute(
  user: any,
  routePath: string,
  isSuperAdminUser: boolean,
  saasPlan: any,
  businessType?: string
): { allowed: boolean; reason?: string } {
  // 1. Super Admin Authorization
  if (isSuperAdminUser) return { allowed: true };
  if (routePath.startsWith("/super-admin")) {
    return {
      allowed: false,
      reason: "You do not have permission to access the Super Admin dashboard.",
    };
  }

  // 2. Core System Routes (Always Available)
  if (routePath === "/" || routePath === "/profile" || routePath.startsWith("/profile/")) {
    return { allowed: true };
  }

  // 3. Resolve Target Path
  const allItems = APP_GROUPS.flatMap((g) => g.items);

  // First try to find an exact match for the route
  let matchedItem = allItems.find((item) => routePath === item.to);

  // If no exact match (e.g., dynamic routes like /products/123/edit), find the most specific parent
  if (!matchedItem) {
    const parentMatches = allItems.filter((item) => routePath.startsWith(item.to + "/"));
    if (parentMatches.length > 0) {
      parentMatches.sort((a, b) => b.to.length - a.to.length);
      matchedItem = parentMatches[0];
    }
  }

  const targetPath = matchedItem ? matchedItem.to : routePath;
  const label = matchedItem ? matchedItem.label : targetPath;

  // 3.5. Business Type Capability Check (Phase 1)
  const routeCapabilities = ROUTE_CAPABILITY_MAP[targetPath] || [];
  if (routeCapabilities.length > 0) {
    // If a route requires capabilities, the business type MUST have at least one of them
    // (e.g. repairs route needs REPAIRS or JOB_CARDS capability)
    const hasAnyRequiredCapability = routeCapabilities.some(cap => hasCapability(businessType, cap));
    if (!hasAnyRequiredCapability) {
      return {
        allowed: false,
        reason: `The "${label}" module is not applicable to your business type.`,
      };
    }
  }

  // 4. SaaS Plan Authorization
  if (saasPlan && Array.isArray(saasPlan.features) && saasPlan.features.length > 0) {
    const requiredFeatureEntry = Object.entries(PERMISSION_ROUTE_MAP).find(([_, paths]) =>
      paths.some((p) => targetPath === p || targetPath.startsWith(p + "/")),
    );
    const legacyFeatureKey = requiredFeatureEntry ? requiredFeatureEntry[0] : null;

    const isAppGroupItem = !!matchedItem;
    const planAllowsRoute = saasPlan.features.some((feat: string) => {
      // If it's a distinct sidebar item, it requires an exact match in the features array
      if (isAppGroupItem) return targetPath === feat;
      // Otherwise allow dynamic sub-pages (like /products/123) to match their parent prefix
      return targetPath === feat || targetPath.startsWith(feat + "/");
    });

    const planAllowsLegacy = legacyFeatureKey && saasPlan.features.includes(legacyFeatureKey);

    if (!planAllowsRoute && !planAllowsLegacy) {
      return {
        allowed: false,
        reason: `The "${label}" feature is not available on your current plan (${saasPlan.name || "Current Plan"}). Please upgrade your subscription to access this feature.`,
      };
    }
  }

  // 5. Role-Based Authorization
  if (matchedItem?.roles && user?.role) {
    if (!matchedItem.roles.includes(user.role.toLowerCase())) {
      return {
        allowed: false,
        reason: `Your role (${user.role}) does not have access to ${label}.`,
      };
    }
  }

  // 6. User-Specific Employee Permissions Authorization
  if (user?.role?.toLowerCase() !== "admin") {
    const userPerms: string[] = Array.isArray(user?.permissions)
      ? user.permissions
      : DEFAULT_ROLE_PERMISSIONS_FALLBACK[user?.role?.toLowerCase()] || ["pos"];

    const requiredPermEntry = Object.entries(PERMISSION_ROUTE_MAP).find(([_, paths]) =>
      paths.some((p) => targetPath === p || targetPath.startsWith(p + "/")),
    );

    if (requiredPermEntry && !userPerms.includes(requiredPermEntry[0])) {
      return {
        allowed: false,
        reason: `You do not have permission to access "${label}". Contact your store administrator.`,
      };
    }
  }

  return { allowed: true };
}
