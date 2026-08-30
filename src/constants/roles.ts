import { Crown, Briefcase, CreditCard } from "lucide-react";

export interface RoleOption {
  value: string;
  label: string;
  icon: any;
  desc: string;
  badge: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "admin",
    label: "Administrator",
    icon: Crown,
    desc: "Full module access, staff management & store settings.",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  {
    value: "manager",
    label: "Manager",
    icon: Briefcase,
    desc: "Catalog, inventory, sales, purchases, finance & reports.",
    badge: "bg-info/10 text-info border-info/20",
  },
  {
    value: "cashier",
    label: "POS Cashier",
    icon: CreditCard,
    desc: "POS billing, customers, tables, kitchen & appointments.",
    badge: "bg-success/15 text-success border-success/30",
  },
];

export const ALL_SELECTABLE_ROUTES = [
  "/pos",
  "/products",
  "/services",
  "/categories",
  "/brands",
  "/units",
  "/tax-masters",
  "/inventory",
  "/inventory/adjustments",
  "/inventory/transfers",
  "/inventory/history",
  "/sales",
  "/quotations",
  "/delivery-challans",
  "/sales/returns",
  "/purchases",
  "/purchases/returns",
  "/suppliers",
  "/customers",
  "/coupons",
  "/gift-cards",
  "/loyalty",
  "/promotions",
  "/expenses",
  "/accounts",
  "/reports",
  "/accounting-reports",
  "/repairs",
  "/rentals",
  "/subscriptions",
  "/tables",
  "/kitchen",
  "/appointments",
  "/users",
  "/settings",
  "/activity",
  "/notifications",
  "/portal",
  "ai_copilot",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_SELECTABLE_ROUTES,
  manager: ALL_SELECTABLE_ROUTES.filter((r) => !["/users", "/settings"].includes(r)),
  cashier: ["/pos", "/customers", "/sales", "/tables", "/kitchen", "/appointments"],
};

export function getRoleVisuals(role: string): { label: string; badge: string } {
  const r = (role || "").toLowerCase();
  const found = ROLE_OPTIONS.find((opt) => opt.value === r);
  if (found) {
    return { label: found.label, badge: found.badge };
  }
  return {
    label: role ? role.toUpperCase() : "Staff",
    badge: "bg-muted text-muted-foreground border-border",
  };
}
