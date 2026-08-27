export type UserRole = "super_admin" | "admin" | "manager" | "cashier" | "staff";

export interface UserSession {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  orgId: string;
}

export interface TenantOrg {
  id: string;
  name: string;
  ownerEmail: string;
  status: "active" | "trial" | "suspended" | "expired";
  currentPlanId: string;
  planExpiryDate?: string | null;
  createdAt: string;
}

export interface ProductCatalogItem {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  category: string;
  brand?: string | null;
  unit?: string | null;
  cost: string;
  price: string;
  stock: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  creditLimit?: string | number | null;
  walletBalance?: string | number | null;
  credit?: string | number | null;
  createdAt: string;
}
