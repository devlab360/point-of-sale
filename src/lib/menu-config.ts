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
