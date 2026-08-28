import { db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function seedDatabase() {
  console.log("==========================================");
  console.log("🌱 STARTING ONEDESK360 DATABASE SEEDER");
  console.log("==========================================");

  // 1. Seed SaaS Subscription Plans
  console.log("\n1. Seeding SaaS Subscription Plans...");
  const defaultPlans = [
    {
      id: "basic",
      name: "Basic Plan",
      description: "Essential POS capabilities for small single-store retailers",
      type: "standard",
      status: "active",
      currency: "USD",
      price: "19.00",
      monthlyPrice: "19.00",
      yearlyPrice: "190.00",
      features: ["pos", "products", "inventory", "customers", "sales", "reports"],
      menus: ["all"],
      limits: { maxUsers: 3, maxBranches: 1, maxProducts: 1000, maxInvoicesPerMonth: 2000 },
      trialDays: 7,
      isTrialDefault: true,
    },
    {
      id: "standard",
      name: "Standard Plan",
      description: "Full-featured SaaS POS for growing multi-department stores",
      type: "standard",
      status: "active",
      currency: "USD",
      price: "49.00",
      monthlyPrice: "49.00",
      yearlyPrice: "490.00",
      features: [
        "pos",
        "products",
        "inventory",
        "customers",
        "sales",
        "reports",
        "kitchen",
        "services",
        "repairs",
        "rentals",
      ],
      menus: ["all"],
      limits: { maxUsers: 10, maxBranches: 3, maxProducts: 10000, maxInvoicesPerMonth: 10000 },
      trialDays: 7,
      isTrialDefault: false,
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      description: "Unlimited capabilities, multi-branch, and dedicated support",
      type: "standard",
      status: "active",
      currency: "USD",
      price: "99.00",
      monthlyPrice: "99.00",
      yearlyPrice: "990.00",
      features: ["all"],
      menus: ["all"],
      limits: { maxUsers: 100, maxBranches: 50, maxProducts: 100000, maxInvoicesPerMonth: 100000 },
      trialDays: 7,
      isTrialDefault: false,
    },
  ];

  for (const plan of defaultPlans) {
    const existing = await db
      .select()
      .from(schema.saasPlans)
      .where(eq(schema.saasPlans.id, plan.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.saasPlans).values(plan);
      console.log(` - Created Plan: ${plan.name}`);
    } else {
      await db
        .update(schema.saasPlans)
        .set(plan)
        .where(eq(schema.saasPlans.id, plan.id));
      console.log(` - Updated Plan: ${plan.name}`);
    }
  }

  // 2. Seed Super Admin Account
  console.log("\n2. Seeding Super Admin Account...");
  const adminEmail = "admin@superadmin.com";
  const existingSuperAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (!existingSuperAdmin.length) {
    const hashedSuperAdminPassword = await bcrypt.hash("superadmin_password", 10);
    await db.insert(schema.users).values({
      id: uuidv4(),
      name: "Super Administrator",
      email: adminEmail,
      role: "super_admin",
      status: "active",
      pin: hashedSuperAdminPassword,
      permissions: ["all"],
      joined: new Date().toISOString(),
    });
    console.log(` - Super Admin created successfully (${adminEmail} / superadmin_password)`);
  } else {
    console.log(` - Super Admin already exists (${adminEmail})`);
  }

  // 3. Seed Demo Tenant Organization & Owner
  console.log("\n3. Seeding Demo Tenant Organization...");
  const demoOrgId = "demo_flagship_org_1001";
  const demoOwnerEmail = "demo@onedesk360.com";

  const existingOrg = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, demoOrgId))
    .limit(1);

  if (!existingOrg.length) {
    await db.insert(schema.organizations).values({
      id: demoOrgId,
      name: "OneDesk360 Flagship Store",
      ownerEmail: demoOwnerEmail,
      status: "active",
      currentPlanId: "enterprise",
      planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      syncKey: "flagship-sync-key",
      isOnline: true,
    });
    console.log(` - Created Demo Organization: OneDesk360 Flagship Store`);
  }

  // Ensure Organization Settings
  const existingSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.organizationId, demoOrgId))
    .limit(1);

  if (!existingSettings.length) {
    await db.insert(schema.settings).values({
      id: uuidv4(),
      organizationId: demoOrgId,
      storeName: "OneDesk360 Flagship Store",
      currencySymbol: "$",
      currencyCode: "USD",
      taxId: "TAX-99887766",
      subscriptionStatus: "active",
      headerNote: "Welcome to OneDesk360 Store",
      footerNote: "Thank you for shopping with us!",
    });
  }

  // Store Owner Account
  const existingOwner = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, demoOwnerEmail))
    .limit(1);

  const hashedOwnerPassword = await bcrypt.hash("password123", 10);
  if (!existingOwner.length) {
    await db.insert(schema.users).values({
      id: uuidv4(),
      organizationId: demoOrgId,
      name: "Store Owner",
      email: demoOwnerEmail,
      role: "admin",
      status: "active",
      pin: hashedOwnerPassword,
      permissions: ["all"],
      joined: new Date().toISOString(),
    });
    console.log(` - Created Store Owner (${demoOwnerEmail} / password123)`);
  }

  // Cashier Account
  const cashierEmail = "cashier@onedesk360.com";
  const existingCashier = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, cashierEmail))
    .limit(1);

  if (!existingCashier.length) {
    await db.insert(schema.users).values({
      id: uuidv4(),
      organizationId: demoOrgId,
      name: "Alex Cashier",
      email: cashierEmail,
      role: "cashier",
      status: "active",
      pin: hashedOwnerPassword,
      permissions: ["pos", "customers", "sales"],
      joined: new Date().toISOString(),
    });
    console.log(` - Created Cashier Staff (${cashierEmail} / password123)`);
  }

  // 4. Seed Catalog Categories, Brands, and Units
  console.log("\n4. Seeding Categories, Brands, and Units...");
  const categoriesList = [
    { name: "Electronics", count: 10 },
    { name: "Groceries & Pantry", count: 8 },
    { name: "Beverages", count: 6 },
    { name: "Bakery & Snacks", count: 6 },
    { name: "Apparel & Shoes", count: 6 },
    { name: "Personal Care", count: 5 },
  ];

  for (const cat of categoriesList) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.name, cat.name))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.categories).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name: cat.name,
        count: cat.count,
      });
    }
  }

  const brandsList = [
    "Apple",
    "Samsung",
    "Sony",
    "Logitech",
    "JBL",
    "Anker",
    "Canon",
    "Nestle",
    "PepsiCo",
    "Coca-Cola",
    "Nike",
    "Adidas",
    "Levi's",
    "Ray-Ban",
    "Unilever",
    "Oral-B",
    "Colgate",
    "Generic",
  ];

  for (const b of brandsList) {
    const existing = await db
      .select()
      .from(schema.brands)
      .where(eq(schema.brands.name, b))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.brands).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name: b,
        products: 4,
      });
    }
  }

  const unitsList = [
    { name: "Pcs", short: "pcs", allowFractional: false },
    { name: "Kg", short: "kg", allowFractional: true },
    { name: "Liter", short: "L", allowFractional: true },
    { name: "Box", short: "box", allowFractional: false },
    { name: "Pack", short: "pk", allowFractional: false },
  ];

  for (const u of unitsList) {
    const existing = await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.name, u.name))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.units).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name: u.name,
        short: u.short,
        allowFractional: u.allowFractional,
      });
    }
  }

  // 5. Seed 36+ Products with Real High-Res Images
  const allDemoProducts = [
    // --- Electronics & Gadgets ---
    {
      name: "iPhone 15 Pro Max 256GB",
      sku: "SKU-IPH15PM",
      barcode: "194253000101",
      cost: "920.00",
      price: "1199.00",
      stock: "28",
      category: "Electronics",
      brand: "Apple",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      sku: "SKU-SGS24U",
      barcode: "880609000202",
      cost: "980.00",
      price: "1299.00",
      stock: "20",
      category: "Electronics",
      brand: "Samsung",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "MacBook Air 15-inch M3",
      sku: "SKU-MBA15M3",
      barcode: "194253000303",
      cost: "1050.00",
      price: "1299.00",
      stock: "15",
      category: "Electronics",
      brand: "Apple",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Sony WH-1000XM5 Wireless Headphones",
      sku: "SKU-SNYWH5",
      barcode: "454873000404",
      cost: "260.00",
      price: "399.99",
      stock: "35",
      category: "Electronics",
      brand: "Sony",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "iPad Air M2 11-inch",
      sku: "SKU-IPADAIR",
      barcode: "194253000505",
      cost: "450.00",
      price: "599.00",
      stock: "22",
      category: "Electronics",
      brand: "Apple",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Apple Watch Series 9 GPS 45mm",
      sku: "SKU-AWSER9",
      barcode: "194253000606",
      cost: "280.00",
      price: "399.00",
      stock: "40",
      category: "Electronics",
      brand: "Apple",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Logitech MX Master 3S Mouse",
      sku: "SKU-LOGMX3S",
      barcode: "097855000707",
      cost: "65.00",
      price: "99.99",
      stock: "50",
      category: "Electronics",
      brand: "Logitech",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "JBL Flip 6 Waterproof Speaker",
      sku: "SKU-JBLFLP6",
      barcode: "050036000808",
      cost: "80.00",
      price: "129.95",
      stock: "45",
      category: "Electronics",
      brand: "JBL",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Anker 65W GaN Fast Charger",
      sku: "SKU-ANK65W",
      barcode: "194644000909",
      cost: "20.00",
      price: "39.99",
      stock: "85",
      category: "Electronics",
      brand: "Anker",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Canon EOS R50 Mirrorless Camera",
      sku: "SKU-CANR50",
      barcode: "013803001010",
      cost: "510.00",
      price: "679.00",
      stock: "12",
      category: "Electronics",
      brand: "Canon",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
    },

    // --- Groceries & Pantry ---
    {
      name: "Organic Whole Milk 1L",
      sku: "SKU-MILK1L",
      barcode: "012345678901",
      cost: "1.80",
      price: "3.49",
      stock: "120",
      category: "Groceries & Pantry",
      brand: "Generic",
      unit: "Liter",
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Farm Fresh Brown Eggs (12-Pack)",
      sku: "SKU-EGGS12",
      barcode: "012345678902",
      cost: "2.80",
      price: "4.99",
      stock: "80",
      category: "Groceries & Pantry",
      brand: "Generic",
      unit: "Box",
      image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Extra Virgin Olive Oil 500ml",
      sku: "SKU-OILOIL",
      barcode: "012345678903",
      cost: "7.20",
      price: "11.99",
      stock: "60",
      category: "Groceries & Pantry",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Royal Premium Basmati Rice 5kg",
      sku: "SKU-RICE5K",
      barcode: "012345678904",
      cost: "12.00",
      price: "18.50",
      stock: "45",
      category: "Groceries & Pantry",
      brand: "Generic",
      unit: "Kg",
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Nescafe Gold Roast Coffee 200g",
      sku: "SKU-NESCG200",
      barcode: "761303001515",
      cost: "5.20",
      price: "8.99",
      stock: "90",
      category: "Groceries & Pantry",
      brand: "Nestle",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Nutella Hazelnut Spread 350g",
      sku: "SKU-NUTEL350",
      barcode: "009800001616",
      cost: "3.10",
      price: "5.49",
      stock: "75",
      category: "Groceries & Pantry",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80",
    },

    // --- Bakery & Snacks ---
    {
      name: "Artisan Sourdough Bread Loaf",
      sku: "SKU-SOURDOUGH",
      barcode: "012345678907",
      cost: "1.90",
      price: "4.50",
      stock: "35",
      category: "Bakery & Snacks",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "French Butter Croissant (2-Pack)",
      sku: "SKU-CROISS2P",
      barcode: "012345678908",
      cost: "1.50",
      price: "3.99",
      stock: "50",
      category: "Bakery & Snacks",
      brand: "Generic",
      unit: "Pack",
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Dark Chocolate Chunk Cookies 250g",
      sku: "SKU-COOKIES250",
      barcode: "012345678909",
      cost: "2.20",
      price: "4.99",
      stock: "65",
      category: "Bakery & Snacks",
      brand: "Generic",
      unit: "Pack",
      image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Lay's Classic Potato Chips 150g",
      sku: "SKU-LAYS150",
      barcode: "028400002020",
      cost: "1.10",
      price: "2.49",
      stock: "140",
      category: "Bakery & Snacks",
      brand: "PepsiCo",
      unit: "Pack",
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Doritos Nacho Cheese Tortilla Chips 170g",
      sku: "SKU-DORIT170",
      barcode: "028400002121",
      cost: "1.35",
      price: "2.99",
      stock: "110",
      category: "Bakery & Snacks",
      brand: "PepsiCo",
      unit: "Pack",
      image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80",
    },

    // --- Beverages ---
    {
      name: "Coca-Cola Classic 330ml (6-Pack)",
      sku: "SKU-COKE6P",
      barcode: "049000002222",
      cost: "3.20",
      price: "5.99",
      stock: "100",
      category: "Beverages",
      brand: "Coca-Cola",
      unit: "Pack",
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Red Bull Energy Drink 250ml",
      sku: "SKU-REDBULL",
      barcode: "900249002323",
      cost: "1.60",
      price: "2.99",
      stock: "150",
      category: "Beverages",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "San Pellegrino Sparkling Water 750ml",
      sku: "SKU-SANPEL750",
      barcode: "041508002424",
      cost: "1.50",
      price: "3.25",
      stock: "80",
      category: "Beverages",
      brand: "Nestle",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Tropicana 100% Orange Juice 1L",
      sku: "SKU-TROP1L",
      barcode: "048500002525",
      cost: "2.30",
      price: "4.29",
      stock: "60",
      category: "Beverages",
      brand: "PepsiCo",
      unit: "Liter",
      image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Ceremonial Japanese Matcha Green Tea 50g",
      sku: "SKU-MATCHA50",
      barcode: "490130002626",
      cost: "14.00",
      price: "24.99",
      stock: "40",
      category: "Beverages",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
    },

    // --- Apparel & Shoes ---
    {
      name: "Nike Air Max 270 Sneakers",
      sku: "SKU-NK270",
      barcode: "091201002727",
      cost: "85.00",
      price: "159.99",
      stock: "30",
      category: "Apparel & Shoes",
      brand: "Nike",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Adidas Ultraboost Light Running Shoes",
      sku: "SKU-ADUBST",
      barcode: "064000002828",
      cost: "98.00",
      price: "189.99",
      stock: "25",
      category: "Apparel & Shoes",
      brand: "Adidas",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Levi's 501 Original Fit Denim Jeans",
      sku: "SKU-LEV501",
      barcode: "052177002929",
      cost: "38.00",
      price: "79.50",
      stock: "45",
      category: "Apparel & Shoes",
      brand: "Levi's",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Premium Heavyweight Cotton T-Shirt",
      sku: "SKU-TSHIRT",
      barcode: "012345003030",
      cost: "9.50",
      price: "24.99",
      stock: "90",
      category: "Apparel & Shoes",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Ray-Ban Classic Aviator Sunglasses",
      sku: "SKU-RB3025",
      barcode: "805289003131",
      cost: "90.00",
      price: "171.00",
      stock: "35",
      category: "Apparel & Shoes",
      brand: "Ray-Ban",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80",
    },

    // --- Personal Care ---
    {
      name: "Dove Deep Moisture Body Wash 500ml",
      sku: "SKU-DOVE500",
      barcode: "011111003232",
      cost: "3.50",
      price: "6.99",
      stock: "70",
      category: "Personal Care",
      brand: "Unilever",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Nivea Men Deep Clean Face Wash 100ml",
      sku: "SKU-NIVFACE",
      barcode: "400580003333",
      cost: "2.60",
      price: "5.49",
      stock: "85",
      category: "Personal Care",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Oral-B Pro 1000 Electric Toothbrush",
      sku: "SKU-ORALB1K",
      barcode: "069055003434",
      cost: "26.00",
      price: "49.99",
      stock: "40",
      category: "Personal Care",
      brand: "Oral-B",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1559591937-e1032b4b4ffb?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Colgate Total Whitening Toothpaste 150g",
      sku: "SKU-COLG150",
      barcode: "035000003535",
      cost: "1.80",
      price: "3.99",
      stock: "120",
      category: "Personal Care",
      brand: "Colgate",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1559591937-e64e10d32fef?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "CeraVe Hydrating Facial Cleanser 237ml",
      sku: "SKU-CERAVE",
      barcode: "360600003636",
      cost: "8.20",
      price: "14.99",
      stock: "55",
      category: "Personal Care",
      brand: "Generic",
      unit: "Pcs",
      image: "https://images.unsplash.com/photo-1556228722-d9b3be7dd88a?w=600&auto=format&fit=crop&q=80",
    },
  ];

  // 5. Seed 36+ Products with Real High-Res Images for All Organizations
  console.log("\n5. Seeding 36 Rich Products with Images for all organizations...");

  const allOrgs = await db.select().from(schema.organizations);
  const targetOrgs = allOrgs.length > 0 ? allOrgs : [{ id: demoOrgId }];

  for (const org of targetOrgs) {
    const orgId = org.id;

    // Seed categories for this org
    for (const cat of categoriesList) {
      const existing = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, cat.name))
        .limit(1);
      if (!existing.length) {
        await db.insert(schema.categories).values({
          id: uuidv4(),
          organizationId: orgId,
          name: cat.name,
          count: cat.count,
        });
      }
    }

    // Seed brands for this org
    for (const b of brandsList) {
      const existing = await db
        .select()
        .from(schema.brands)
        .where(eq(schema.brands.name, b))
        .limit(1);
      if (!existing.length) {
        await db.insert(schema.brands).values({
          id: uuidv4(),
          organizationId: orgId,
          name: b,
          products: 4,
        });
      }
    }

    // Seed units for this org
    for (const u of unitsList) {
      const existing = await db
        .select()
        .from(schema.units)
        .where(eq(schema.units.name, u.name))
        .limit(1);
      if (!existing.length) {
        await db.insert(schema.units).values({
          id: uuidv4(),
          organizationId: orgId,
          name: u.name,
          short: u.short,
          allowFractional: u.allowFractional,
        });
      }
    }

    // Clear existing products for this org to cleanly seed with fresh images
    await db
      .delete(schema.products)
      .where(eq(schema.products.organizationId, orgId));

    for (const p of allDemoProducts) {
      await db.insert(schema.products).values({
        id: uuidv4(),
        organizationId: orgId,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        cost: p.cost,
        price: p.price,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        image: p.image,
        status: "active",
      });
    }
    console.log(` - Successfully seeded ${allDemoProducts.length} Products for Organization: ${orgId}`);
  }

  // 6. Seed Customers CRM Records
  console.log("\n6. Seeding Customer Records...");
  const demoCustomers = [
    {
      id: uuidv4(),
      organizationId: demoOrgId,
      name: "John Doe (VIP Customer)",
      email: "johndoe@example.com",
      phone: "+1 555-0192",
      creditLimit: "5000.00",
      walletBalance: "250.00",
      currentBalance: "0.00",
    },
    {
      id: uuidv4(),
      organizationId: demoOrgId,
      name: "Sarah Smith",
      email: "sarah@example.com",
      phone: "+1 555-0843",
      creditLimit: "1000.00",
      walletBalance: "50.00",
      currentBalance: "0.00",
    },
    {
      id: uuidv4(),
      organizationId: demoOrgId,
      name: "David Miller",
      email: "david.m@example.com",
      phone: "+1 555-0321",
      creditLimit: "2500.00",
      walletBalance: "120.00",
      currentBalance: "0.00",
    },
  ];

  for (const cust of demoCustomers) {
    const existing = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, cust.email))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.customers).values(cust);
    }
  }
  console.log(" - Demo Customers created/verified.");

  console.log("\n==========================================");
  console.log("✅ ONEDESK360 DATABASE SEEDING COMPLETED (36 PRODUCTS WITH IMAGES)");
  console.log("==========================================");
}

// Execute directly if run via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ DATABASE SEEDER FAILED:", err);
      process.exit(1);
    });
}
