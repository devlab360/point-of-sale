import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("oklch(0.7 0.1 200)"),
  icon: text("icon").notNull().default("📦"),
  count: integer("count").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  products: integer("products").notNull().default(0),
});

export const units = pgTable("units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  phone: text("phone").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  items: integer("items").notNull().default(0),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").notNull().unique(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  unit: text("unit").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(10),
  image: text("image"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  visits: integer("visits").default(0),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
  loyaltyPoints: integer("loyalty_points").default(0),
  credit: numeric("credit", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("regular"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"), // Storing name directly for walk-in customers
  date: timestamp("date").defaultNow().notNull(),
  items: integer("items").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("completed"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: text("sale_id").notNull().references(() => sales.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey(),
  supplier: text("supplier").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  items: integer("items").notNull(),
  status: text("status").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  action: text("action").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
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
  emailReceiptDefault: boolean("email_receipt_default").notNull().default(true),
  printStoreLogo: boolean("print_store_logo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
