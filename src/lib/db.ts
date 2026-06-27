import Dexie, { type Table } from "dexie";
import type { Product } from "./dummy";

export interface LocalCategory { id: string; name: string; color: string; icon: string; count: number; }
export interface LocalBrand { id: string; name: string; products: number; }
export interface LocalUnit { id: string; name: string; short: string; }
export interface LocalSupplier { id: string; name: string; contact: string; phone: string; balance: number; items: number; }
export interface LocalPurchase { id: string; supplier: string; date: string | Date; items: number; status: string; total: number; }
export interface LocalInventoryMovement { id?: number; productName: string; action: string; quantity: number; createdAt: string | Date; }
export interface LocalAdjustment { id: string; ref: string; date: string | Date; reason: string; items: number; net: number; status: string; }
export interface LocalTransfer { id: string; ref: string; date: string | Date; destination: string; items: number; status: string; }
export interface LocalExpense { id: string; date: string; category: string; description: string; amount: number; status: string; }
export interface LocalCoupon { id: string; code: string; type: string; discount: number; usageLimit: number; used: number; expires: string; status: string; }
export interface LocalGiftCard { id: string; code: string; balance: number; customer?: string; issued: string; expires: string; status: string; }
export interface LocalPromotion { id: string; title: string; type: string; value: number; conditions: string; startDate: string; endDate: string; status: string; }
export interface LocalActivity { id: string; user: string; action: string; details: string; timestamp: string; type: string; }
export interface LocalUser { id: string; name: string; role: string; email: string; lastActive: string; status: string; avatar?: string; }
export interface LocalNotification { id: string; title: string; description: string; type: string; timestamp: string; read: boolean; }

export interface LocalCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  visits: number;
  totalSpent: number;
  credit: number;
  status: string;
}

export interface OfflineSale {
  id: string; // uuid
  customerId?: string;
  customerName?: string;
  date: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: string; // 'completed' | 'pending_sync'
  synced: boolean;
  saleItems: {
    productId: string;
    quantity: number;
    price: number;
    total: number;
  }[];
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

  constructor() {
    super("POSDatabase");
    
    // We only index fields we want to query by
    this.version(6).stores({
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
      notifications: "id, read"
    });
  }
}

export const localDb = new POSDatabase();
