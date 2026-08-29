import {
  ScanBarcode,
  ReceiptText,
  Truck,
  Package,
  Boxes,
  Wrench,
  ShoppingCart,
  Users,
  Star,
  MessageCircle,
  Wallet,
  BarChart3,
  RefreshCw,
  Store,
  Calendar,
  Sparkles,
  Ticket,
  Gift,
  FileText,
  BookOpen,
  KeyRound,
  Repeat,
  Utensils,
  ChefHat,
  CalendarDays,
  UserCog,
  Settings,
  Activity,
  Bell,
  UserCheck,
  CircleUser,
  LifeBuoy,
} from "lucide-react";

export interface SystemModule {
  id: string;
  key: string;
  name: string;
  label: string;
  category: ModuleCategory;
  icon: any;
  defaultRoute: string;
  description?: string;
}

export type ModuleCategory =
  | "Sales & POS"
  | "Catalog & Stock"
  | "Purchases & Vendors"
  | "Marketing & CRM"
  | "Finance & Accounts"
  | "Specialized Verticals"
  | "Administration & AI";

export const MODULE_CATEGORIES: ModuleCategory[] = [
  "Sales & POS",
  "Catalog & Stock",
  "Purchases & Vendors",
  "Marketing & CRM",
  "Finance & Accounts",
  "Specialized Verticals",
  "Administration & AI",
];

export const SYSTEM_MODULES: SystemModule[] = [
  // Sales & POS
  {
    id: "pos",
    key: "pos",
    name: "POS Terminal (Billing)",
    label: "POS Terminal",
    category: "Sales & POS",
    icon: ScanBarcode,
    defaultRoute: "/pos",
    description: "High-speed point of sale terminal, barcode scanning & receipt printing.",
  },
  {
    id: "sales",
    key: "sales",
    name: "Sales Invoices & Orders",
    label: "Sales & Orders",
    category: "Sales & POS",
    icon: ReceiptText,
    defaultRoute: "/sales",
    description: "Order history, invoice generation, customer billing records.",
  },
  {
    id: "returns",
    key: "returns",
    name: "Sales Returns & Refunds",
    label: "Returns & Refunds",
    category: "Sales & POS",
    icon: ReceiptText,
    defaultRoute: "/sales/returns",
    description: "Customer return processing, credit notes & restock handling.",
  },
  {
    id: "quotations",
    key: "quotations",
    name: "Quotations & Estimates",
    label: "Quotations",
    category: "Sales & POS",
    icon: FileText,
    defaultRoute: "/quotations",
    description: "Price quotations, proforma estimates & customer proposals.",
  },
  {
    id: "delivery-challans",
    key: "delivery-challans",
    name: "Delivery Challans",
    label: "Delivery Challans",
    category: "Sales & POS",
    icon: Truck,
    defaultRoute: "/delivery-challans",
    description: "Dispatch challans, proof of delivery & shipping management.",
  },

  // Catalog & Stock
  {
    id: "products",
    key: "products",
    name: "Product Catalog & Barcodes",
    label: "Products Catalog",
    category: "Catalog & Stock",
    icon: Package,
    defaultRoute: "/products",
    description: "Products, categories, brands, variants & barcode management.",
  },
  {
    id: "inventory",
    key: "inventory",
    name: "Stock Inventory & Transfers",
    label: "Inventory Master",
    category: "Catalog & Stock",
    icon: Boxes,
    defaultRoute: "/inventory",
    description: "Real-time stock valuation, adjustments, transfers & audit history.",
  },
  {
    id: "services",
    key: "services",
    name: "Services Catalog",
    label: "Services Catalog",
    category: "Catalog & Stock",
    icon: Wrench,
    defaultRoute: "/services",
    description: "Chargeable services, labor rates & recurring service items.",
  },

  // Purchases & Vendors
  {
    id: "purchases",
    key: "purchases",
    name: "Purchases & Purchase Orders",
    label: "Purchase Orders",
    category: "Purchases & Vendors",
    icon: ShoppingCart,
    defaultRoute: "/purchases",
    description: "Vendor procurement, purchase bills & supplier returns.",
  },
  {
    id: "suppliers",
    key: "suppliers",
    name: "Suppliers & Vendors Directory",
    label: "Suppliers Directory",
    category: "Purchases & Vendors",
    icon: Truck,
    defaultRoute: "/suppliers",
    description: "Vendor directory, contact profiles & payable balances.",
  },

  // Customers & Marketing
  {
    id: "customers",
    key: "customers",
    name: "Customer Directory & CRM",
    label: "Customers Directory",
    category: "Marketing & CRM",
    icon: Users,
    defaultRoute: "/customers",
    description: "Customer accounts, khata ledger, loyalty profile & purchase history.",
  },
  {
    id: "coupons",
    key: "coupons",
    name: "Coupons & Discounts",
    label: "Coupons & Discounts",
    category: "Marketing & CRM",
    icon: Ticket,
    defaultRoute: "/coupons",
    description: "Promotional coupon codes, percentage discounts & expiry rules.",
  },
  {
    id: "gift-cards",
    key: "gift-cards",
    name: "Gift Cards Management",
    label: "Gift Cards",
    category: "Marketing & CRM",
    icon: Gift,
    defaultRoute: "/gift-cards",
    description: "Prepaid gift vouchers, redemption balance & activation.",
  },
  {
    id: "loyalty",
    key: "loyalty",
    name: "Loyalty Points & Rewards",
    label: "Loyalty Program",
    category: "Marketing & CRM",
    icon: Star,
    defaultRoute: "/loyalty",
    description: "Points accumulation, cashback rules & tier rewards.",
  },
  {
    id: "promotions",
    key: "promotions",
    name: "Promotions & Deals",
    label: "Promotions & Deals",
    category: "Marketing & CRM",
    icon: Star,
    defaultRoute: "/promotions",
    description: "Bundle deals, Buy-X-Get-Y offers & seasonal sales.",
  },
  {
    id: "whatsapp",
    key: "whatsapp",
    name: "WhatsApp Marketing & Alerts",
    label: "WhatsApp Alerts",
    category: "Marketing & CRM",
    icon: MessageCircle,
    defaultRoute: "/settings",
    description: "Automated invoice dispatch, due reminders & marketing campaigns.",
  },

  // Finance & Accounts
  {
    id: "expenses",
    key: "expenses",
    name: "Expense Management",
    label: "Expense Tracking",
    category: "Finance & Accounts",
    icon: Wallet,
    defaultRoute: "/expenses",
    description: "Operating expenditures, petty cash vouchers & overhead tracking.",
  },
  {
    id: "accounts",
    key: "accounts",
    name: "Chart of Accounts & Ledger",
    label: "Chart of Accounts",
    category: "Finance & Accounts",
    icon: BookOpen,
    defaultRoute: "/accounts",
    description: "Double-entry general ledgers, journal vouchers & accounting heads.",
  },
  {
    id: "reports",
    key: "reports",
    name: "Financial & Sales Analytics",
    label: "Financial Reports",
    category: "Finance & Accounts",
    icon: BarChart3,
    defaultRoute: "/reports",
    description: "Sales velocity, category breakdown, tax summary & cash flow.",
  },
  {
    id: "accounting-reports",
    key: "accounting-reports",
    name: "Accounting Reports (P&L, Balance Sheet)",
    label: "Accounting Reports",
    category: "Finance & Accounts",
    icon: FileText,
    defaultRoute: "/accounting-reports",
    description: "Trial Balance, Balance Sheet, Profit & Loss Statements.",
  },

  // Specialized Verticals
  {
    id: "repairs",
    key: "repairs",
    name: "Repair Service Job Sheets",
    label: "Repair Job Sheets",
    category: "Specialized Verticals",
    icon: Wrench,
    defaultRoute: "/repairs",
    description: "Device intake, diagnostic notes, technician assignment & status tracking.",
  },
  {
    id: "rentals",
    key: "rentals",
    name: "Equipment & Item Rentals",
    label: "Equipment Rentals",
    category: "Specialized Verticals",
    icon: KeyRound,
    defaultRoute: "/rentals",
    description: "Rental bookings, security deposits, hourly/daily billing & returns.",
  },
  {
    id: "subscriptions",
    key: "subscriptions",
    name: "Recurring Subscriptions",
    label: "Subscriptions",
    category: "Specialized Verticals",
    icon: Repeat,
    defaultRoute: "/subscriptions",
    description: "Customer recurring billing, memberships & automated renewals.",
  },
  {
    id: "tables",
    key: "tables",
    name: "Restaurant Tables Management",
    label: "Restaurant Tables",
    category: "Specialized Verticals",
    icon: Utensils,
    defaultRoute: "/tables",
    description: "Table layouts, live seating status, split checks & dine-in orders.",
  },
  {
    id: "kitchen",
    key: "kitchen",
    name: "Kitchen Order Tickets (KOT)",
    label: "Kitchen (KOT)",
    category: "Specialized Verticals",
    icon: ChefHat,
    defaultRoute: "/kitchen",
    description: "Live kitchen display system, prep station routing & item completion.",
  },
  {
    id: "appointments",
    key: "appointments",
    name: "Appointment Booking",
    label: "Appointments",
    category: "Specialized Verticals",
    icon: CalendarDays,
    defaultRoute: "/appointments",
    description: "Staff slot scheduling, customer calendar bookings & reminders.",
  },

  // Administration & AI
  {
    id: "users",
    key: "users",
    name: "Staff Users & Role Permissions",
    label: "Staff Users",
    category: "Administration & AI",
    icon: UserCog,
    defaultRoute: "/users",
    description: "Employee directory, role-based access control & commission rules.",
  },
  {
    id: "ai",
    key: "ai",
    name: "AI Business Copilot",
    label: "AI Copilot",
    category: "Administration & AI",
    icon: Sparkles,
    defaultRoute: "/profile",
    description: "AI-powered sales insights, reorder forecasting & automated assistant.",
  },
];

export const ALL_MODULE_KEYS = SYSTEM_MODULES.map((m) => m.key);

export const DEFAULT_PLAN_MODULE_KEYS = [
  "pos",
  "products",
  "inventory",
  "sales",
  "customers",
  "reports",
];
