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
  | "CLOTHING"
  | "JEWELLERY"
  | "ELECTRONICS"
  | "GROCERY"
  | "BAKERY"
  | "RESTAURANT"
  | "CAFE"
  | "HOTEL"
  | "SALON"
  | "BARBER"
  | "GYM"
  | "CLINIC"
  | "RENTAL"
  | "REPAIR_CENTER"
  | "MOBILE_REPAIR"
  | "AUTO_PARTS"
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
      "STAFF",
    ],
  },
  CLOTHING: {
    type: "CLOTHING",
    label: "Fashion & Apparel Boutique",
    description:
      "Multi-size/color matrix, seasonal discounts, gift cards, and fast barcode checkout.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "VARIANTS",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "LOYALTY",
      "COUPONS",
      "GIFT_CARDS",
      "PROMOTIONS",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "WHOLESALE",
    ],
  },
  JEWELLERY: {
    type: "JEWELLERY",
    label: "Jewellery & Precious Metals",
    description:
      "Purity tracking, stone & making charges, gift cards, luxury invoices, and customer khata.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "VARIANTS",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "LOYALTY",
      "COUPONS",
      "GIFT_CARDS",
      "PROMOTIONS",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "WHOLESALE",
    ],
  },
  ELECTRONICS: {
    type: "ELECTRONICS",
    label: "Consumer Electronics & Appliances",
    description:
      "Serial/IMEI tracking, warranty logs, repair job cards, quotations, and technician assignments.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "VARIANTS",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "WARRANTY",
      "JOB_CARDS",
      "REPAIRS",
      "TECHNICIANS",
      "REPAIR_STATUS",
      "LOYALTY",
      "COUPONS",
      "GIFT_CARDS",
      "PROMOTIONS",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "WHOLESALE",
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
      "STAFF",
    ],
  },
  BAKERY: {
    type: "BAKERY",
    label: "Bakery & Confectionery",
    description:
      "Batch expiry tracking, custom cake orders, freshness monitoring, and takeaway POS.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "VARIANTS",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "BATCH_EXPIRY_TRACKING",
      "FEFO_ALLOCATION",
      "LOYALTY",
      "COUPONS",
      "PROMOTIONS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "WHOLESALE",
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
      "PRODUCTS",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
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
      "STAFF",
      "PRODUCTS",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
    ],
  },
  HOTEL: {
    type: "HOTEL",
    label: "Hotel & Guest House",
    description:
      "Room reservations, guest check-in packages, duration rental billing, and dining POS.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "SERVICES",
      "RENTALS",
      "PACKAGES",
      "APPOINTMENTS",
      "STAFF",
      "MENU",
      "TABLES",
      "KOT",
      "KITCHEN",
      "COUPONS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "PRODUCTS",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
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
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
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
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
    ],
  },
  GYM: {
    type: "GYM",
    label: "Gym & Fitness Club",
    description:
      "Membership plans, recurring subscriptions, personal trainers, and locker/service packages.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "SERVICES",
      "STAFF",
      "APPOINTMENTS",
      "COMMISSIONS",
      "MEMBERSHIP",
      "PACKAGES",
      "SUBSCRIPTIONS",
      "PRODUCTS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "COUPONS",
      "PROMOTIONS",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
    ],
  },
  CLINIC: {
    type: "CLINIC",
    label: "Medical Clinic & Health Center",
    description:
      "Doctor consultations, patient appointments, treatments, drug inventory, and medical billing.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "SERVICES",
      "STAFF",
      "APPOINTMENTS",
      "COMMISSIONS",
      "PRODUCTS",
      "INVENTORY",
      "BATCH_EXPIRY_TRACKING",
      "FEFO_ALLOCATION",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "QUOTATIONS",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
      "COMMISSIONS",
    ],
  },
  RENTAL: {
    type: "RENTAL",
    label: "Equipment & Event Rental",
    description:
      "Item rental tracking, security deposit management, duration billing, and customer ledgers.",
    capabilities: [
      "POS",
      "CUSTOMERS",
      "RENTALS",
      "PRODUCTS",
      "INVENTORY",
      "CUSTOMER_LEDGER",
      "CREDIT_SALES",
      "QUOTATIONS",
      "DELIVERY_CHALLANS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
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
      "STAFF",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
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
      "STAFF",
      "PURCHASES",
      "SUPPLIERS",
      "WHOLESALE",
    ],
  },
  AUTO_PARTS: {
    type: "AUTO_PARTS",
    label: "Auto Parts & Hardware Store",
    description:
      "Part number indexing, wholesale/retail pricing, delivery challans, and B2B customer ledgers.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "INVENTORY",
      "BARCODE",
      "VARIANTS",
      "PURCHASES",
      "SUPPLIERS",
      "CUSTOMERS",
      "WHOLESALE",
      "CREDIT_SALES",
      "CUSTOMER_LEDGER",
      "DELIVERY_CHALLANS",
      "QUOTATIONS",
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
    ],
  },
  WHOLESALE: {
    type: "WHOLESALE",
    label: "Wholesale / Distribution",
    description: "B2B features like ledgers, bulk pricing, and credit sales.",
    capabilities: [
      "POS",
      "PRODUCTS",
      "BARCODE",
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
      "EXPENSES",
      "REPORTS",
      "SETTINGS",
      "ACCOUNTS",
      "STAFF",
      "INVENTORY",
      "PURCHASES",
      "SUPPLIERS",
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
      "STAFF",
      "WHOLESALE",
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
