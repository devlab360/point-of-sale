import Dexie, { type Table } from "dexie";

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
  synced?: boolean;
  syncRetryCount?: number;
  orgId?: string;
}

export interface LocalCategory { id: string; orgId?: string; name: string; color: string; icon: string; count: number; }
export interface LocalBrand { id: string; orgId?: string; name: string; products: number; }
export interface LocalUnit { id: string; orgId?: string; name: string; short: string; }
export interface LocalSupplier { id: string; orgId?: string; name: string; contact: string; phone: string; email?: string; balance: number; items: number; }
export interface LocalLocation { id: string; name: string; type: string; status: string; }
export interface LocalPurchase { id: string; supplier: string; date: string | Date; items: number; status: string; total: number; }
export interface LocalInventoryMovement { id?: number; productName: string; action: string; quantity: number; createdAt: string | Date; }
export interface LocalAdjustment { id: string; ref: string; date: string | Date; reason: string; items: number; net: number; status: string; }
export interface LocalTransfer { id: string; ref: string; date: string | Date; destination: string; items: number; status: string; }
export interface LocalExpense { id: string; date: string; category: string; description: string; amount: number; status: string; }
export interface LocalCoupon { id: string; code: string; type: string; discount: number; usageLimit: number; used: number; expires: string; status: string; }
export interface LocalGiftCard { id: string; code: string; balance: number; initialBalance?: number; customer?: string; issued?: string; expires: string; status: string; }
export interface LocalPromotion { id: string; title: string; type: string; value: number; conditions: string; startDate: string; endDate: string; status: string; }
export interface LocalActivity { id: string; user: string; action: string; details: string; timestamp: string; type: string; }
export interface LocalUser { id: string; orgId?: string; name: string; role: string; email: string; lastActive: string; status: string; avatar?: string; phone?: string; location?: string; joined?: string; pin?: string; permissions?: string[]; }
export interface LocalNotification { id: string; title: string; description: string; type: string; timestamp: string; read: boolean; }
export interface LocalInvitation { id: string; orgId: string; token: string; role: string; permissions?: string[]; status: string; createdAt: string; expiresAt: string; }
export interface LocalSetting {
  id: string;
  orgId?: string;
  trialEndsAt?: string;
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
  walletBalance?: number;
  status: string;
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
  paymentMethod: string;
  payments?: { method: string; amount: number }[];
  status: string;
  synced: boolean;
  syncRetryCount?: number;
  saleItems: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
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
  }
}

export const localDb = new POSDatabase();
