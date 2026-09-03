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

export type SubMenuItem = {
  to: string;
  label: string;
  tkey: string;
  roles?: string[];
  badge?: string;
};

export type MenuItem = {
  menuKey?: string;
  to: string;
  label: string;
  tkey: string;
  icon: any;
  badge?: string;
  roles?: string[];
  children?: SubMenuItem[];
};
export type MenuGroup = { label: string; tkey: string; items: MenuItem[] };

export const APP_GROUPS: MenuGroup[] = [
  {
    label: "STORE CATALOG",
    tkey: "catalog",
    items: [
      {
        to: "/products",
        menuKey: "products",
        label: "Products",
        tkey: "products",
        icon: Package,
        roles: ["admin", "manager"],
        children: [
          { to: "/products", label: "Products Catalog", tkey: "productsCatalog" },
          { to: "/price-books", label: "Price Books & Rates", tkey: "priceBooks" },
          { to: "/categories", label: "Categories", tkey: "categories" },
          { to: "/brands", label: "Brands", tkey: "brands" },
          { to: "/units", label: "Units", tkey: "units" },
        ],
      },
      {
        to: "/inventory",
        menuKey: "inventory",
        label: "Inventory Master",
        tkey: "inventory",
        icon: Boxes,
        roles: ["admin", "manager"],
        children: [
          { to: "/inventory", label: "Stock Inventory", tkey: "inventory" },
          { to: "/inventory/adjustments", label: "Stock Adjustments", tkey: "adjustments" },
          { to: "/inventory/transfers", label: "Stock Transfers", tkey: "transfers" },
          { to: "/inventory/history", label: "Stock History", tkey: "stockHistory" },
        ],
      },
      {
        to: "/pos",
        menuKey: "pos",
        label: "POS Terminal",
        tkey: "pos",
        icon: ScanBarcode,
        badge: "Live",
      },
      {
        to: "/services",
        menuKey: "services",
        label: "Services Catalog",
        tkey: "services",
        icon: Wrench,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "SALES & FULFILLMENT",
    tkey: "salesFulfillment",
    items: [
      {
        to: "/sales",
        menuKey: "sales",
        label: "Orders & Invoices",
        tkey: "salesInvoices",
        icon: ReceiptText,
      },
      {
        to: "/quotations",
        menuKey: "quotations",
        label: "Quotations",
        tkey: "quotations",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        to: "/delivery-challans",
        menuKey: "delivery-challans",
        label: "Delivery Challans",
        tkey: "deliveryChallans",
        icon: Truck,
        roles: ["admin", "manager"],
      },
      {
        to: "/sales/returns",
        menuKey: "returns",
        label: "Payments & Refunds",
        tkey: "salesReturns",
        icon: Undo2,
      },
    ],
  },
  {
    label: "PURCHASES & VENDORS",
    tkey: "purchasesVendors",
    items: [
      {
        to: "/purchases",
        menuKey: "purchases",
        label: "Purchases",
        tkey: "purchases",
        icon: ShoppingCart,
        roles: ["admin", "manager"],
        children: [
          { to: "/purchases", label: "Purchase Orders", tkey: "purchases" },
          { to: "/purchases/returns", label: "Purchase Returns", tkey: "purchaseReturns" },
        ],
      },
      {
        to: "/suppliers",
        menuKey: "suppliers",
        label: "Suppliers Directory",
        tkey: "suppliers",
        icon: Truck,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "CUSTOMERS & MARKETING",
    tkey: "customersMarketing",
    items: [
      {
        to: "/customers",
        menuKey: "customers",
        label: "Customers Directory",
        tkey: "customers",
        icon: Users,
      },
      {
        to: "/coupons",
        menuKey: "coupons",
        label: "Coupons & Discounts",
        tkey: "coupons",
        icon: Ticket,
        roles: ["admin", "manager"],
      },
      {
        to: "/gift-cards",
        menuKey: "gift-cards",
        label: "Gift Cards",
        tkey: "giftCards",
        icon: Gift,
      },
      {
        to: "/loyalty",
        menuKey: "loyalty",
        label: "Loyalty & Promotions",
        tkey: "loyalty",
        icon: Star,
        roles: ["admin", "manager"],
        children: [
          { to: "/loyalty", label: "Loyalty Program", tkey: "loyalty" },
          { to: "/promotions", label: "Promotions & Offers", tkey: "promotions" },
        ],
      },
    ],
  },
  {
    label: "FINANCE & ACCOUNTS",
    tkey: "financeAccounts",
    items: [
      {
        to: "/expenses",
        menuKey: "expenses",
        label: "Expenses",
        tkey: "expenses",
        icon: Wallet,
        roles: ["admin", "manager"],
      },
      {
        to: "/accounts",
        menuKey: "accounts",
        label: "Chart of Accounts",
        tkey: "accounts",
        icon: BookOpen,
        roles: ["admin", "manager"],
      },
      {
        to: "/reports",
        menuKey: "reports",
        label: "Financial Reports",
        tkey: "reports",
        icon: BarChart3,
        roles: ["admin", "manager"],
      },
      {
        to: "/accounting-reports",
        menuKey: "accounting-reports",
        label: "Accounting Reports",
        tkey: "accounting_reports",
        icon: FileText,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "SERVICES & OPERATIONS",
    tkey: "servicesOperations",
    items: [
      {
        to: "/repairs",
        menuKey: "repairs",
        label: "Repair Job Sheets",
        tkey: "repairs",
        icon: Wrench,
        roles: ["admin", "manager"],
      },
      {
        to: "/rentals",
        menuKey: "rentals",
        label: "Equipment Rentals",
        tkey: "rentals",
        icon: KeyRound,
        roles: ["admin", "manager"],
      },
      {
        to: "/subscriptions",
        menuKey: "subscriptions",
        label: "Subscriptions",
        tkey: "subscriptions",
        icon: Repeat,
        roles: ["admin", "manager"],
      },
      {
        to: "/tables",
        menuKey: "tables",
        label: "Restaurant Tables",
        tkey: "tables",
        icon: Utensils,
        roles: ["admin", "manager", "cashier"],
      },
      {
        to: "/kitchen",
        menuKey: "kitchen",
        label: "Kitchen (KOT)",
        tkey: "kitchen",
        icon: ChefHat,
        roles: ["admin", "manager", "cashier"],
      },
      {
        to: "/appointments",
        menuKey: "appointments",
        label: "Appointments",
        tkey: "appointments",
        icon: CalendarDays,
        roles: ["admin", "manager", "cashier"],
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    tkey: "administration",
    items: [
      {
        to: "/users",
        menuKey: "users",
        label: "Staff Users",
        tkey: "employees",
        icon: UserCog,
        roles: ["admin"],
      },
      {
        to: "/settings",
        menuKey: "settings",
        label: "Store Settings",
        tkey: "settings",
        icon: Settings,
        roles: ["admin"],
      },
      {
        to: "/activity",
        menuKey: "activity",
        label: "Activity Audit Log",
        tkey: "activityLog",
        icon: Activity,
        roles: ["admin", "manager"],
      },
      {
        to: "/notifications",
        menuKey: "notifications",
        label: "Notifications",
        tkey: "notifications",
        icon: Bell,
      },
      {
        to: "/portal",
        menuKey: "portal",
        label: "Client Portal",
        tkey: "clientPortal",
        icon: UserCheck,
      },
      {
        to: "/profile",
        menuKey: "profile",
        label: "Profile",
        tkey: "profile",
        icon: CircleUser,
      },
      {
        to: "/help",
        menuKey: "help",
        label: "Help Center",
        tkey: "help",
        icon: LifeBuoy,
      },
    ],
  },
];

export const PERMISSION_ROUTE_MAP: Record<string, string[]> = {
  pos: ["/pos"],
  sales: ["/sales"],
  returns: ["/sales/returns", "/purchases/returns"],
  quotations: ["/quotations"],
  "delivery-challans": ["/delivery-challans"],
  products: ["/products", "/categories", "/brands", "/units"],
  inventory: ["/inventory", "/inventory/adjustments", "/inventory/transfers", "/inventory/history"],
  services: ["/services"],
  purchases: ["/purchases", "/purchases/returns"],
  suppliers: ["/suppliers"],
  customers: ["/customers", "/portal"],
  coupons: ["/coupons"],
  "gift-cards": ["/gift-cards"],
  loyalty: ["/loyalty"],
  promotions: ["/promotions"],
  expenses: ["/expenses"],
  accounts: ["/accounts"],
  reports: ["/reports"],
  "accounting-reports": ["/accounting-reports"],
  repairs: ["/repairs"],
  rentals: ["/rentals"],
  subscriptions: ["/subscriptions"],
  tables: ["/tables"],
  kitchen: ["/kitchen"],
  appointments: ["/appointments"],
  users: ["/users"],
  settings: ["/settings"],
  activity: ["/activity"],
  notifications: ["/notifications"],
  ai: ["/profile"],
};

const DEFAULT_ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  admin: Object.keys(PERMISSION_ROUTE_MAP),
  manager: Object.keys(PERMISSION_ROUTE_MAP).filter((k) => !["users", "settings"].includes(k)),
  cashier: ["pos", "customers", "tables", "kitchen", "appointments", "sales", "returns"],
};

export const ROUTE_CAPABILITY_MAP: Record<string, BusinessCapability[]> = {
  "/pos": ["POS"],
  "/products": ["PRODUCTS"],
  "/services": ["SERVICES"],
  "/categories": ["PRODUCTS", "SERVICES", "MENU"],
  "/brands": ["PRODUCTS"],
  "/units": ["PRODUCTS"],
  "/inventory": ["INVENTORY"],
  "/inventory/adjustments": ["INVENTORY"],
  "/inventory/transfers": ["INVENTORY"],
  "/inventory/history": ["INVENTORY"],
  "/purchases": ["PURCHASES"],
  "/purchases/returns": ["PURCHASES"],
  "/sales": ["POS"],
  "/quotations": ["QUOTATIONS", "WHOLESALE"],
  "/delivery-challans": ["DELIVERY_CHALLANS", "WHOLESALE"],
  "/sales/returns": ["POS"],
  "/customers": ["CUSTOMERS"],
  "/suppliers": ["SUPPLIERS"],
  "/users": ["STAFF"],
  "/accounts": ["ACCOUNTS"],
  "/expenses": ["EXPENSES"],
  "/reports": ["REPORTS"],
  "/accounting-reports": ["ACCOUNTS"],
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
  "/kitchen": ["KITCHEN", "KOT"],
  "/appointments": ["APPOINTMENTS"],
};

export function hasPermissionForRoute(
  user: any,
  routePath: string,
  isSuperAdminUser: boolean,
  saasPlan: any,
  businessType?: string,
): { allowed: boolean; reason?: string } {
  const userRole = String(user?.role || "").toLowerCase();

  // 1. Root Super Admin & Store Admin Authorization (Global Master Access)
  if (
    isSuperAdminUser ||
    userRole === "super_admin" ||
    userRole === "admin" ||
    userRole === "owner"
  ) {
    return { allowed: true };
  }

  // Block non-super admins from accessing super admin dashboard
  if (routePath.startsWith("/super-admin") || routePath.startsWith("/admin")) {
    return {
      allowed: false,
      reason: "You do not have permission to access the Super Admin governance dashboard.",
    };
  }

  // 2. Core System Routes (Always Available to Authenticated Users)
  if (
    routePath === "/" ||
    routePath === "/profile" ||
    routePath.startsWith("/profile/") ||
    routePath === "/help" ||
    routePath.startsWith("/help/")
  ) {
    return { allowed: true };
  }

  // 3. Resolve Target Path
  const allItems = APP_GROUPS.flatMap((g) => g.items);

  // Exact match or parent match
  let matchedItem = allItems.find((item) => routePath === item.to);
  if (!matchedItem) {
    const parentMatches = allItems.filter((item) => routePath.startsWith(item.to + "/"));
    if (parentMatches.length > 0) {
      parentMatches.sort((a, b) => b.to.length - a.to.length);
      matchedItem = parentMatches[0];
    }
  }

  const targetPath = matchedItem ? matchedItem.to : routePath;
  const label = matchedItem ? matchedItem.label : targetPath;
  const cleanTarget = targetPath.replace(/^\//, "");

  // 4. Role-Based Authorization on Menu Items
  if (matchedItem?.roles && matchedItem.roles.length > 0) {
    if (!matchedItem.roles.includes(userRole)) {
      return {
        allowed: false,
        reason: `Your assigned role (${userRole}) does not have permission to access ${label}.`,
      };
    }
  }

  // 7. User-Specific Granular Employee Permissions
  const userPerms: string[] =
    Array.isArray(user?.permissions) && user.permissions.length > 0
      ? user.permissions
      : DEFAULT_ROLE_PERMISSIONS_FALLBACK[userRole] || ["pos", "/pos"];

  if (userPerms.includes("all")) {
    return { allowed: true };
  }

  // Find module key
  const requiredModuleEntry = Object.entries(PERMISSION_ROUTE_MAP).find(([_, paths]) =>
    paths.some((p) => targetPath === p || targetPath.startsWith(p + "/")),
  );
  const moduleKey = requiredModuleEntry ? requiredModuleEntry[0] : cleanTarget;

  const hasEmployeePermission = userPerms.some((p: string) => {
    const cleanPerm = p.replace(/^\//, "");
    return (
      p === targetPath ||
      p === cleanTarget ||
      cleanPerm === moduleKey ||
      cleanPerm === cleanTarget ||
      targetPath.startsWith(p + "/") ||
      targetPath === `/${cleanPerm}`
    );
  });

  if (!hasEmployeePermission) {
    return {
      allowed: false,
      reason: `You do not have permission to access "${label}". Please contact your store administrator for authorization.`,
    };
  }

  return { allowed: true };
}

/**
 * Check whether a user holds a specific action-level permission.
 * Admins/super admins bypass; a role may globally imply a permission
 * (roleDefaults) and a user may be granted the key explicitly in their
 * permissions array.
 */
export function hasPermission(
  user: any,
  permissionKey: string,
  roleDefaults: string[] = [],
): boolean {
  if (!user) return false;
  const role = String(user?.role || "").toLowerCase();
  if (role === "admin" || role === "super_admin") return true;
  if (roleDefaults.includes(role)) return true;
  const userPerms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
  const normalizedKey = permissionKey.replace(/^\//, "");
  return (
    userPerms.includes("all") ||
    userPerms.some((p: string) => p.replace(/^\//, "") === normalizedKey)
  );
}
