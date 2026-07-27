import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

// Product type (was previously imported from dummy.ts which no longer exists)
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  image: string;
  status?: string;
  expiryDate?: string;
  wholesalePrice?: number;
  dealerPrice?: number;
  minWholesaleQty?: number;
  hasSerial?: boolean;
  serials?: string[];
  hasBatch?: boolean;
  batches?: { batchNo: string; expiryDate: string; stock: number }[];
  locationRack?: string;
  locationShelf?: string;
  locationBin?: string;
  synced?: boolean;
  syncRetryCount?: number;
  orgId?: string;
  hsnCode?: string;
  gstRate?: number;
  taxInclusive?: boolean;
}

export interface LocalCategory { id: string; orgId?: string; name: string; color: string; icon: string; count: number; synced?: boolean; syncRetryCount?: number; }
export interface LocalBrand { id: string; orgId?: string; name: string; products: number; synced?: boolean; syncRetryCount?: number; }
export interface LocalUnit { id: string; orgId?: string; name: string; short: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalSupplier { id: string; orgId?: string; name: string; contact: string; phone: string; email?: string; balance: number; items: number; gstin?: string; stateCode?: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalLocation { id: string; name: string; type: string; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalPurchase { 
  id: string; 
  supplierId?: string;
  supplier: string; 
  date: string | Date; 
  invoiceNo?: string;
  items: number; 
  status: string; 
  subtotal?: number;
  discountAmt?: number;
  taxAmt?: number;
  cgstAmt?: number;
  sgstAmt?: number;
  igstAmt?: number;
  total: number; 
  purchaseItems?: { productId: string; productName: string; quantity: number; cost: number; total: number; cgst?: number; sgst?: number; igst?: number }[];
  synced?: boolean;
  syncRetryCount?: number;
}
export interface LocalInventoryMovement { id?: number; productName: string; action: string; quantity: number; createdAt: string | Date; synced?: boolean; syncRetryCount?: number; }
export interface LocalAdjustment { id: string; ref: string; date: string | Date; reason: string; items: number; net: number; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalTransfer { id: string; ref: string; date: string | Date; destination: string; items: number; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalExpense { id: string; date: string; category: string; description: string; amount: number; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalCoupon { id: string; code: string; type: string; discount: number; usageLimit: number; used: number; expires: string; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalGiftCard { id: string; code: string; balance: number; initialBalance?: number; customer?: string; issued?: string; expires: string; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalPromotion { id: string; title: string; type: string; value: number; conditions: string; startDate: string; endDate: string; status: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalActivity { id: string; orgId?: string; user: string; action: string; details?: string; timestamp: string; type?: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalUser { id: string; orgId?: string; name: string; role: string; email: string; lastActive: string; status: string; avatar?: string; phone?: string; location?: string; joined?: string; pin?: string; permissions?: string[]; commissionRate?: number; monthlyTarget?: number; earnedCommission?: number; emailVerified?: boolean; emailVerificationToken?: string; countryCode?: string; timeZone?: string; dateFormat?: string; language?: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalNotification { id: string; orgId?: string; title: string; description?: string; message?: string; type: string; timestamp: string; createdAt?: string; read: boolean; link?: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalInvitation { id: string; orgId: string; token: string; role: string; permissions?: string[]; status: string; createdAt: string; expiresAt: string; synced?: boolean; syncRetryCount?: number; }
export interface LocalSaaSSession { id: string; orgId: string; userId: string; loginAt: string; logoutAt?: string; ipAddress?: string; device?: string; status: "live" | "ended"; synced?: boolean; syncRetryCount?: number; }
export interface LocalOrganization { id: string; name: string; ownerEmail: string; status: "trial" | "active" | "suspended" | string; currentPlanId: string; planExpiryDate: string; syncKey?: string; isOnline: boolean; synced?: boolean; syncRetryCount?: number; }
export interface LocalSubscriptionPlan { 
  id: string; 
  name: string; 
  price: number; 
  features: string[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxBranches: number;
    maxInvoicesPerMonth: number;
  };
  isTrialDefault?: boolean;
  synced?: boolean;
  syncRetryCount?: number;
}

export interface LocalSetting {
  id: string;
  orgId?: string;
  trialEndsAt?: string;
  trialDays?: number;
  subscriptionStatus?: string;
  currencySymbol?: string;
  currencyCode?: string;
  storeName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  standardRate: number;
  reducedRate: number;
  pricesIncludeTax: boolean;
  showTaxBreakdown: boolean;
  headerNote: string;
  footerNote: string;
  emailReceiptDefault: boolean;
  printStoreLogo: boolean;
  logoUrl?: string;
  countryCode?: string;
  timeZone?: string;
  dateFormat?: string;
  language?: string;
  enableGST?: boolean;
  gstin?: string;
  stateCode?: string;
  synced?: boolean;
  syncRetryCount?: number;
  [key: string]: any;
}

export interface LocalCustomer {
  id: string;
  orgId?: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  visits: number;
  totalSpent: number;
  credit: number;
  creditLimit?: number;
  walletBalance?: number;
  status: string;
  type?: "retail" | "wholesale" | "dealer" | "corporate";
  synced?: boolean;
  syncRetryCount?: number;
  gstin?: string;
  stateCode?: string;
}

export interface LocalCustomerLedger {
  id: string;
  orgId?: string;
  customerId: string;
  date: string;
  type: "invoice" | "payment" | "return" | "opening";
  amount: number;
  balanceAfter: number;
  referenceNo?: string;
  note?: string;
  synced?: boolean;
  syncRetryCount?: number;
}

export interface LocalSupplierLedger {
  id: string;
  orgId?: string;
  supplierId: string;
  date: string;
  type: "purchase" | "payment" | "return" | "opening";
  amount: number;
  balanceAfter: number;
  referenceNo?: string;
  note?: string;
  synced?: boolean;
  syncRetryCount?: number;
}

export interface LocalQuotation {
  id: string;
  orgId?: string;
  quotationNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  validUntil: string;
  items: { productId: string; productName: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "converted" | "rejected";
  notes?: string;
}

export interface LocalDeliveryChallan {
  id: string;
  orgId?: string;
  challanNo: string;
  customerId?: string;
  customerName: string;
  date: string;
  items: { productId: string; productName: string; quantity: number; unit: string }[];
  status: "pending" | "delivered" | "invoiced";
  transportName?: string;
  vehicleNo?: string;
  driverName?: string;
  notes?: string;
}

export interface LocalRepairTicket {
  id: string;
  orgId?: string;
  ticketNo: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  serialOrImei?: string;
  problemDescription: string;
  estimatedCost: number;
  advancePaid: number;
  status: "received" | "diagnosing" | "repaired" | "delivered" | "cancelled";
  date: string;
  notes?: string;
}

export interface LocalSubscription {
  id: string;
  orgId?: string;
  subscriptionNo: string;
  customerName: string;
  customerPhone?: string;
  planName: string;
  billingCycle: "monthly" | "weekly" | "yearly";
  amount: number;
  nextBillingDate: string;
  status: "active" | "paused" | "cancelled";
}

export interface LocalRental {
  id: string;
  orgId?: string;
  rentalNo: string;
  customerName: string;
  itemName: string;
  rentStartDate: string;
  expectedReturnDate: string;
  dailyRate: number;
  securityDeposit: number;
  totalAmount: number;
  status: "rented" | "returned" | "overdue";
}

export interface LocalAccount {
  id: string;
  orgId?: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  balance: number;
  isSystem?: boolean;
  synced?: boolean;
  syncRetryCount?: number;
}

export interface LocalVoucher {
  id: string;
  orgId?: string;
  voucherNo: string;
  date: string;
  type: "payment" | "receipt" | "journal" | "contra";
  debitAccountId: string;
  creditAccountId: string;
  debitAccountName: string;
  creditAccountName: string;
  amount: number;
  narration: string;
  synced?: boolean;
  syncRetryCount?: number;
}

export interface OfflineSale {
  id: string;
  orgId?: string;
  customerId?: string;
  customerName?: string;
  date: string;
  items: number;
  total: number;
  subtotal?: number;
  discountAmt?: number;
  taxAmt?: number;
  cgstAmt?: number;
  sgstAmt?: number;
  igstAmt?: number;
  paymentMethod: string;
  payments?: { method: string; amount: number }[];
  salesmanId?: string;
  salesmanName?: string;
  commissionAmt?: number;
  status: string;
  synced: boolean;
  syncRetryCount?: number;
  saleItems: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
    serialNumber?: string;
    batchNo?: string;
  }[];
}

export interface HeldInvoice {
  id: string;
  customerId?: string;
  customerName?: string;
  cart: { id: string; qty: number }[];
  discount: number;
  payment: string;
  savedAt: string;
  note?: string;
}

export interface LocalSaleReturn {
  id: string;
  ref: string;
  saleId: string;
  customerName: string;
  reason: string;
  items: { productId: string; productName: string; quantity: number; price: number; total: number }[];
  total: number;
  status: string;
  date: string;
  stockRestored: boolean;
}

export interface LocalPurchaseReturn {
  id: string;
  ref: string;
  purchaseId: string;
  supplier: string;
  reason: string;
  items: { productId: string; productName: string; quantity: number; cost: number; total: number }[];
  total: number;
  status: string;
  date: string;
  stockRestored: boolean;
}

export interface LocalShift {
  id: string;
  userId: string;
  userName: string;
  openTime: string;
  closeTime?: string;
  startingCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: "open" | "closed";
  notes?: string;
}

export interface LocalCashMovement {
  id: string;
  shiftId: string;
  type: "pay-in" | "pay-out";
  amount: number;
  reason: string;
  timestamp: string;
}

export class POSDatabase extends Dexie {
  products!: Table<Product, string>;
  customers!: Table<LocalCustomer, string>;
  offlineSales!: Table<OfflineSale, string>;
  categories!: Table<LocalCategory, string>;
  brands!: Table<LocalBrand, string>;
  units!: Table<LocalUnit, string>;
  suppliers!: Table<LocalSupplier, string>;
  purchases!: Table<LocalPurchase, string>;
  inventoryMovements!: Table<LocalInventoryMovement, number>;
  adjustments!: Table<LocalAdjustment, string>;
  transfers!: Table<LocalTransfer, string>;
  expenses!: Table<LocalExpense, string>;
  coupons!: Table<LocalCoupon, string>;
  giftCards!: Table<LocalGiftCard, string>;
  promotions!: Table<LocalPromotion, string>;
  activityLog!: Table<LocalActivity, string>;
  users!: Table<LocalUser, string>;
  notifications!: Table<LocalNotification, string>;
  settings!: Table<LocalSetting, string>;
  heldInvoices!: Table<HeldInvoice, string>;
  salesReturns!: Table<LocalSaleReturn, string>;
  purchaseReturns!: Table<LocalPurchaseReturn, string>;
  locations!: Table<LocalLocation, string>;
  shifts!: Table<LocalShift, string>;
  cashMovements!: Table<LocalCashMovement, string>;
  invitations!: Table<LocalInvitation, string>;
  customerLedgers!: Table<LocalCustomerLedger, string>;
  supplierLedgers!: Table<LocalSupplierLedger, string>;
  quotations!: Table<LocalQuotation, string>;
  deliveryChallans!: Table<LocalDeliveryChallan, string>;
  accounts!: Table<LocalAccount, string>;
  vouchers!: Table<LocalVoucher, string>;
  repairs!: Table<LocalRepairTicket, string>;
  subscriptions!: Table<LocalSubscription, string>;
  rentals!: Table<LocalRental, string>;
  saasOrganizations!: Table<LocalOrganization, string>;
  saasPlans!: Table<LocalSubscriptionPlan, string>;
  saasSessions!: Table<LocalSaaSSession, string>;

  constructor() {
    super("POSDatabase");

    this.version(8).stores({
      products: "id, name, sku, barcode, category",
      customers: "id, name, phone",
      offlineSales: "id, status, synced, date",
      categories: "id, name",
      brands: "id, name",
      units: "id, name",
      suppliers: "id, name",
      purchases: "id, supplier, date",
      inventoryMovements: "++id, productName, action",
      adjustments: "id, ref, date",
      transfers: "id, ref, date",
      expenses: "id, date, category",
      coupons: "id, code",
      giftCards: "id, code",
      promotions: "id, status",
      activityLog: "id, timestamp",
      users: "id, role, status",
      notifications: "id, read",
      settings: "id",
    });

    // Version 8: adds heldInvoices, salesReturns, purchaseReturns
    this.version(8).stores({
      products: "id, name, sku, barcode, category",
      customers: "id, name, phone",
      offlineSales: "id, status, synced, date",
      categories: "id, name",
      brands: "id, name",
      units: "id, name",
      suppliers: "id, name",
      purchases: "id, supplier, date",
      inventoryMovements: "++id, productName, action",
      adjustments: "id, ref, date",
      transfers: "id, ref, date",
      expenses: "id, date, category",
      coupons: "id, code",
      giftCards: "id, code",
      promotions: "id, status",
      activityLog: "id, timestamp",
      users: "id, role, status",
      notifications: "id, read",
      settings: "id",
      heldInvoices: "id, savedAt",
      salesReturns: "id, ref, saleId, date, status",
      purchaseReturns: "id, ref, purchaseId, date, status",
    });

    // Version 9: adds locations
    this.version(9).stores({
      products: "id, name, sku, barcode, category",
      customers: "id, name, phone",
      offlineSales: "id, status, synced, date",
      categories: "id, name",
      brands: "id, name",
      units: "id, name",
      suppliers: "id, name",
      purchases: "id, supplier, date",
      inventoryMovements: "++id, productName, action",
      adjustments: "id, ref, date",
      transfers: "id, ref, date",
      expenses: "id, date, category",
      coupons: "id, code",
      giftCards: "id, code",
      promotions: "id, status",
      activityLog: "id, timestamp",
      users: "id, role, status",
      notifications: "id, read",
      settings: "id",
      heldInvoices: "id, savedAt",
      salesReturns: "id, ref, saleId, date, status",
      purchaseReturns: "id, ref, purchaseId, date, status",
      locations: "id, name, type, status",
    });

    // Version 11: adds orgId index to all stores
    this.version(11).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
    });

    // Version 12: adds invitations
    this.version(12).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
    });

    // Version 13: adds customer and supplier ledgers
    this.version(13).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
    });

    // Version 14: adds quotations and delivery challans
    this.version(14).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status, date",
      deliveryChallans: "id, orgId, challanNo, status, date",
    });

    // Version 15: adds accounts and vouchers for financial accounting
    this.version(15).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status, date",
      deliveryChallans: "id, orgId, challanNo, status, date",
      accounts: "id, orgId, code, type",
      vouchers: "id, orgId, voucherNo, type, date",
    });

    // Version 16: adds repairs, subscriptions, rentals
    this.version(16).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status, date",
      deliveryChallans: "id, orgId, challanNo, status, date",
      accounts: "id, orgId, code, type",
      vouchers: "id, orgId, voucherNo, type, date",
      repairs: "id, orgId, ticketNo, status, date",
      subscriptions: "id, orgId, subscriptionNo, status",
      rentals: "id, orgId, rentalNo, status",
    });

    // Version 17: adds indexes for verification tokens
    this.version(17).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email, emailVerificationToken",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status, date",
      deliveryChallans: "id, orgId, challanNo, status, date",
      accounts: "id, orgId, code, type",
      vouchers: "id, orgId, voucherNo, type, date",
      repairs: "id, orgId, ticketNo, status, date",
      subscriptions: "id, orgId, subscriptionNo, status",
      rentals: "id, orgId, rentalNo, status",
    });

    // Version 18: adds GST specific fields (enableGST, hsnCode, cgstAmt etc.)
    // Note: Indexed fields remain the same, just adding a new version for schema changes
    this.version(18).stores({
      products: "id, orgId, name, sku, barcode, category",
      customers: "id, orgId, name, phone",
      offlineSales: "id, orgId, status, synced, date",
      categories: "id, orgId, name",
      brands: "id, orgId, name",
      units: "id, orgId, name",
      suppliers: "id, orgId, name",
      purchases: "id, orgId, supplier, date",
      inventoryMovements: "++id, orgId, productName, action",
      adjustments: "id, orgId, ref, date",
      transfers: "id, orgId, ref, date",
      expenses: "id, orgId, date, category",
      coupons: "id, orgId, code",
      giftCards: "id, orgId, code",
      promotions: "id, orgId, status",
      activityLog: "id, orgId, user, action",
      users: "id, orgId, role, email, emailVerificationToken",
      notifications: "id, orgId, read",
      settings: "id, orgId",
      heldInvoices: "id, orgId, savedAt",
      salesReturns: "id, orgId, ref, date",
      purchaseReturns: "id, orgId, ref, date",
      locations: "id, orgId, name",
      shifts: "id, orgId, userId, status",
      cashMovements: "id, orgId, shiftId, type, timestamp",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status, date",
      deliveryChallans: "id, orgId, challanNo, status, date",
      accounts: "id, orgId, code, type",
      vouchers: "id, orgId, voucherNo, type, date",
      repairs: "id, orgId, ticketNo, status, date",
      subscriptions: "id, customerId, planId, status, nextBilling",
      rentals: "id, customerId, productId, status, returnDate",
    });

    // Version 19: adds SaaS Multi-Tenant Tables
    this.version(19).stores({
      products: "id, name, sku, barcode, category, orgId",
      customers: "id, name, phone, orgId",
      offlineSales: "id, status, synced, date, orgId",
      categories: "id, name, orgId",
      brands: "id, name, orgId",
      units: "id, name, orgId",
      suppliers: "id, name, orgId",
      purchases: "id, supplier, date, orgId",
      inventoryMovements: "++id, productName, action, orgId",
      adjustments: "id, ref, date, orgId",
      transfers: "id, ref, date, orgId",
      expenses: "id, date, category, orgId",
      coupons: "id, code, orgId",
      giftCards: "id, code, orgId",
      promotions: "id, status, orgId",
      activityLog: "id, timestamp, orgId",
      users: "id, role, status, orgId",
      notifications: "id, read, orgId",
      settings: "id, orgId",
      heldInvoices: "id, savedAt, orgId",
      salesReturns: "id, ref, saleId, date, status, orgId",
      purchaseReturns: "id, ref, purchaseId, date, status, orgId",
      locations: "id, name, type, status, orgId",
      shifts: "id, userId, status, orgId",
      cashMovements: "id, shiftId, type, orgId",
      invitations: "id, orgId, token, status",
      customerLedgers: "id, orgId, customerId, date",
      supplierLedgers: "id, orgId, supplierId, date",
      quotations: "id, orgId, quotationNo, status",
      deliveryChallans: "id, orgId, challanNo, status",
      accounts: "id, orgId, type",
      vouchers: "id, orgId, type, date",
      repairs: "id, orgId, customerId, status",
      subscriptions: "id, orgId, customerId, planId, status, nextBilling",
      rentals: "id, orgId, customerId, productId, status, returnDate",
      saasOrganizations: "id, status, currentPlanId",
      saasPlans: "id, name",
      saasSessions: "id, orgId, userId, status"
    });
  }
}

import { PersistStore } from "./session-store";

export const localDb = new POSDatabase();

export async function addSystemNotification(
  title: string,
  description: string,
  type: "info" | "warning" | "success" | "destructive" | string = "info",
  link?: string
) {
  try {
    const orgId = PersistStore.getOrgId() || "default";
    await localDb.notifications.add({
      id: uuidv4(),
      orgId,
      title,
      description,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      link,
      synced: false
    });
  } catch (e) {
    console.error("Failed to add notification:", e);
  }
}
