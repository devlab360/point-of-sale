import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  status: text("status").notNull().default("trial"), // trial, active, suspended
  currentPlanId: text("current_plan_id").notNull().default("basic"),
  planExpiryDate: timestamp("plan_expiry_date", { mode: "string" }),
  syncKey: text("sync_key").notNull().default("default-sync-key"), // To authenticate devices
  isOnline: boolean("is_online").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const saasPlans = pgTable("saas_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("standard"), // 'standard' | 'custom'
  status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'archived'
  currency: text("currency").notNull().default("INR"),
  // Legacy single price field kept for backward compat
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  // New billing cycle prices
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }),
  customPrice: numeric("custom_price", { precision: 10, scale: 2 }),
  features: jsonb("features").$type<string[]>(), // semantic keys e.g. ['pos','products']
  menus: jsonb("menus").$type<string[]>(), // sidebar menu keys allowed by plan
  limits: jsonb("limits").$type<{
    maxUsers: number;
    maxProducts: number;
    maxBranches: number;
    maxInvoicesPerMonth: number;
    maxCustomers?: number;
  }>(),
  trialDays: integer("trial_days").default(7),
  isTrialDefault: boolean("is_trial_default").notNull().default(false),
  targetOrgId: text("target_org_id"), // null = all orgs; set = custom plan for specific org
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// SaaS subscription for each tenant org (source of truth for billing)
export const orgSubscriptions = pgTable(
  "org_subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => saasPlans.id),
    billingCycle: text("billing_cycle").notNull().default("trial"), // 'monthly' | 'yearly' | 'custom' | 'trial'
    lockedPrice: numeric("locked_price", { precision: 10, scale: 2 }), // price frozen at subscription time
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("trial"), // 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled'
    startDate: timestamp("start_date", { mode: "string" }).notNull(),
    renewalDate: timestamp("renewal_date", { mode: "string" }),
    expiryDate: timestamp("expiry_date", { mode: "string" }),
    activatedBy: text("activated_by"), // super_admin user id
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("org_subs_org_idx").on(t.organizationId),
    statusIdx: index("org_subs_status_idx").on(t.status),
  }),
);

// Super Admin per-org menu grants (overrides / extends plan menus)
export const adminMenuGrants = pgTable(
  "admin_menu_grants",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    menuKey: text("menu_key").notNull(), // e.g. 'pos', 'products', 'reports'
    grantedBy: text("granted_by").notNull(), // super_admin user id
    grantedAt: timestamp("granted_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgMenuUniqueIdx: unique("admin_menu_grants_org_menu_idx").on(t.organizationId, t.menuKey),
    orgIdx: index("admin_menu_grants_org_idx").on(t.organizationId),
  }),
);

// Super Admin server-side sessions (replaces Dexie/localStorage in pos-super-admin)
export const superAdminSessions = pgTable(
  "super_admin_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("sa_sessions_user_idx").on(t.userId),
    expiryIdx: index("sa_sessions_expiry_idx").on(t.expiresAt),
  }),
);

export const saasSessions = pgTable(
  "saas_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    loginAt: timestamp("login_at", { mode: "string" }).notNull(),
    logoutAt: timestamp("logout_at", { mode: "string" }),
    ipAddress: text("ip_address"),
    device: text("device"),
    status: text("status").notNull().default("live"),
  },
  (t) => ({
    userIdx: index("saas_sessions_user_idx").on(t.userId),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    token: text("token").notNull(),
    role: text("role").notNull().default("cashier"),
    permissions: jsonb("permissions").$type<string[]>(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  },
  (t) => ({
    orgIdx: index("invitations_org_idx").on(t.organizationId),
    tokenIdx: index("invitations_token_idx").on(t.token),
  }),
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id),
    name: text("name").notNull(),
    role: text("role").notNull(),
    email: text("email").notNull(),
    lastActive: timestamp("last_active", { mode: "string" }).defaultNow(),
    status: text("status").notNull().default("active"),
    avatar: text("avatar"),
    phone: text("phone"),
    location: text("location"),
    joined: timestamp("joined", { mode: "string" }),
    pin: text("pin"),
    permissions: jsonb("permissions").$type<string[]>(),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
    monthlyTarget: numeric("monthly_target", { precision: 12, scale: 2 }),
    earnedCommission: numeric("earned_commission", { precision: 12, scale: 2 }),
    emailVerified: boolean("email_verified").default(false),
    emailVerificationToken: text("email_verification_token"),
    countryCode: text("country_code"),
    timeZone: text("time_zone"),
    dateFormat: text("date_format"),
    language: text("language"),
  },
  (t) => ({
    userEmailIdx: unique("user_email_idx").on(t.email, t.organizationId),
    orgIdx: index("users_org_idx").on(t.organizationId),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    color: text("color").notNull().default("oklch(0.7 0.1 200)"),
    icon: text("icon").notNull().default("📦"),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    catNameIdx: unique("cat_name_idx").on(t.name, t.organizationId),
    orgIdx: index("categories_org_idx").on(t.organizationId),
  }),
);

export const brands = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    products: integer("products").notNull().default(0),
  },
  (t) => ({
    brandNameIdx: unique("brand_name_idx").on(t.name, t.organizationId),
    orgIdx: index("brands_org_idx").on(t.organizationId),
  }),
);

export const units = pgTable(
  "units",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    short: text("short").notNull(),
    allowFractional: boolean("allow_fractional").notNull().default(false),
  },
  (t) => ({
    orgIdx: index("units_org_idx").on(t.organizationId),
  }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    contact: text("contact").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    items: integer("items").notNull().default(0),
    gstin: text("gstin"),
    stateCode: text("state_code"),
    pan: text("pan"),
    website: text("website"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country"),
    paymentTerms: text("payment_terms"),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }),
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    ifscSwift: text("ifsc_swift"),
    upiId: text("upi_id"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
  },
  (t) => ({
    orgIdx: index("suppliers_org_idx").on(t.organizationId),
  }),
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode").notNull(),
    category: text("category").notNull(),
    brand: text("brand").notNull(),
    unit: text("unit").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    image: text("image"),
    status: text("status").notNull().default("active"),
    expiryDate: timestamp("expiry_date", { mode: "string" }),
    wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 }),
    dealerPrice: numeric("dealer_price", { precision: 10, scale: 2 }),
    minWholesaleQty: integer("min_wholesale_qty"),
    stock: numeric("stock", { precision: 10, scale: 3 }).notNull().default("0"),
    reorderLevel: numeric("reorder_level", { precision: 10, scale: 3 }).notNull().default("10"),
    hasVariants: boolean("has_variants").default(false),
    hasSerial: boolean("has_serial").default(false),
    course: text("course").default("Main Course"),
    serials: jsonb("serials").$type<string[]>(),
    hasBatch: boolean("has_batch").default(false),
    batches: jsonb("batches").$type<Record<string, any>[]>(),
    locationRack: text("location_rack"),
    locationShelf: text("location_shelf"),
    locationBin: text("location_bin"),
    hsnCode: text("hsn_code"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }),
    taxInclusive: boolean("tax_inclusive").default(false),
    mrp: numeric("mrp", { precision: 10, scale: 2 }),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    isBundle: boolean("is_bundle").default(false),
    trackFifo: boolean("track_fifo").default(false),
    hasModifiers: boolean("has_modifiers").default(false),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: unique("sku_idx").on(t.sku, t.organizationId),
    barcodeIdx: unique("barcode_idx").on(t.barcode, t.organizationId),
    orgIdx: index("products_org_idx").on(t.organizationId),
    categoryIdx: index("products_category_idx").on(t.category),
    brandIdx: index("products_brand_idx").on(t.brand),
  }),
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    category: text("category").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
    duration: integer("duration"), // in minutes
    hasVariants: boolean("has_variants").default(false),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("services_org_idx").on(t.organizationId),
    categoryIdx: index("services_category_idx").on(t.category),
    statusIdx: index("services_status_idx").on(t.organizationId, t.status),
  }),
);

export const serviceVariants = pgTable(
  "service_variants",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    duration: integer("duration"), // in minutes
  },
  (t) => ({
    orgIdx: index("svc_variant_org_idx").on(t.organizationId),
    serviceIdx: index("svc_variant_svc_idx").on(t.serviceId),
  }),
);

export const serviceVariantAttributes = pgTable(
  "service_variant_attributes",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => serviceVariants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    variantIdx: index("svc_variant_attr_idx").on(t.variantId),
  }),
);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    zipCode: text("zip_code"),
    loyaltyPoints: integer("loyalty_points").default(0),
    visits: integer("visits").default(0),
    totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
    credit: numeric("credit", { precision: 10, scale: 2 }).default("0"),
    creditLimit: numeric("credit_limit", { precision: 10, scale: 2 }),
    walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).default("0"),
    status: text("status").default("regular"),
    type: text("type").default("retail"),
    gstin: text("gstin"),
    stateCode: text("state_code"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("customers_org_idx").on(t.organizationId),
    phoneIdx: index("customers_phone_idx").on(t.phone),
  }),
);

export const sales = pgTable(
  "sales",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: text("customer_id").references(() => customers.id),
    customerName: text("customer_name"),
    date: timestamp("date", { mode: "string" }).defaultNow().notNull(),
    items: integer("items").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
    discountAmt: numeric("discount_amt", { precision: 12, scale: 2 }),
    taxAmt: numeric("tax_amt", { precision: 12, scale: 2 }),
    cgstAmt: numeric("cgst_amt", { precision: 12, scale: 2 }),
    sgstAmt: numeric("sgst_amt", { precision: 12, scale: 2 }),
    igstAmt: numeric("igst_amt", { precision: 12, scale: 2 }),
    paymentMethod: text("payment_method").notNull(),
    payments: jsonb("payments").$type<Record<string, any>[]>(),
    cashTendered: numeric("cash_tendered", { precision: 10, scale: 2 }),
    changeDue: numeric("change_due", { precision: 10, scale: 2 }),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    salesmanId: text("salesman_id").references(() => users.id),
    salesmanName: text("salesman_name"),
    commissionAmt: numeric("commission_amt", { precision: 10, scale: 2 }),
    status: text("status").notNull().default("completed"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgDateIdx: index("sales_org_date_idx").on(t.organizationId, t.date),
    customerIdx: index("sales_cust_idx").on(t.customerId),
    salesmanIdx: index("sales_salesman_idx").on(t.salesmanId),
  }),
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    referenceType: text("reference_type").notNull().default("PRODUCT"),
    referenceId: text("reference_id").notNull().default("UNKNOWN"),
    productId: text("product_id"),
    variantId: text("variant_id"),
    locationId: text("location_id"),
    productName: text("product_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    serialNumber: text("serial_number"),
    batchNo: text("batch_no"),
    modifiers: jsonb("modifiers"), // stores selected modifiers array
  },
  (t) => ({
    orgIdx: index("sale_items_org_idx").on(t.organizationId),
    saleIdx: index("sale_items_sale_idx").on(t.saleId),
    referenceIdx: index("sale_items_ref_idx").on(t.referenceType, t.referenceId),
  }),
);

export const salePayments = pgTable(
  "sale_payments",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: text("method").notNull(),
    transactionRef: text("transaction_ref"),
    date: timestamp("date", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("sale_payments_org_idx").on(t.organizationId),
    saleIdx: index("sale_payments_sale_idx").on(t.saleId),
  }),
);

export const saleTaxes = pgTable(
  "sale_taxes",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    taxName: text("tax_name").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => ({
    orgIdx: index("sale_taxes_org_idx").on(t.organizationId),
    saleIdx: index("sale_taxes_sale_idx").on(t.saleId),
  }),
);

export const purchases = pgTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    supplierId: text("supplier_id").references(() => suppliers.id),
    supplier: text("supplier").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    invoiceNo: text("invoice_no"),
    items: integer("items").notNull(),
    status: text("status").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
    discountAmt: numeric("discount_amt", { precision: 12, scale: 2 }),
    taxAmt: numeric("tax_amt", { precision: 12, scale: 2 }),
    cgstAmt: numeric("cgst_amt", { precision: 12, scale: 2 }),
    sgstAmt: numeric("sgst_amt", { precision: 12, scale: 2 }),
    igstAmt: numeric("igst_amt", { precision: 12, scale: 2 }),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    paid: numeric("paid", { precision: 12, scale: 2 }),
    due: numeric("due", { precision: 12, scale: 2 }),
    purchaseItems: jsonb("purchase_items").$type<Record<string, any>[]>(),
  },
  (t) => ({
    orgDateIdx: index("purchases_org_date_idx").on(t.organizationId, t.date),
    supplierIdx: index("purchases_supplier_idx").on(t.supplierId),
  }),
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id"),
    locationId: text("location_id"),
    productName: text("product_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    cgst: numeric("cgst", { precision: 10, scale: 2 }),
    sgst: numeric("sgst", { precision: 10, scale: 2 }),
    igst: numeric("igst", { precision: 10, scale: 2 }),
  },
  (t) => ({
    orgIdx: index("purchase_items_org_idx").on(t.organizationId),
    purchaseIdx: index("purchase_items_purchase_idx").on(t.purchaseId),
  }),
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id"),
    variantId: text("variant_id"),
    locationId: text("location_id"),
    productName: text("product_name").notNull(),
    action: text("action").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("inv_move_org_idx").on(t.organizationId),
    prodIdx: index("inv_move_prod_idx").on(t.productName),
  }),
);

export const settings = pgTable(
  "settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    trialEndsAt: timestamp("trial_ends_at", { mode: "string" }),
    trialDays: integer("trial_days"),
    subscriptionStatus: text("subscription_status"),
    currencySymbol: text("currency_symbol"),
    currencyCode: text("currency_code"),
    storeName: text("store_name").notNull(),
    taxId: text("tax_id"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    standardRate: numeric("standard_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    reducedRate: numeric("reduced_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    pricesIncludeTax: boolean("prices_include_tax").notNull().default(false),
    showTaxBreakdown: boolean("show_tax_breakdown").notNull().default(true),
    headerNote: text("header_note"),
    footerNote: text("footer_note"),
    receiptDeclaration: text("receipt_declaration"),
    bankDetails: text("bank_details"),
    upiId: text("upi_id"),
    emailReceiptDefault: boolean("email_receipt_default").notNull().default(true),
    printStoreLogo: boolean("print_store_logo").notNull().default(true),
    logoUrl: text("logo_url"),
    signatureUrl: text("signature_url"),
    termsAndConditions: text("terms_and_conditions"),
    privacyPolicy: text("privacy_policy"),
    countryCode: text("country_code"),
    timeZone: text("time_zone"),
    dateFormat: text("date_format"),
    language: text("language"),
    loyaltyTiers: jsonb("loyalty_tiers").$type<Record<string, any>[]>(),
    enableGST: boolean("enable_gst").default(false),
    gstin: text("gstin"),
    stateCode: text("state_code"),
    businessType: text("business_type"),
    config: jsonb("config").$type<Record<string, any>>(),
    expiryWarningDays: integer("expiry_warning_days").default(30),
    stockAllocationMethod: text("stock_allocation_method").default("FIFO"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("settings_org_idx").on(t.organizationId),
  }),
);

export const adjustments = pgTable(
  "adjustments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    ref: text("ref").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    reason: text("reason").notNull(),
    items: integer("items").notNull(),
    net: numeric("net", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("adjustments_org_idx").on(t.organizationId),
  }),
);

export const transfers = pgTable(
  "transfers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    ref: text("ref").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    destination: text("destination").notNull(),
    items: integer("items").notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("transfers_org_idx").on(t.organizationId),
  }),
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    date: timestamp("date", { mode: "string" }).notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("expenses_org_idx").on(t.organizationId),
  }),
);

export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    code: text("code").notNull(),
    type: text("type").notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).notNull(),
    usageLimit: integer("usage_limit").notNull(),
    used: integer("used").notNull().default(0),
    expires: timestamp("expires", { mode: "string" }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("coupons_org_idx").on(t.organizationId),
  }),
);

export const giftCards = pgTable(
  "gift_cards",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    code: text("code").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    initialBalance: numeric("initial_balance", { precision: 12, scale: 2 }),
    customer: text("customer"),
    issued: timestamp("issued", { mode: "string" }),
    expires: timestamp("expires", { mode: "string" }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("gift_cards_org_idx").on(t.organizationId),
  }),
);

export const promotions = pgTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    type: text("type").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    conditions: text("conditions").notNull(),
    startDate: timestamp("start_date", { mode: "string" }).notNull(),
    endDate: timestamp("end_date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("promotions_org_idx").on(t.organizationId),
  }),
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    user: text("user").notNull(),
    action: text("action").notNull(),
    details: text("details"),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
    type: text("type"),
  },
  (t) => ({
    orgTimeIdx: index("activity_log_org_time_idx").on(t.organizationId, t.timestamp),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type"),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
    read: boolean("read").notNull().default(false),
  },
  (t) => ({
    orgTimeIdx: index("notifications_org_time_idx").on(t.organizationId, t.timestamp),
  }),
);

export const heldInvoices = pgTable(
  "held_invoices",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: text("customer_id"),
    customerName: text("customer_name"),
    cart: jsonb("cart").$type<Record<string, any>[]>().notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull(),
    payment: text("payment").notNull(),
    savedAt: timestamp("saved_at", { mode: "string" }).notNull(),
    note: text("note"),
  },
  (t) => ({
    orgIdx: index("held_invoices_org_idx").on(t.organizationId),
  }),
);

export const salesReturns = pgTable(
  "sales_returns",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    ref: text("ref").notNull(),
    saleId: text("sale_id").notNull(),
    customerName: text("customer_name"),
    reason: text("reason").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    stockRestored: boolean("stock_restored").notNull(),
  },
  (t) => ({
    orgIdx: index("sales_returns_org_idx").on(t.organizationId),
    saleIdx: index("sales_returns_sale_idx").on(t.saleId),
  }),
);

export const salesReturnItems = pgTable(
  "sales_return_items",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    returnId: text("return_id")
      .notNull()
      .references(() => salesReturns.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    batchId: text("batch_id"),
  },
  (t) => ({
    orgIdx: index("sales_return_items_org_idx").on(t.organizationId),
    returnIdx: index("sales_return_items_ret_idx").on(t.returnId),
  }),
);

export const purchaseReturns = pgTable("purchase_returns", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  ref: text("ref").notNull(),
  purchaseId: text("purchase_id").notNull(),
  supplier: text("supplier").notNull(),
  reason: text("reason").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  date: timestamp("date", { mode: "string" }).notNull(),
  stockRestored: boolean("stock_restored").notNull().default(false),
});

export const purchaseReturnItems = pgTable(
  "purchase_return_items",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    returnId: text("return_id")
      .notNull()
      .references(() => purchaseReturns.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    batchId: text("batch_id"),
  },
  (t) => ({
    orgIdx: index("purchase_return_items_org_idx").on(t.organizationId),
    returnIdx: index("purchase_return_items_ret_idx").on(t.returnId),
  }),
);

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("locations_org_idx").on(t.organizationId),
  }),
);

export const shifts = pgTable(
  "shifts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    openTime: timestamp("open_time", { mode: "string" }).notNull(),
    closeTime: timestamp("close_time", { mode: "string" }),
    startingCash: numeric("starting_cash", { precision: 12, scale: 2 }).notNull(),
    expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }).notNull(),
    actualCash: numeric("actual_cash", { precision: 12, scale: 2 }),
    difference: numeric("difference", { precision: 12, scale: 2 }),
    status: text("status").notNull(),
    notes: text("notes"),
  },
  (t) => ({
    orgUserIdx: index("shifts_org_user_idx").on(t.organizationId, t.userId),
  }),
);

export const cashMovements = pgTable(
  "cash_movements",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    shiftId: text("shift_id").notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
  },
  (t) => ({
    orgShiftIdx: index("cash_move_org_shift_idx").on(t.organizationId, t.shiftId),
  }),
);

export const customerLedgers = pgTable(
  "customer_ledgers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: text("customer_id").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
    referenceNo: text("reference_no"),
    note: text("note"),
  },
  (t) => ({
    orgCustDateIdx: index("cust_ledg_org_cust_idx").on(t.organizationId, t.customerId, t.date),
  }),
);

export const supplierLedgers = pgTable(
  "supplier_ledgers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    supplierId: text("supplier_id").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
    referenceNo: text("reference_no"),
    note: text("note"),
  },
  (t) => ({
    orgSuppDateIdx: index("supp_ledg_org_supp_idx").on(t.organizationId, t.supplierId, t.date),
  }),
);

export const quotations = pgTable(
  "quotations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    quotationNo: text("quotation_no").notNull(),
    customerId: text("customer_id"),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    date: timestamp("date", { mode: "string" }).notNull(),
    validUntil: timestamp("valid_until", { mode: "string" }).notNull(),
    items: jsonb("items").$type<Record<string, any>[]>().notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountAmt: numeric("discount_amt", { precision: 12, scale: 2 }).notNull(),
    taxAmt: numeric("tax_amt", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
    notes: text("notes"),
  },
  (t) => ({
    orgIdx: index("quotations_org_idx").on(t.organizationId),
  }),
);

export const deliveryChallans = pgTable(
  "delivery_challans",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    challanNo: text("challan_no").notNull(),
    customerId: text("customer_id"),
    customerName: text("customer_name").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    items: jsonb("items").$type<Record<string, any>[]>().notNull(),
    status: text("status").notNull(),
    transportName: text("transport_name"),
    vehicleNo: text("vehicle_no"),
    driverName: text("driver_name"),
    notes: text("notes"),
  },
  (t) => ({
    orgIdx: index("delivery_challans_org_idx").on(t.organizationId),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    isSystem: boolean("is_system").notNull().default(false),
  },
  (t) => ({
    orgIdx: index("accounts_org_idx").on(t.organizationId),
  }),
);

export const vouchers = pgTable(
  "vouchers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    voucherNo: text("voucher_no").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    debitAccountId: text("debit_account_id").notNull(),
    debitAccountName: text("debit_account_name").notNull(),
    creditAccountId: text("credit_account_id").notNull(),
    creditAccountName: text("credit_account_name").notNull(),
    narration: text("narration"),
    reference: text("reference"),
  },
  (t) => ({
    orgDateIdx: index("vouchers_org_date_idx").on(t.organizationId, t.date),
  }),
);

export const repairs = pgTable(
  "repairs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    ticketNo: text("ticket_no").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    deviceName: text("device_name").notNull(),
    serialOrImei: text("serial_or_imei"),
    problemDescription: text("problem_description").notNull(),
    estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }).notNull(),
    advancePaid: numeric("advance_paid", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
    date: timestamp("date", { mode: "string" }).notNull(),
    notes: text("notes"),
  },
  (t) => ({
    orgIdx: index("repairs_org_idx").on(t.organizationId),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    subscriptionNo: text("subscription_no").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    planName: text("plan_name").notNull(),
    billingCycle: text("billing_cycle").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    nextBillingDate: timestamp("next_billing_date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("subscriptions_org_idx").on(t.organizationId),
  }),
);

export const rentals = pgTable(
  "rentals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    rentalNo: text("rental_no").notNull(),
    customerName: text("customer_name").notNull(),
    itemName: text("item_name").notNull(),
    rentStartDate: timestamp("rent_start_date", { mode: "string" }).notNull(),
    expectedReturnDate: timestamp("expected_return_date", { mode: "string" }).notNull(),
    dailyRate: numeric("daily_rate", { precision: 12, scale: 2 }).notNull(),
    securityDeposit: numeric("security_deposit", { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull(),
  },
  (t) => ({
    orgIdx: index("rentals_org_idx").on(t.organizationId),
  }),
);

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  ref: text("ref").notNull(),
  date: timestamp("date", { mode: "string" }).notNull(),
  reason: text("reason").notNull(),
  items: integer("items").notNull(),
  net: numeric("net", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
});

export const inventoryTransfers = pgTable("inventory_transfers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  ref: text("ref").notNull(),
  date: timestamp("date", { mode: "string" }).notNull(),
  destination: text("destination").notNull(),
  items: integer("items").notNull(),
  status: text("status").notNull(),
});

export const loyaltyMembers = pgTable("loyalty_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  points: integer("points").notNull().default(0),
  tier: text("tier").notNull().default("Bronze"),
  joinedAt: timestamp("joined_at", { mode: "string" }).defaultNow().notNull(),
});

// Help Center & Support Data

export const helpArticles = pgTable("help_articles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id), // null = super admin global
  title: text("title").notNull(),
  type: text("type").notNull(), // 'doc' | 'video'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const faqs = pgTable("faqs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id), // null = super admin global
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  subject: text("subject"),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open, in-progress, closed
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// Services & Verticals

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  customerId: text("customer_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  serviceId: text("service_id"),
  serviceName: text("service_name").notNull(),
  staffId: text("staff_id"),
  staffName: text("staff_name"),
  dateTime: text("date_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in-progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(4),
  status: text("status").notNull().default("available"), // available, occupied, reserved
  currentOrderId: text("current_order_id"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const kitchenOrderTickets = pgTable("kitchen_order_tickets", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  tableId: text("table_id"),
  waiterId: text("waiter_id"),
  items: jsonb("items").$type<any[]>().notNull(),
  status: text("status").notNull().default("pending"), // pending, preparing, ready, served
  note: text("note"),
  timestamp: timestamp("timestamp", { mode: "string" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const productInventory = pgTable(
  "product_inventory",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    stock: numeric("stock", { precision: 10, scale: 3 }).notNull().default("0"),
    reorderLevel: numeric("reorder_level", { precision: 10, scale: 3 }).notNull().default("10"),
  },
  (t) => ({
    orgIdx: index("prod_inv_org_idx").on(t.organizationId),
    prodLocIdx: unique("prod_inv_prod_loc_idx").on(t.productId, t.locationId),
  }),
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    image: text("image"),
  },
  (t) => ({
    skuIdx: unique("variant_sku_idx").on(t.sku, t.organizationId),
    barcodeIdx: unique("variant_barcode_idx").on(t.barcode, t.organizationId),
    prodIdx: index("variant_prod_idx").on(t.productId),
  }),
);

export const productVariantAttributes = pgTable(
  "product_variant_attributes",
  {
    id: text("id").primaryKey(),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    variantIdx: index("variant_attr_idx").on(t.variantId),
  }),
);

export const productBundles = pgTable(
  "product_bundles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    bundleProductId: text("bundle_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    componentProductId: text("component_product_id")
      .notNull()
      .references(() => products.id),
    componentVariantId: text("component_variant_id").references(() => productVariants.id),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
  },
  (t) => ({
    bundleIdx: index("bundle_product_idx").on(t.bundleProductId),
    componentIdx: index("bundle_component_idx").on(t.componentProductId),
    orgIdx: index("bundle_org_idx").on(t.organizationId),
  }),
);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => locations.id),
    batchNo: text("batch_no"), // Batch/Lot identification number (generic — not pharmacy-specific)
    expiryDate: timestamp("expiry_date", { mode: "string" }), // Batch-level expiry (pharmacy, grocery, cosmetics, etc.)
    mfgDate: timestamp("mfg_date", { mode: "string" }), // Manufacturing date
    purchaseCost: numeric("purchase_cost", { precision: 10, scale: 2 }).notNull(),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }), // Batch-specific selling price (optional override)
    mrp: numeric("mrp", { precision: 10, scale: 2 }), // Maximum Retail Price (optional, India-specific)
    quantityReceived: numeric("quantity_received", { precision: 10, scale: 3 }).notNull(),
    quantityRemaining: numeric("quantity_remaining", { precision: 10, scale: 3 }).notNull(),
    receivedAt: timestamp("received_at", { mode: "string" }).defaultNow().notNull(),
    purchaseOrderId: text("purchase_order_id"),
    supplierId: text("supplier_id").references(() => suppliers.id), // Which supplier provided this batch
    batchNote: text("batch_note"),
  },
  (t) => ({
    productIdx: index("inv_batch_product_idx").on(t.productId),
    orgIdx: index("inv_batch_org_idx").on(t.organizationId),
    expiryIdx: index("inv_batch_expiry_idx").on(t.organizationId, t.expiryDate),
  }),
);

export const inventoryBatchConsumptions = pgTable(
  "inventory_batch_consumptions",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => inventoryBatches.id, { onDelete: "cascade" }),
    saleId: text("sale_id").references(() => sales.id),
    quantityConsumed: numeric("quantity_consumed", { precision: 10, scale: 3 }).notNull(),
    consumedAt: timestamp("consumed_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => ({
    batchIdx: index("inv_batch_cons_batch_idx").on(t.batchId),
    saleIdx: index("inv_batch_cons_sale_idx").on(t.saleId),
  }),
);

export const productModifiers = pgTable(
  "product_modifiers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Add-ons", "Size", "Crust Type"
    selectionType: text("selection_type").notNull().default("multiple"), // 'single' or 'multiple'
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    orgIdx: index("product_modifiers_org_idx").on(t.organizationId),
    productIdx: index("product_modifiers_product_idx").on(t.productId),
  }),
);

export const productModifierOptions = pgTable(
  "product_modifier_options",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    modifierId: text("modifier_id")
      .notNull()
      .references(() => productModifiers.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Extra Cheese", "Large"
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    orgIdx: index("modifier_options_org_idx").on(t.organizationId),
    modifierIdx: index("modifier_options_modifier_idx").on(t.modifierId),
  }),
);

export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => saasPlans.id),
    utrNumber: text("utr_number").notNull(),
    paymentMethod: text("payment_method").notNull(),
    note: text("note"),
    status: text("status").notNull().default("pending"), // pending, approved, rejected
    amount: numeric("amount", { precision: 12, scale: 2 }),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  },
  (t) => ({
    orgIdx: index("sub_payments_org_idx").on(t.organizationId),
    statusIdx: index("sub_payments_status_idx").on(t.status),
  }),
);

