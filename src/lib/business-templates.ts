export type BusinessCapability =
  | "POS"
  | "PRODUCTS"
  | "SERVICES"
  | "INVENTORY"
  | "PURCHASES"
  | "SUPPLIERS"
  | "CUSTOMERS"
  | "BARCODE"
  | "VARIANTS"
  | "TABLES"
  | "KITCHEN"
  | "KOT"
  | "MENU"
  | "APPOINTMENTS"
  | "STAFF"
  | "COMMISSIONS"
  | "JOB_CARDS"
  | "REPAIRS"
  | "TECHNICIANS"
  | "REPAIR_STATUS"
  | "WARRANTY"
  | "LOYALTY"
  | "WHOLESALE"
  | "CREDIT_SALES"
  | "CUSTOMER_LEDGER"
  | "DELIVERY_CHALLANS"
  | "QUOTATIONS"
  | "MEMBERSHIP"
  | "PACKAGES"
  | "SUBSCRIPTIONS"
  | "RENTALS"
  | "COUPONS"
  | "GIFT_CARDS"
  | "EXPENSES"
  | "REPORTS"
  | "SETTINGS"
  | "ACCOUNTS" // Chart of Accounts, Vouchers
  | "PROMOTIONS"
  | "BATCH_EXPIRY_TRACKING" // Generic: batch/lot + expiry tracking (pharmacy, grocery, cosmetics, etc.)
  | "FEFO_ALLOCATION"; // Generic: First Expiry First Out stock allocation strategy

export type BusinessType =
  | "UNIVERSAL" // Fallback/Default: Has all basic modules enabled
  | "RETAIL"
  | "GROCERY"
  | "RESTAURANT"
  | "CAFE"
  | "SALON"
  | "BARBER"
  | "REPAIR_CENTER"
  | "MOBILE_REPAIR"
  | "WHOLESALE"
  | "PHARMACY";

export interface BusinessTemplate {
  type: BusinessType;
  label: string;
  description: string;
  capabilities: BusinessCapability[];
}

export const BUSINESS_TEMPLATES: Record<BusinessType, BusinessTemplate> = {
  UNIVERSAL: {
    type: "UNIVERSAL",
    label: "Universal Retail",
    description: "Multi-category retail and general department store features.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "SERVICES",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "BARCODE",
      "VARIANTS",
      "STAFF",
      "COMMISSIONS",
      "LOYALTY",
      "WHOLESALE",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "DELIVERY_CHALLANS",
      "QUOTATIONS",
      "MEMBERSHIP",
      "PACKAGES",
      "SUBSCRIPTIONS",
      "RENTALS",
      "COUPONS",
      "GIFT_CARDS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "PROMOTIONS",
    ],
  },
  RETAIL: {
    type: "RETAIL",
    label: "Retail",
    description: "Standard retail features including products, inventory, and barcode scanning.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "PURCHASES",
      "SUPPLIERS",
      "VARIANTS",
      "LOYALTY",
      "COUPONS",
      "GIFT_CARDS",
      "PROMOTIONS",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
    ],
  },
  GROCERY: {
    type: "GROCERY",
    label: "Grocery & Supermarket",
    description: "Optimized for high-volume scanning, inventory, and wholesale credit.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "LOYALTY",
      "COUPONS",
      "GIFT_CARDS",
      "PROMOTIONS",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
      "BATCH_EXPIRY_TRACKING",
      "FEFO_ALLOCATION",
    ],
  },
  RESTAURANT: {
    type: "RESTAURANT",
    label: "Restaurant",
    description: "Features for dining, tables, and kitchen management.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "MENU",
      "TABLES",
      "KOT",
      "KITCHEN",
      "INVENTORY",
      "STAFF",
    ],
  },
  CAFE: {
    type: "CAFE",
    label: "Café",
    description: "Quick service cafe features.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "MENU",
      "TABLES",
      "KOT",
      "KITCHEN",
      "INVENTORY",
    ],
  },
  SALON: {
    type: "SALON",
    label: "Salon & Spa",
    description: "Service-based business with appointments and staff commissions.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "SERVICES",
      "STAFF",
      "APPOINTMENTS",
      "COMMISSIONS",
      "PACKAGES",
      "MEMBERSHIP",
      "PRODUCTS", // For selling retail products
    ],
  },
  BARBER: {
    type: "BARBER",
    label: "Barber Shop",
    description: "Simple service business with staff and walk-in/appointments.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "SERVICES",
      "STAFF",
      "APPOINTMENTS",
      "COMMISSIONS",
      "PRODUCTS",
    ],
  },
  REPAIR_CENTER: {
    type: "REPAIR_CENTER",
    label: "Repair Center",
    description: "Manage job cards, technicians, parts, and repair statuses.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "JOB_CARDS",
      "REPAIRS",
      "TECHNICIANS",
      "REPAIR_STATUS",
      "WARRANTY",
      "SERVICES",
      "PRODUCTS",
      "INVENTORY", // For spare parts
    ],
  },
  MOBILE_REPAIR: {
    type: "MOBILE_REPAIR",
    label: "Mobile/Device Repair",
    description: "Device repair tracking with IMEI/Serial numbers.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "JOB_CARDS",
      "REPAIRS",
      "TECHNICIANS",
      "REPAIR_STATUS",
      "WARRANTY",
      "SERVICES",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
    ],
  },
  WHOLESALE: {
    type: "WHOLESALE",
    label: "Wholesale / Distribution",
    description: "B2B features like ledgers, bulk pricing, and credit sales.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "WHOLESALE",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "DELIVERY_CHALLANS",
      "QUOTATIONS",
      "PRODUCTS",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
      "BARCODE",
    ],
  },
  PHARMACY: {
    type: "PHARMACY",
    label: "Pharmacy & Medical",
    description:
      "Batch tracking, expiry management, FEFO allocation, and product classification for pharmacies.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "PURCHASES",
      "SUPPLIERS",
      "VARIANTS",
      "BATCH_EXPIRY_TRACKING",
      "FEFO_ALLOCATION",
      "LOYALTY",
      "COUPONS",
      "PROMOTIONS",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "QUOTATIONS",
    ],
  },
};

/**
 * Helper to check if a business type has a specific capability
 */
export function hasCapability(
  businessType: BusinessType | string | null | undefined,
  capability: BusinessCapability,
): boolean {
  if (!businessType) {
    const coreDefaultCapabilities: BusinessCapability[] = [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "BARCODE",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "EXPENSES",
    ];
    return coreDefaultCapabilities.includes(capability);
  }

  const typeStr = businessType.toUpperCase() as BusinessType;
  const template = BUSINESS_TEMPLATES[typeStr];

  if (!template) {
    return BUSINESS_TEMPLATES.RETAIL.capabilities.includes(capability);
  }

  return template.capabilities.includes(capability);
}
