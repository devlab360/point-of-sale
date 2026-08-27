import { db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function seedDatabase() {
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
      console.log(` - Plan already exists: ${plan.name}`);
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

    // Store Settings
    await db.insert(schema.settings).values({
      id: uuidv4(),
      organizationId: demoOrgId,
      storeName: "OneDesk360 Flagship Store",
      currencySymbol: "$",
      currencyCode: "USD",
      taxId: "TAX-99887766",
      subscriptionStatus: "active",
    });

    // Store Owner Account
    const hashedOwnerPassword = await bcrypt.hash("password123", 10);
    const ownerUserId = uuidv4();
    await db.insert(schema.users).values({
      id: ownerUserId,
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

    // Cashier Account
    const cashierUserId = uuidv4();
    await db.insert(schema.users).values({
      id: cashierUserId,
      organizationId: demoOrgId,
      name: "Alex Cashier",
      email: "cashier@onedesk360.com",
      role: "cashier",
      status: "active",
      pin: hashedOwnerPassword,
      permissions: ["pos", "customers", "sales"],
      joined: new Date().toISOString(),
    });
    console.log(` - Created Cashier Staff (cashier@onedesk360.com / password123)`);

    // 4. Seed Catalog Data (Categories, Brands, Units, Products)
    console.log("\n4. Seeding Master Catalog & Products...");
    const categories = ["Electronics", "Groceries", "Beverages", "Apparel", "Services"];
    for (const name of categories) {
      await db.insert(schema.categories).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name,
        count: 5,
      });
    }

    const brands = ["Apple", "Samsung", "Nestle", "Nike", "Generic"];
    for (const name of brands) {
      await db.insert(schema.brands).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name,
        products: 5,
      });
    }

    const unitsList = [
      { name: "Pcs", short: "pcs", allowFractional: false },
      { name: "Kg", short: "kg", allowFractional: true },
      { name: "Liter", short: "L", allowFractional: true },
      { name: "Box", short: "box", allowFractional: false },
    ];
    for (const u of unitsList) {
      await db.insert(schema.units).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name: u.name,
        short: u.short,
        allowFractional: u.allowFractional,
      });
    }

    const demoProducts = [
      {
        name: "iPhone 15 Pro",
        sku: "SKU-IPH15P",
        barcode: "1942530001",
        cost: "850.00",
        price: "1099.00",
        stock: "25",
        category: "Electronics",
        brand: "Apple",
        unit: "Pcs",
      },
      {
        name: "Samsung Galaxy S24",
        sku: "SKU-SGS24",
        barcode: "8806090002",
        cost: "700.00",
        price: "899.00",
        stock: "30",
        category: "Electronics",
        brand: "Samsung",
        unit: "Pcs",
      },
      {
        name: "Organic Whole Milk 1L",
        sku: "SKU-MILK1L",
        barcode: "0123456789",
        cost: "1.50",
        price: "2.99",
        stock: "150",
        category: "Beverages",
        brand: "Generic",
        unit: "Liter",
      },
      {
        name: "Nescafe Classic Coffee 200g",
        sku: "SKU-NES200",
        barcode: "7613030004",
        cost: "4.00",
        price: "6.50",
        stock: "80",
        category: "Groceries",
        brand: "Nestle",
        unit: "Pcs",
      },
      {
        name: "Nike Air Max Sneakers",
        sku: "SKU-NKAMX",
        barcode: "0912010005",
        cost: "65.00",
        price: "120.00",
        stock: "40",
        category: "Apparel",
        brand: "Nike",
        unit: "Pcs",
      },
    ];

    for (const p of demoProducts) {
      await db.insert(schema.products).values({
        id: uuidv4(),
        organizationId: demoOrgId,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        cost: p.cost,
        price: p.price,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        status: "active",
      });
    }
    console.log(` - Created ${demoProducts.length} Demo Products with inventory stock.`);

    // 5. Seed Customer CRM Records
    console.log("\n5. Seeding Customer CRM Records...");
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
    ];

    for (const cust of demoCustomers) {
      await db.insert(schema.customers).values(cust);
    }
    console.log(" - Created Demo Customers");
  } else {
    console.log(" - Demo Organization already exists.");
  }

  console.log("\n==========================================");
  console.log("✅ ONEDESK360 DATABASE SEEDING COMPLETED 100%");
  console.log("==========================================");
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ DATABASE SEEDER FAILED:", err);
  process.exit(1);
});
