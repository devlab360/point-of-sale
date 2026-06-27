export type Product = {
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
  status: "active" | "draft" | "archived";
};

const emoji = (e: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text x='50%' y='50%' font-size='44' text-anchor='middle' dominant-baseline='central'>${e}</text></svg>`,
  )}`;

export const categories = [
  { id: "produce", name: "Fresh Produce", color: "oklch(0.72 0.15 145)", count: 84, icon: "🥦" },
  { id: "dairy", name: "Dairy & Eggs", color: "oklch(0.72 0.13 240)", count: 42, icon: "🥛" },
  { id: "bakery", name: "Bakery", color: "oklch(0.75 0.14 70)", count: 36, icon: "🍞" },
  { id: "meat", name: "Meat & Seafood", color: "oklch(0.62 0.22 25)", count: 28, icon: "🥩" },
  { id: "pantry", name: "Pantry Staples", color: "oklch(0.6 0.15 50)", count: 124, icon: "🍚" },
  { id: "beverages", name: "Beverages", color: "oklch(0.65 0.18 290)", count: 96, icon: "🥤" },
  { id: "snacks", name: "Snacks", color: "oklch(0.74 0.16 40)", count: 78, icon: "🍿" },
  { id: "household", name: "Household", color: "oklch(0.6 0.12 200)", count: 52, icon: "🧴" },
];

export const brands = [
  { id: "1", name: "Organic Valley", products: 24 },
  { id: "2", name: "Nestlé", products: 56 },
  { id: "3", name: "Coca-Cola", products: 18 },
  { id: "4", name: "Kellogg's", products: 22 },
  { id: "5", name: "Unilever", products: 41 },
  { id: "6", name: "P&G", products: 33 },
  { id: "7", name: "Local Farms", products: 12 },
];

export const units = [
  { id: "1", name: "Piece", short: "pc" },
  { id: "2", name: "Kilogram", short: "kg" },
  { id: "3", name: "Gram", short: "g" },
  { id: "4", name: "Litre", short: "L" },
  { id: "5", name: "Millilitre", short: "ml" },
  { id: "6", name: "Pack", short: "pk" },
  { id: "7", name: "Dozen", short: "dz" },
];

export const products: Product[] = [
  { id: "p1", name: "Organic Bananas", sku: "PRD-1001", barcode: "8901234500011", category: "Fresh Produce", brand: "Local Farms", unit: "kg", price: 1.99, cost: 1.1, stock: 142, reorderLevel: 30, image: emoji("🍌"), status: "active" },
  { id: "p2", name: "Whole Milk 1L", sku: "PRD-1002", barcode: "8901234500028", category: "Dairy & Eggs", brand: "Organic Valley", unit: "L", price: 2.49, cost: 1.6, stock: 86, reorderLevel: 20, image: emoji("🥛"), status: "active" },
  { id: "p3", name: "Country Sourdough", sku: "PRD-1003", barcode: "8901234500035", category: "Bakery", brand: "Local Farms", unit: "pc", price: 4.5, cost: 2.4, stock: 8, reorderLevel: 12, image: emoji("🥖"), status: "active" },
  { id: "p4", name: "Free-Range Eggs (12)", sku: "PRD-1004", barcode: "8901234500042", category: "Dairy & Eggs", brand: "Organic Valley", unit: "pk", price: 5.2, cost: 3.1, stock: 64, reorderLevel: 15, image: emoji("🥚"), status: "active" },
  { id: "p5", name: "Hass Avocado", sku: "PRD-1005", barcode: "8901234500059", category: "Fresh Produce", brand: "Local Farms", unit: "pc", price: 1.25, cost: 0.6, stock: 210, reorderLevel: 40, image: emoji("🥑"), status: "active" },
  { id: "p6", name: "Espresso Roast 1kg", sku: "PRD-1006", barcode: "8901234500066", category: "Beverages", brand: "Nestlé", unit: "pk", price: 24.9, cost: 14.0, stock: 32, reorderLevel: 10, image: emoji("☕"), status: "active" },
  { id: "p7", name: "Roma Tomatoes", sku: "PRD-1007", barcode: "8901234500073", category: "Fresh Produce", brand: "Local Farms", unit: "kg", price: 3.4, cost: 1.8, stock: 54, reorderLevel: 25, image: emoji("🍅"), status: "active" },
  { id: "p8", name: "Atlantic Salmon Fillet", sku: "PRD-1008", barcode: "8901234500080", category: "Meat & Seafood", brand: "Local Farms", unit: "kg", price: 18.5, cost: 11.2, stock: 14, reorderLevel: 8, image: emoji("🐟"), status: "active" },
  { id: "p9", name: "Basmati Rice 5kg", sku: "PRD-1009", barcode: "8901234500097", category: "Pantry Staples", brand: "Nestlé", unit: "pk", price: 12.99, cost: 7.5, stock: 96, reorderLevel: 20, image: emoji("🍚"), status: "active" },
  { id: "p10", name: "Sparkling Water 12pk", sku: "PRD-1010", barcode: "8901234500103", category: "Beverages", brand: "Coca-Cola", unit: "pk", price: 8.99, cost: 4.8, stock: 4, reorderLevel: 15, image: emoji("💧"), status: "active" },
  { id: "p11", name: "Greek Yogurt 500g", sku: "PRD-1011", barcode: "8901234500110", category: "Dairy & Eggs", brand: "Organic Valley", unit: "pk", price: 4.2, cost: 2.4, stock: 38, reorderLevel: 12, image: emoji("🥣"), status: "active" },
  { id: "p12", name: "Dark Chocolate 70%", sku: "PRD-1012", barcode: "8901234500127", category: "Snacks", brand: "Nestlé", unit: "pc", price: 3.75, cost: 1.9, stock: 120, reorderLevel: 30, image: emoji("🍫"), status: "active" },
  { id: "p13", name: "Olive Oil Extra Virgin", sku: "PRD-1013", barcode: "8901234500134", category: "Pantry Staples", brand: "Unilever", unit: "L", price: 14.5, cost: 8.2, stock: 22, reorderLevel: 10, image: emoji("🫒"), status: "active" },
  { id: "p14", name: "Cheddar Cheese Block", sku: "PRD-1014", barcode: "8901234500141", category: "Dairy & Eggs", brand: "Organic Valley", unit: "kg", price: 9.8, cost: 5.5, stock: 18, reorderLevel: 10, image: emoji("🧀"), status: "active" },
  { id: "p15", name: "Honey Crisp Apples", sku: "PRD-1015", barcode: "8901234500158", category: "Fresh Produce", brand: "Local Farms", unit: "kg", price: 4.99, cost: 2.6, stock: 76, reorderLevel: 25, image: emoji("🍎"), status: "active" },
  { id: "p16", name: "Almond Butter 340g", sku: "PRD-1016", barcode: "8901234500165", category: "Pantry Staples", brand: "Kellogg's", unit: "pc", price: 11.5, cost: 6.8, stock: 28, reorderLevel: 10, image: emoji("🥜"), status: "active" },
  { id: "p17", name: "Sea Salt Chips", sku: "PRD-1017", barcode: "8901234500172", category: "Snacks", brand: "P&G", unit: "pc", price: 2.99, cost: 1.4, stock: 156, reorderLevel: 40, image: emoji("🥔"), status: "active" },
  { id: "p18", name: "Dishwashing Liquid 1L", sku: "PRD-1018", barcode: "8901234500189", category: "Household", brand: "P&G", unit: "L", price: 5.5, cost: 2.8, stock: 64, reorderLevel: 20, image: emoji("🧼"), status: "active" },
  { id: "p19", name: "Pasta Penne 500g", sku: "PRD-1019", barcode: "8901234500196", category: "Pantry Staples", brand: "Nestlé", unit: "pk", price: 2.2, cost: 1.0, stock: 188, reorderLevel: 50, image: emoji("🍝"), status: "active" },
  { id: "p20", name: "Orange Juice 1L", sku: "PRD-1020", barcode: "8901234500202", category: "Beverages", brand: "Coca-Cola", unit: "L", price: 4.8, cost: 2.6, stock: 42, reorderLevel: 15, image: emoji("🍊"), status: "active" },
];

export const customers = [
  { id: "c1", name: "Sarah Jenkins", email: "sarah.j@example.com", phone: "+1 555-0142", visits: 84, totalSpent: 4280.5, loyaltyPoints: 1248, credit: 0, status: "vip" },
  { id: "c2", name: "Marcus Aurelius", email: "marcus@example.com", phone: "+1 555-0193", visits: 42, totalSpent: 2140.0, loyaltyPoints: 612, credit: 120, status: "regular" },
  { id: "c3", name: "Priya Patel", email: "priya.p@example.com", phone: "+1 555-0211", visits: 156, totalSpent: 8920.75, loyaltyPoints: 3120, credit: 0, status: "vip" },
  { id: "c4", name: "Michael Thorne", email: "m.thorne@example.com", phone: "+1 555-0288", visits: 18, totalSpent: 642.3, loyaltyPoints: 184, credit: 0, status: "regular" },
  { id: "c5", name: "Elena Rodriguez", email: "elena.r@example.com", phone: "+1 555-0354", visits: 64, totalSpent: 3140.9, loyaltyPoints: 942, credit: 50, status: "regular" },
  { id: "c6", name: "James O'Connor", email: "james.o@example.com", phone: "+1 555-0411", visits: 8, totalSpent: 220.0, loyaltyPoints: 64, credit: 0, status: "new" },
  { id: "c7", name: "Yuki Tanaka", email: "yuki.t@example.com", phone: "+1 555-0488", visits: 92, totalSpent: 5620.4, loyaltyPoints: 1684, credit: 0, status: "vip" },
];

export const suppliers = [
  { id: "s1", name: "Sunrise Wholesale Co.", contact: "David Park", email: "david@sunrisewh.com", phone: "+1 555-1001", items: 142, balance: 8420 },
  { id: "s2", name: "Green Valley Farms", contact: "Maria Lopez", email: "maria@gvfarms.com", phone: "+1 555-1042", items: 56, balance: 2140 },
  { id: "s3", name: "Coastal Seafood Ltd.", contact: "Robert Kim", email: "robert@coastal.com", phone: "+1 555-1098", items: 32, balance: 0 },
  { id: "s4", name: "Heritage Bakery Supply", contact: "Anna Schmidt", email: "anna@heritage.com", phone: "+1 555-1156", items: 84, balance: 1240 },
  { id: "s5", name: "Pacific Beverages Inc.", contact: "Tom Wright", email: "tom@pacificbev.com", phone: "+1 555-1234", items: 78, balance: 4680 },
];

export const recentSales = Array.from({ length: 14 }).map((_, i) => {
  const cust = customers[i % customers.length];
  return {
    id: `INV-${(98420 - i).toString()}`,
    customer: i % 5 === 4 ? "Walk-in Customer" : cust.name,
    date: new Date(Date.now() - i * 3600 * 1000 * 2).toISOString(),
    items: 2 + (i % 8),
    payment: ["Cash", "Card", "UPI", "Split"][i % 4],
    status: i === 3 ? "refunded" : i === 7 ? "pending" : "completed",
    total: +(18 + i * 14.7 + (i % 3) * 8.3).toFixed(2),
  };
});

export const salesByDay = [
  { day: "Mon", sales: 4200, orders: 92 },
  { day: "Tue", sales: 5100, orders: 108 },
  { day: "Wed", sales: 4600, orders: 96 },
  { day: "Thu", sales: 6800, orders: 142 },
  { day: "Fri", sales: 8400, orders: 184 },
  { day: "Sat", sales: 9600, orders: 212 },
  { day: "Sun", sales: 7200, orders: 156 },
];

export const monthly = [
  { m: "Jan", revenue: 84000, profit: 22400 },
  { m: "Feb", revenue: 92000, profit: 24800 },
  { m: "Mar", revenue: 88000, profit: 23200 },
  { m: "Apr", revenue: 104000, profit: 28600 },
  { m: "May", revenue: 118000, profit: 32400 },
  { m: "Jun", revenue: 126000, profit: 34800 },
  { m: "Jul", revenue: 132000, profit: 36200 },
  { m: "Aug", revenue: 142000, profit: 39800 },
  { m: "Sep", revenue: 138000, profit: 38400 },
  { m: "Oct", revenue: 156000, profit: 43200 },
  { m: "Nov", revenue: 168000, profit: 47600 },
  { m: "Dec", revenue: 184000, profit: 52400 },
];

export const categoryShare = categories.slice(0, 6).map((c, i) => ({
  name: c.name,
  value: [42, 24, 18, 16, 12, 8][i],
  color: c.color,
}));

export const purchases = Array.from({ length: 10 }).map((_, i) => ({
  id: `PO-${(2284 - i).toString()}`,
  supplier: suppliers[i % suppliers.length].name,
  date: new Date(Date.now() - i * 86400 * 1000).toISOString(),
  items: 8 + (i % 12),
  status: ["received", "pending", "partial"][i % 3],
  total: +(1200 + i * 348.5).toFixed(2),
}));

export const expenses = [
  { id: "e1", date: "2026-06-26", category: "Rent", description: "June store rent", amount: 4200, status: "paid" },
  { id: "e2", date: "2026-06-25", category: "Utilities", description: "Electricity & water", amount: 642, status: "paid" },
  { id: "e3", date: "2026-06-24", category: "Salaries", description: "Bi-weekly payroll", amount: 8420, status: "paid" },
  { id: "e4", date: "2026-06-23", category: "Marketing", description: "Local flyer print", amount: 320, status: "pending" },
  { id: "e5", date: "2026-06-22", category: "Maintenance", description: "Freezer repair", amount: 480, status: "paid" },
  { id: "e6", date: "2026-06-21", category: "Supplies", description: "Receipt paper rolls", amount: 86, status: "paid" },
];

export const employees = [
  { id: "u1", name: "Sarah Miller", role: "Store Manager", email: "sarah@grocer.pro", shift: "Day", status: "active" },
  { id: "u2", name: "Carlos Mendez", role: "Cashier", email: "carlos@grocer.pro", shift: "Day", status: "active" },
  { id: "u3", name: "Aisha Khan", role: "Cashier", email: "aisha@grocer.pro", shift: "Evening", status: "active" },
  { id: "u4", name: "David Park", role: "Inventory Lead", email: "david@grocer.pro", shift: "Day", status: "active" },
  { id: "u5", name: "Lin Wei", role: "Accountant", email: "lin@grocer.pro", shift: "Day", status: "on-leave" },
  { id: "u6", name: "Tom Wright", role: "Cashier", email: "tom@grocer.pro", shift: "Night", status: "active" },
];

export const coupons = [
  { code: "WELCOME10", discount: "10%", type: "Percentage", uses: 248, limit: 1000, expires: "2026-08-31", status: "active" },
  { code: "FRESH20", discount: "$20", type: "Fixed", uses: 84, limit: 500, expires: "2026-07-15", status: "active" },
  { code: "WEEKEND5", discount: "5%", type: "Percentage", uses: 612, limit: 2000, expires: "2026-12-31", status: "active" },
  { code: "STUDENT15", discount: "15%", type: "Percentage", uses: 42, limit: 200, expires: "2026-06-30", status: "expiring" },
  { code: "VIP25", discount: "25%", type: "Percentage", uses: 0, limit: 100, expires: "2025-12-31", status: "expired" },
];

export const notifications = [
  { id: "n1", title: "Low stock alert", body: "Sparkling Water 12pk has only 4 units left", time: "2m ago", type: "warning", unread: true },
  { id: "n2", title: "New order received", body: "Walk-in customer placed order #INV-98420", time: "12m ago", type: "info", unread: true },
  { id: "n3", title: "Daily report ready", body: "Yesterday's sales summary is available", time: "1h ago", type: "success", unread: true },
  { id: "n4", title: "Supplier payment due", body: "Sunrise Wholesale Co. invoice due in 3 days", time: "4h ago", type: "warning", unread: false },
  { id: "n5", title: "New customer registered", body: "James O'Connor joined the loyalty program", time: "8h ago", type: "info", unread: false },
];

export const activityLog = [
  { id: "a1", user: "Sarah Miller", action: "updated product", target: "Espresso Roast 1kg", time: "5m ago" },
  { id: "a2", user: "Carlos Mendez", action: "completed sale", target: "INV-98420", time: "12m ago" },
  { id: "a3", user: "David Park", action: "received purchase order", target: "PO-2284", time: "1h ago" },
  { id: "a4", user: "Aisha Khan", action: "processed return", target: "INV-98415", time: "2h ago" },
  { id: "a5", user: "Sarah Miller", action: "added new product", target: "Almond Butter 340g", time: "3h ago" },
  { id: "a6", user: "Tom Wright", action: "applied discount", target: "INV-98410", time: "4h ago" },
];

export const giftCards = [
  { code: "GC-2026-0001", value: 100, balance: 64.5, recipient: "Sarah Jenkins", expires: "2027-06-26", status: "active" },
  { code: "GC-2026-0002", value: 50, balance: 50, recipient: "Marcus Aurelius", expires: "2027-06-26", status: "active" },
  { code: "GC-2026-0003", value: 200, balance: 12.4, recipient: "Priya Patel", expires: "2027-04-12", status: "active" },
  { code: "GC-2026-0004", value: 25, balance: 0, recipient: "Walk-in", expires: "2026-04-01", status: "depleted" },
];

export const promotions = [
  { id: "pr1", name: "Summer Fresh Deal", scope: "Fresh Produce", discount: "Buy 2 Get 1", starts: "2026-06-01", ends: "2026-08-31", status: "active" },
  { id: "pr2", name: "Dairy Bundle", scope: "Dairy & Eggs", discount: "15% off", starts: "2026-06-15", ends: "2026-07-15", status: "active" },
  { id: "pr3", name: "Weekend Bakery", scope: "Bakery", discount: "10% off", starts: "2026-06-20", ends: "2026-06-30", status: "active" },
  { id: "pr4", name: "Back to School", scope: "Snacks", discount: "20% off", starts: "2026-08-01", ends: "2026-09-15", status: "scheduled" },
];
