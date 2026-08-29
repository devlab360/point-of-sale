import { db } from "./index";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
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

  // 3. Seed Demo Tenant Organizations & Industry Logins
  console.log("\n3. Seeding Demo Tenant Organizations & Industry Logins...");
  const demoOrgId = "demo_flagship_org_1001";
  const hashedDefaultPassword = await bcrypt.hash("password123", 10);

  const INDUSTRY_DEMO_ACCOUNTS = [
    {
      orgId: "demo_flagship_org_1001",
      storeName: "OneDesk360 Flagship Store",
      businessType: "UNIVERSAL",
      ownerName: "Store Owner",
      ownerEmail: "demo@onedesk360.com",
      role: "admin",
      headerNote: "Welcome to OneDesk360 Flagship Universal Store",
    },
    {
      orgId: "demo_org_universal",
      storeName: "OneDesk360 Universal Retail",
      businessType: "UNIVERSAL",
      ownerName: "Universal Store Manager",
      ownerEmail: "universal@onedesk360.com",
      role: "admin",
      headerNote: "Welcome to Universal Multi-Category Store",
    },
    {
      orgId: "demo_org_restaurant",
      storeName: "Bella Vista Bistro & Fine Dining",
      businessType: "RESTAURANT",
      ownerName: "Marco Restaurant Owner",
      ownerEmail: "restaurant@onedesk360.com",
      role: "admin",
      headerNote: "Welcome to Bella Vista Bistro - Dine-in & Kitchen KOT",
    },
    {
      orgId: "demo_org_cafe",
      storeName: "Artisan Roast Coffee & Bakery",
      businessType: "CAFE",
      ownerName: "Chloe Cafe Manager",
      ownerEmail: "cafe@onedesk360.com",
      role: "admin",
      headerNote: "Artisan Roast Cafe - Fast Counter Checkout",
    },
    {
      orgId: "demo_org_salon",
      storeName: "Luxe Glow Salon & Spa",
      businessType: "SALON",
      ownerName: "Elena Salon Director",
      ownerEmail: "salon@onedesk360.com",
      role: "admin",
      headerNote: "Luxe Glow Salon - Appointments & Stylists",
    },
    {
      orgId: "demo_org_barber",
      storeName: "Vintage Razor Barber Club",
      businessType: "BARBER",
      ownerName: "Jackson Master Barber",
      ownerEmail: "barber@onedesk360.com",
      role: "admin",
      headerNote: "Vintage Razor - Barber Queuing & Services",
    },
    {
      orgId: "demo_org_repair",
      storeName: "Precision Electronics & Auto Care",
      businessType: "REPAIR_CENTER",
      ownerName: "David Lead Technician",
      ownerEmail: "repair@onedesk360.com",
      role: "admin",
      headerNote: "Precision Repair - Job Sheets & Diagnostics",
    },
    {
      orgId: "demo_org_mobile_repair",
      storeName: "QuickFix Mobile & Gadget Lab",
      businessType: "MOBILE_REPAIR",
      ownerName: "Sam Gadget Specialist",
      ownerEmail: "mobilerepair@onedesk360.com",
      role: "admin",
      headerNote: "QuickFix Mobile - IMEI Tracking & Repairs",
    },
    {
      orgId: "demo_org_retail",
      storeName: "Urban Vogue Fashion & Apparel",
      businessType: "RETAIL",
      ownerName: "Sophia Retail Manager",
      ownerEmail: "retail@onedesk360.com",
      role: "admin",
      headerNote: "Urban Vogue - Apparel, Sizes & Variants",
    },
    {
      orgId: "demo_org_grocery",
      storeName: "FreshMart Supermarket & Grocery",
      businessType: "GROCERY",
      ownerName: "Oliver Supermarket Lead",
      ownerEmail: "grocery@onedesk360.com",
      role: "admin",
      headerNote: "FreshMart - Barcode Checkout & Batch Expiry",
    },
    {
      orgId: "demo_org_wholesale",
      storeName: "Apex Bulk Wholesale & Distribution",
      businessType: "WHOLESALE",
      ownerName: "Vikram Wholesale Director",
      ownerEmail: "wholesale@onedesk360.com",
      role: "admin",
      headerNote: "Apex Wholesale - Quotations & Delivery Challans",
    },
    {
      orgId: "demo_org_pharmacy",
      storeName: "CarePlus Pharmacy & Healthcare",
      businessType: "PHARMACY",
      ownerName: "Dr. Sarah Pharmacist",
      ownerEmail: "pharmacy@onedesk360.com",
      role: "admin",
      headerNote: "CarePlus Pharmacy - Drug Batches & FEFO Expiry",
    },
  ];

  for (const acc of INDUSTRY_DEMO_ACCOUNTS) {
    // 1. Ensure Organization
    const existingOrg = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, acc.orgId))
      .limit(1);

    if (!existingOrg.length) {
      await db.insert(schema.organizations).values({
        id: acc.orgId,
        name: acc.storeName,
        ownerEmail: acc.ownerEmail,
        status: "active",
        currentPlanId: "enterprise",
        planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        syncKey: `${acc.orgId}-sync-key`,
        isOnline: true,
      });
      console.log(` - Created Demo Organization: ${acc.storeName} (${acc.businessType})`);
    } else {
      await db
        .update(schema.organizations)
        .set({ name: acc.storeName, status: "active", currentPlanId: "enterprise" })
        .where(eq(schema.organizations.id, acc.orgId));
    }

    // 2. Ensure Organization Settings with specific businessType
    const existingSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.organizationId, acc.orgId))
      .limit(1);

    if (!existingSettings.length) {
      await db.insert(schema.settings).values({
        id: uuidv4(),
        organizationId: acc.orgId,
        storeName: acc.storeName,
        businessType: acc.businessType,
        currencySymbol: "$",
        currencyCode: "USD",
        taxId: "TAX-99887766",
        subscriptionStatus: "active",
        headerNote: acc.headerNote,
        footerNote: "Thank you for shopping with us!",
      });
    } else {
      await db
        .update(schema.settings)
        .set({
          storeName: acc.storeName,
          businessType: acc.businessType,
          headerNote: acc.headerNote,
          subscriptionStatus: "active",
        })
        .where(eq(schema.settings.organizationId, acc.orgId));
    }

    // 3. Ensure Owner / Admin User
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, acc.ownerEmail))
      .limit(1);

    if (!existingUser.length) {
      await db.insert(schema.users).values({
        id: uuidv4(),
        organizationId: acc.orgId,
        name: acc.ownerName,
        email: acc.ownerEmail,
        role: "admin",
        status: "active",
        pin: hashedDefaultPassword,
        permissions: ["all"],
        joined: new Date().toISOString(),
      });
      console.log(` - Created Industry Login: ${acc.ownerEmail} / password123 [${acc.businessType}]`);
    } else {
      await db
        .update(schema.users)
        .set({
          organizationId: acc.orgId,
          role: "admin",
          status: "active",
          pin: hashedDefaultPassword,
          permissions: ["all"],
        })
        .where(eq(schema.users.email, acc.ownerEmail));
      console.log(` - Verified Industry Login: ${acc.ownerEmail} / password123 [${acc.businessType}]`);
    }
  }

  // Also seed dedicated Cashier Staff for Flagship Store
  const cashierEmail = "cashier@onedesk360.com";
  const existingCashier = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, cashierEmail))
    .limit(1);

  if (!existingCashier.length) {
    await db.insert(schema.users).values({
      id: uuidv4(),
      organizationId: "demo_flagship_org_1001",
      name: "Alex Cashier",
      email: cashierEmail,
      role: "cashier",
      status: "active",
      pin: hashedDefaultPassword,
      permissions: ["pos", "customers", "sales"],
      joined: new Date().toISOString(),
    });
    console.log(` - Created Cashier Staff (${cashierEmail} / password123)`);
  }

  // 4 & 5. Seed Industry-Specific Categories, Brands, Units & Products
  console.log("\n4 & 5. Seeding Industry-Specific Catalogs for all Organizations...");

  const INDUSTRY_CATALOGS: Record<
    string,
    {
      categories: { name: string; count: number }[];
      brands: string[];
      units: { name: string; short: string; allowFractional: boolean }[];
      products: {
        name: string;
        sku: string;
        barcode: string;
        cost: string;
        price: string;
        stock: string;
        category: string;
        brand: string;
        unit: string;
        image: string;
        batchNumber?: string;
        expiryDate?: string;
      }[];
    }
  > = {
    RESTAURANT: {
      categories: [
        { name: "Appetizers & Starters", count: 2 },
        { name: "Gourmet Pizzas", count: 2 },
        { name: "Pasta & Italian", count: 2 },
        { name: "Signature Steaks & Mains", count: 2 },
        { name: "Desserts", count: 1 },
        { name: "Fine Beverages", count: 2 },
      ],
      brands: ["Chef Signature", "Barilla", "San Pellegrino", "Angus Reserve", "Lavazza"],
      units: [
        { name: "Plate", short: "plt", allowFractional: false },
        { name: "Serving", short: "srv", allowFractional: false },
        { name: "Glass", short: "gls", allowFractional: false },
        { name: "Bottle", short: "btl", allowFractional: false },
      ],
      products: [
        {
          name: "Truffle Parmesan Fries",
          sku: "SKU-REST-01",
          barcode: "201001000001",
          cost: "3.50",
          price: "9.50",
          stock: "95",
          category: "Appetizers & Starters",
          brand: "Chef Signature",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Crispy Calamari Fritti",
          sku: "SKU-REST-02",
          barcode: "201001000002",
          cost: "5.50",
          price: "14.00",
          stock: "70",
          category: "Appetizers & Starters",
          brand: "Chef Signature",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Margherita D.O.P Pizza",
          sku: "SKU-REST-03",
          barcode: "201001000003",
          cost: "4.80",
          price: "16.50",
          stock: "120",
          category: "Gourmet Pizzas",
          brand: "Chef Signature",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Pepperoni Rustica Woodfire Pizza",
          sku: "SKU-REST-04",
          barcode: "201001000004",
          cost: "5.90",
          price: "18.50",
          stock: "110",
          category: "Gourmet Pizzas",
          brand: "Chef Signature",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Truffle Fettuccine Alfredo",
          sku: "SKU-REST-05",
          barcode: "201001000005",
          cost: "6.50",
          price: "21.00",
          stock: "85",
          category: "Pasta & Italian",
          brand: "Barilla",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Slow-Cooked Beef Bolognese",
          sku: "SKU-REST-06",
          barcode: "201001000006",
          cost: "6.00",
          price: "19.50",
          stock: "90",
          category: "Pasta & Italian",
          brand: "Barilla",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "8oz Wagyu Ribeye Steak",
          sku: "SKU-REST-07",
          barcode: "201001000007",
          cost: "18.00",
          price: "44.00",
          stock: "45",
          category: "Signature Steaks & Mains",
          brand: "Angus Reserve",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Grilled Norwegian Atlantic Salmon",
          sku: "SKU-REST-08",
          barcode: "201001000008",
          cost: "11.50",
          price: "28.00",
          stock: "50",
          category: "Signature Steaks & Mains",
          brand: "Chef Signature",
          unit: "Plate",
          image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Tiramisu Classico",
          sku: "SKU-REST-09",
          barcode: "201001000009",
          cost: "3.20",
          price: "10.50",
          stock: "60",
          category: "Desserts",
          brand: "Chef Signature",
          unit: "Serving",
          image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Pinot Noir Reserve Red Wine",
          sku: "SKU-REST-10",
          barcode: "201001000010",
          cost: "14.00",
          price: "42.00",
          stock: "35",
          category: "Fine Beverages",
          brand: "Chef Signature",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "San Pellegrino Sparkling 750ml",
          sku: "SKU-REST-11",
          barcode: "201001000011",
          cost: "1.80",
          price: "6.50",
          stock: "150",
          category: "Fine Beverages",
          brand: "San Pellegrino",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    CAFE: {
      categories: [
        { name: "Hot Specialty Coffee", count: 3 },
        { name: "Cold Brews & Refreshers", count: 2 },
        { name: "Fresh Artisanal Bakery", count: 3 },
        { name: "Gourmet Paninis & Toast", count: 2 },
      ],
      brands: ["Single Origin", "Monin", "Oatly", "Parisian Bakery"],
      units: [
        { name: "Cup", short: "cup", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Glass", short: "gls", allowFractional: false },
        { name: "Pack", short: "pk", allowFractional: false },
      ],
      products: [
        {
          name: "Artisanal Double Espresso",
          sku: "SKU-CAFE-01",
          barcode: "202001000001",
          cost: "0.80",
          price: "3.50",
          stock: "200",
          category: "Hot Specialty Coffee",
          brand: "Single Origin",
          unit: "Cup",
          image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Velvety Flat White Coffee",
          sku: "SKU-CAFE-02",
          barcode: "202001000002",
          cost: "1.10",
          price: "4.75",
          stock: "180",
          category: "Hot Specialty Coffee",
          brand: "Single Origin",
          unit: "Cup",
          image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Caramel Macchiato",
          sku: "SKU-CAFE-03",
          barcode: "202001000003",
          cost: "1.40",
          price: "5.50",
          stock: "160",
          category: "Hot Specialty Coffee",
          brand: "Monin",
          unit: "Cup",
          image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Nitro Cold Brew Reserve",
          sku: "SKU-CAFE-04",
          barcode: "202001000004",
          cost: "1.30",
          price: "5.25",
          stock: "120",
          category: "Cold Brews & Refreshers",
          brand: "Single Origin",
          unit: "Glass",
          image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Iced Vanilla Oat Latte",
          sku: "SKU-CAFE-05",
          barcode: "202001000005",
          cost: "1.50",
          price: "5.75",
          stock: "140",
          category: "Cold Brews & Refreshers",
          brand: "Oatly",
          unit: "Glass",
          image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Butter Flaky Croissant",
          sku: "SKU-CAFE-06",
          barcode: "202001000006",
          cost: "1.00",
          price: "3.95",
          stock: "85",
          category: "Fresh Artisanal Bakery",
          brand: "Parisian Bakery",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Wild Blueberry Muffin",
          sku: "SKU-CAFE-07",
          barcode: "202001000007",
          cost: "1.20",
          price: "4.25",
          stock: "70",
          category: "Fresh Artisanal Bakery",
          brand: "Parisian Bakery",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Cinnamon Swirl Roll",
          sku: "SKU-CAFE-08",
          barcode: "202001000008",
          cost: "1.25",
          price: "4.50",
          stock: "65",
          category: "Fresh Artisanal Bakery",
          brand: "Parisian Bakery",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Smoked Turkey & Pesto Panini",
          sku: "SKU-CAFE-09",
          barcode: "202001000009",
          cost: "3.50",
          price: "9.95",
          stock: "60",
          category: "Gourmet Paninis & Toast",
          brand: "Parisian Bakery",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Sourdough Avocado Toast",
          sku: "SKU-CAFE-10",
          barcode: "202001000010",
          cost: "2.80",
          price: "8.50",
          stock: "50",
          category: "Gourmet Paninis & Toast",
          brand: "Parisian Bakery",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    SALON: {
      categories: [
        { name: "Hair Styling & Cuts", count: 2 },
        { name: "Hair Treatments", count: 2 },
        { name: "Facial & Skincare", count: 1 },
        { name: "Nail Lounge & Spa", count: 1 },
        { name: "Professional Retail Care", count: 3 },
      ],
      brands: ["Kérastase", "Olaplex", "Dermalogica", "OPI", "Moroccanoil"],
      units: [
        { name: "Service", short: "svc", allowFractional: false },
        { name: "Session", short: "ses", allowFractional: false },
        { name: "Bottle", short: "btl", allowFractional: false },
        { name: "Pcs", short: "pcs", allowFractional: false },
      ],
      products: [
        {
          name: "Executive Haircut & Blowdry",
          sku: "SKU-SALON-01",
          barcode: "203001000001",
          cost: "12.00",
          price: "55.00",
          stock: "100",
          category: "Hair Styling & Cuts",
          brand: "Kérastase",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Balayage Color & Toner Session",
          sku: "SKU-SALON-02",
          barcode: "203001000002",
          cost: "45.00",
          price: "220.00",
          stock: "35",
          category: "Hair Styling & Cuts",
          brand: "Kérastase",
          unit: "Session",
          image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Keratin Smoothing Complex Treatment",
          sku: "SKU-SALON-03",
          barcode: "203001000003",
          cost: "35.00",
          price: "180.00",
          stock: "40",
          category: "Hair Treatments",
          brand: "Kérastase",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Olaplex Intensive Repair Treatment",
          sku: "SKU-SALON-04",
          barcode: "203001000004",
          cost: "18.00",
          price: "75.00",
          stock: "60",
          category: "Hair Treatments",
          brand: "Olaplex",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Hydrating Botanical Glow Facial",
          sku: "SKU-SALON-05",
          barcode: "203001000005",
          cost: "16.00",
          price: "85.00",
          stock: "50",
          category: "Facial & Skincare",
          brand: "Dermalogica",
          unit: "Session",
          image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Deluxe Gel Manicure & Pedicure",
          sku: "SKU-SALON-06",
          barcode: "203001000006",
          cost: "14.00",
          price: "65.00",
          stock: "80",
          category: "Nail Lounge & Spa",
          brand: "OPI",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Moroccan Argan Treatment Oil 100ml",
          sku: "SKU-SALON-07",
          barcode: "203001000007",
          cost: "22.00",
          price: "48.00",
          stock: "45",
          category: "Professional Retail Care",
          brand: "Moroccanoil",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1608248597359-0098f9ecfa0f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Olaplex No. 3 Hair Perfector 100ml",
          sku: "SKU-SALON-08",
          barcode: "203001000008",
          cost: "16.00",
          price: "30.00",
          stock: "60",
          category: "Professional Retail Care",
          brand: "Olaplex",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Dermalogica Daily Microfoliant 74g",
          sku: "SKU-SALON-09",
          barcode: "203001000009",
          cost: "32.00",
          price: "65.00",
          stock: "35",
          category: "Professional Retail Care",
          brand: "Dermalogica",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1556228722-d9b3be7dd88a?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    BARBER: {
      categories: [
        { name: "Haircuts & Fades", count: 2 },
        { name: "Beard Grooming & Shaves", count: 2 },
        { name: "Spa & Scalp Care", count: 1 },
        { name: "Styling Products", count: 2 },
      ],
      brands: ["Reuzel", "Proraso", "Uppercut Deluxe", "Wahl"],
      units: [
        { name: "Service", short: "svc", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Bottle", short: "btl", allowFractional: false },
      ],
      products: [
        {
          name: "Executive Skin Fade & Taper",
          sku: "SKU-BARB-01",
          barcode: "204001000001",
          cost: "6.00",
          price: "35.00",
          stock: "100",
          category: "Haircuts & Fades",
          brand: "Wahl",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Classic Scissor Cut & Styling",
          sku: "SKU-BARB-02",
          barcode: "204001000002",
          cost: "5.00",
          price: "30.00",
          stock: "90",
          category: "Haircuts & Fades",
          brand: "Wahl",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Hot Towel Straight Razor Shave",
          sku: "SKU-BARB-03",
          barcode: "204001000003",
          cost: "4.00",
          price: "28.00",
          stock: "80",
          category: "Beard Grooming & Shaves",
          brand: "Proraso",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Beard Sculpting & Razor Line-Up",
          sku: "SKU-BARB-04",
          barcode: "204001000004",
          cost: "3.50",
          price: "22.00",
          stock: "90",
          category: "Beard Grooming & Shaves",
          brand: "Proraso",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Charcoal Detox Scalp & Face Mask",
          sku: "SKU-BARB-05",
          barcode: "204001000005",
          cost: "5.00",
          price: "25.00",
          stock: "50",
          category: "Spa & Scalp Care",
          brand: "Proraso",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1512290900672-1f03f71c4c81?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Reuzel Clay Matte Pomade 113g",
          sku: "SKU-BARB-06",
          barcode: "204001000006",
          cost: "9.00",
          price: "22.00",
          stock: "45",
          category: "Styling Products",
          brand: "Reuzel",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Sandalwood Beard Conditioning Oil 50ml",
          sku: "SKU-BARB-07",
          barcode: "204001000007",
          cost: "8.50",
          price: "24.00",
          stock: "40",
          category: "Styling Products",
          brand: "Proraso",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1608248597359-0098f9ecfa0f?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    REPAIR_CENTER: {
      categories: [
        { name: "Screen & Display Repairs", count: 2 },
        { name: "Battery & Power Services", count: 2 },
        { name: "Diagnostics & Micro-Soldering", count: 1 },
        { name: "Spare Parts & Accessories", count: 3 },
      ],
      brands: ["Apple OEM", "Samsung Parts", "Anker", "iFixit", "Spigen"],
      units: [
        { name: "Service", short: "svc", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Unit", short: "unt", allowFractional: false },
      ],
      products: [
        {
          name: "iPhone 15 Pro OLED Screen Replacement",
          sku: "SKU-REP-01",
          barcode: "205001000001",
          cost: "85.00",
          price: "189.00",
          stock: "25",
          category: "Screen & Display Repairs",
          brand: "Apple OEM",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Samsung S24 Ultra AMOLED Screen Assembly",
          sku: "SKU-REP-02",
          barcode: "205001000002",
          cost: "95.00",
          price: "199.00",
          stock: "20",
          category: "Screen & Display Repairs",
          brand: "Samsung Parts",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "MacBook Pro Battery Cell Replacement",
          sku: "SKU-REP-03",
          barcode: "205001000003",
          cost: "45.00",
          price: "135.00",
          stock: "30",
          category: "Battery & Power Services",
          brand: "Apple OEM",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "iPad Air Battery Replacement Service",
          sku: "SKU-REP-04",
          barcode: "205001000004",
          cost: "30.00",
          price: "89.00",
          stock: "35",
          category: "Battery & Power Services",
          brand: "Apple OEM",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Logic Board Ultrasonic Diagnostic & Clean",
          sku: "SKU-REP-05",
          barcode: "205001000005",
          cost: "20.00",
          price: "120.00",
          stock: "50",
          category: "Diagnostics & Micro-Soldering",
          brand: "iFixit",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "65W GaN Dual USB-C Fast Wall Charger",
          sku: "SKU-REP-06",
          barcode: "205001000006",
          cost: "14.00",
          price: "34.99",
          stock: "70",
          category: "Spare Parts & Accessories",
          brand: "Anker",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "9H Diamond Tempered Glass Protector",
          sku: "SKU-REP-07",
          barcode: "205001000007",
          cost: "2.00",
          price: "14.99",
          stock: "150",
          category: "Spare Parts & Accessories",
          brand: "Spigen",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Precision Multi-Bit Screwdriver Toolkit",
          sku: "SKU-REP-08",
          barcode: "205001000008",
          cost: "15.00",
          price: "39.95",
          stock: "40",
          category: "Spare Parts & Accessories",
          brand: "iFixit",
          unit: "Unit",
          image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    MOBILE_REPAIR: {
      categories: [
        { name: "Screen Replacements", count: 2 },
        { name: "Battery & Charging Ports", count: 2 },
        { name: "Water Damage & Sensors", count: 1 },
        { name: "Accessories & Protection", count: 2 },
      ],
      brands: ["Apple OEM", "Samsung Parts", "Anker", "Spigen"],
      units: [
        { name: "Service", short: "svc", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
      ],
      products: [
        {
          name: "iPhone 14/15 Screen Replacement",
          sku: "SKU-MOB-01",
          barcode: "206001000001",
          cost: "70.00",
          price: "159.00",
          stock: "30",
          category: "Screen Replacements",
          brand: "Apple OEM",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Samsung Galaxy Screen Repair",
          sku: "SKU-MOB-02",
          barcode: "206001000002",
          cost: "80.00",
          price: "169.00",
          stock: "25",
          category: "Screen Replacements",
          brand: "Samsung Parts",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "High-Capacity Phone Battery Replacement",
          sku: "SKU-MOB-03",
          barcode: "206001000003",
          cost: "18.00",
          price: "59.00",
          stock: "50",
          category: "Battery & Charging Ports",
          brand: "Anker",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "USB-C / Lightning Port Flex Replacement",
          sku: "SKU-MOB-04",
          barcode: "206001000004",
          cost: "12.00",
          price: "49.00",
          stock: "40",
          category: "Battery & Charging Ports",
          brand: "Apple OEM",
          unit: "Service",
          image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Shockproof Armor MagSafe Case",
          sku: "SKU-MOB-05",
          barcode: "206001000005",
          cost: "6.00",
          price: "24.99",
          stock: "90",
          category: "Accessories & Protection",
          brand: "Spigen",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Braided 2M Fast-Charging Cable",
          sku: "SKU-MOB-06",
          barcode: "206001000006",
          cost: "4.50",
          price: "16.99",
          stock: "120",
          category: "Accessories & Protection",
          brand: "Anker",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    RETAIL: {
      categories: [
        { name: "Tops & Shirts", count: 2 },
        { name: "Denim & Trousers", count: 2 },
        { name: "Outerwear & Jackets", count: 1 },
        { name: "Footwear & Accessories", count: 2 },
      ],
      brands: ["Ralph Lauren", "Levi's", "Nike", "Zara", "Ray-Ban"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Pair", short: "pr", allowFractional: false },
        { name: "Item", short: "itm", allowFractional: false },
      ],
      products: [
        {
          name: "Slim-Fit Oxford Cotton Shirt",
          sku: "SKU-RET-01",
          barcode: "207001000001",
          cost: "18.00",
          price: "49.00",
          stock: "65",
          category: "Tops & Shirts",
          brand: "Ralph Lauren",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Casual Linen Button-Down Shirt",
          sku: "SKU-RET-02",
          barcode: "207001000002",
          cost: "16.00",
          price: "42.00",
          stock: "55",
          category: "Tops & Shirts",
          brand: "Zara",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Classic 501 Straight Denim Jeans",
          sku: "SKU-RET-03",
          barcode: "207001000003",
          cost: "24.00",
          price: "69.50",
          stock: "80",
          category: "Denim & Trousers",
          brand: "Levi's",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Stretch Chino Trousers Slim",
          sku: "SKU-RET-04",
          barcode: "207001000004",
          cost: "19.00",
          price: "54.00",
          stock: "70",
          category: "Denim & Trousers",
          brand: "Zara",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Genuine Leather Bomber Jacket",
          sku: "SKU-RET-05",
          barcode: "207001000005",
          cost: "75.00",
          price: "189.00",
          stock: "25",
          category: "Outerwear & Jackets",
          brand: "Zara",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Breathable Athletic Running Shoes",
          sku: "SKU-RET-06",
          barcode: "207001000006",
          cost: "42.00",
          price: "110.00",
          stock: "45",
          category: "Footwear & Accessories",
          brand: "Nike",
          unit: "Pair",
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Polarized Aviator Sunglasses",
          sku: "SKU-RET-07",
          barcode: "207001000007",
          cost: "35.00",
          price: "125.00",
          stock: "35",
          category: "Footwear & Accessories",
          brand: "Ray-Ban",
          unit: "Item",
          image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    GROCERY: {
      categories: [
        { name: "Fresh Produce", count: 2 },
        { name: "Farm Dairy & Eggs", count: 2 },
        { name: "Pantry Essentials", count: 2 },
        { name: "Beverages & Snacks", count: 1 },
      ],
      brands: ["Farm Fresh", "Organic Valley", "Nestle", "Tropicana", "Kellogg's"],
      units: [
        { name: "Kg", short: "kg", allowFractional: true },
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Liter", short: "L", allowFractional: true },
        { name: "Pack", short: "pk", allowFractional: false },
      ],
      products: [
        {
          name: "Organic Cavendish Bananas",
          sku: "SKU-GROC-01",
          barcode: "208001000001",
          cost: "0.70",
          price: "1.89",
          stock: "150",
          category: "Fresh Produce",
          brand: "Farm Fresh",
          unit: "Kg",
          image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-BAN-92",
          expiryDate: "2026-09-15",
        },
        {
          name: "Crisp Honeycrisp Gala Apples",
          sku: "SKU-GROC-02",
          barcode: "208001000002",
          cost: "1.20",
          price: "2.99",
          stock: "130",
          category: "Fresh Produce",
          brand: "Farm Fresh",
          unit: "Kg",
          image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-APP-44",
          expiryDate: "2026-09-20",
        },
        {
          name: "Farm Fresh Whole Milk 1 Gallon",
          sku: "SKU-GROC-03",
          barcode: "208001000003",
          cost: "2.10",
          price: "4.49",
          stock: "80",
          category: "Farm Dairy & Eggs",
          brand: "Organic Valley",
          unit: "Liter",
          image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-MLK-81",
          expiryDate: "2026-09-10",
        },
        {
          name: "Grade A Free-Range Brown Eggs 12pk",
          sku: "SKU-GROC-04",
          barcode: "208001000004",
          cost: "2.50",
          price: "5.25",
          stock: "95",
          category: "Farm Dairy & Eggs",
          brand: "Organic Valley",
          unit: "Pack",
          image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-EGG-12",
          expiryDate: "2026-09-25",
        },
        {
          name: "Extra Virgin Spanish Olive Oil 750ml",
          sku: "SKU-GROC-05",
          barcode: "208001000005",
          cost: "7.50",
          price: "14.99",
          stock: "60",
          category: "Pantry Essentials",
          brand: "Farm Fresh",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-OIL-33",
          expiryDate: "2027-06-30",
        },
        {
          name: "Roasted Whole Arabica Beans 1kg",
          sku: "SKU-GROC-06",
          barcode: "208001000006",
          cost: "9.00",
          price: "18.50",
          stock: "55",
          category: "Pantry Essentials",
          brand: "Nestle",
          unit: "Kg",
          image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-COF-09",
          expiryDate: "2027-12-31",
        },
        {
          name: "100% Pure Squeezed Orange Juice 1.5L",
          sku: "SKU-GROC-07",
          barcode: "208001000007",
          cost: "2.20",
          price: "4.99",
          stock: "70",
          category: "Beverages & Snacks",
          brand: "Tropicana",
          unit: "Liter",
          image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-OJ-77",
          expiryDate: "2026-09-18",
        },
      ],
    },

    WHOLESALE: {
      categories: [
        { name: "Bulk Agricultural Sacks", count: 2 },
        { name: "Commercial Oils & Fluids", count: 1 },
        { name: "Industrial Packaging", count: 1 },
        { name: "Office Supplies Bulk", count: 1 },
      ],
      brands: ["Cargill", "International Paper", "PackagingPro", "Commercial Grade"],
      units: [
        { name: "Sack", short: "sck", allowFractional: false },
        { name: "Drum", short: "drm", allowFractional: false },
        { name: "Box", short: "box", allowFractional: false },
        { name: "Pack", short: "pk", allowFractional: false },
      ],
      products: [
        {
          name: "Bulk Granulated White Sugar 50kg Sack",
          sku: "SKU-WS-01",
          barcode: "209001000001",
          cost: "28.00",
          price: "44.00",
          stock: "120",
          category: "Bulk Agricultural Sacks",
          brand: "Cargill",
          unit: "Sack",
          image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Royal Basmati Rice 25kg Woven Bag",
          sku: "SKU-WS-02",
          barcode: "209001000002",
          cost: "22.00",
          price: "36.50",
          stock: "140",
          category: "Bulk Agricultural Sacks",
          brand: "Cargill",
          unit: "Sack",
          image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Commercial Canola Cooking Oil 20L Drum",
          sku: "SKU-WS-03",
          barcode: "209001000003",
          cost: "32.00",
          price: "52.00",
          stock: "75",
          category: "Commercial Oils & Fluids",
          brand: "Commercial Grade",
          unit: "Drum",
          image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Corrugated Shipping Boxes (Bundle of 50)",
          sku: "SKU-WS-04",
          barcode: "209001000004",
          cost: "18.00",
          price: "38.00",
          stock: "90",
          category: "Industrial Packaging",
          brand: "PackagingPro",
          unit: "Pack",
          image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Multipurpose Copy Paper A4 80gsm (10 Reams)",
          sku: "SKU-WS-05",
          barcode: "209001000005",
          cost: "24.00",
          price: "42.00",
          stock: "110",
          category: "Office Supplies Bulk",
          brand: "International Paper",
          unit: "Box",
          image: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },

    PHARMACY: {
      categories: [
        { name: "Prescription & Pain Relief", count: 2 },
        { name: "Antibiotics & Respiratory", count: 2 },
        { name: "Vitamins & Supplements", count: 1 },
        { name: "First Aid & Diagnostics", count: 2 },
      ],
      brands: ["Pfizer", "GSK", "Bayer", "Abbott", "Johnson & Johnson"],
      units: [
        { name: "Box", short: "box", allowFractional: false },
        { name: "Strip", short: "stp", allowFractional: false },
        { name: "Bottle", short: "btl", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
      ],
      products: [
        {
          name: "Paracetamol 500mg Tablets (Box of 20)",
          sku: "SKU-PHARM-01",
          barcode: "210001000001",
          cost: "1.50",
          price: "4.50",
          stock: "250",
          category: "Prescription & Pain Relief",
          brand: "GSK",
          unit: "Box",
          image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-PAR-2401",
          expiryDate: "2027-08-31",
        },
        {
          name: "Amoxicillin 500mg Capsules (Box of 20)",
          sku: "SKU-PHARM-02",
          barcode: "210001000002",
          cost: "4.00",
          price: "12.00",
          stock: "180",
          category: "Antibiotics & Respiratory",
          brand: "Pfizer",
          unit: "Box",
          image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-AMX-9912",
          expiryDate: "2027-11-30",
        },
        {
          name: "Ibuprofen 400mg Film-Coated Caps (Box of 24)",
          sku: "SKU-PHARM-03",
          barcode: "210001000003",
          cost: "2.20",
          price: "6.99",
          stock: "200",
          category: "Prescription & Pain Relief",
          brand: "Bayer",
          unit: "Box",
          image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-IBU-4022",
          expiryDate: "2027-05-31",
        },
        {
          name: "Effervescent Vitamin C 1000mg + Zinc (20 Tabs)",
          sku: "SKU-PHARM-04",
          barcode: "210001000004",
          cost: "3.50",
          price: "9.50",
          stock: "140",
          category: "Vitamins & Supplements",
          brand: "Bayer",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1550572017-ed200f5e5a43?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-VIT-7182",
          expiryDate: "2028-01-31",
        },
        {
          name: "Fast-Acting Bronchial Cough Syrup 150ml",
          sku: "SKU-PHARM-05",
          barcode: "210001000005",
          cost: "3.00",
          price: "8.75",
          stock: "110",
          category: "Antibiotics & Respiratory",
          brand: "Johnson & Johnson",
          unit: "Bottle",
          image: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-CGH-1049",
          expiryDate: "2027-04-30",
        },
        {
          name: "Digital Automatic Blood Pressure Monitor",
          sku: "SKU-PHARM-06",
          barcode: "210001000006",
          cost: "22.00",
          price: "54.00",
          stock: "40",
          category: "First Aid & Diagnostics",
          brand: "Abbott",
          unit: "Piece",
          image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Sterile Adhesive First Aid Kit (100 pcs)",
          sku: "SKU-PHARM-07",
          barcode: "210001000007",
          cost: "4.50",
          price: "12.99",
          stock: "130",
          category: "First Aid & Diagnostics",
          brand: "Johnson & Johnson",
          unit: "Box",
          image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-FAK-3021",
          expiryDate: "2029-12-31",
        },
      ],
    },

    UNIVERSAL: {
      categories: [
        { name: "Electronics", count: 4 },
        { name: "Apparel & Fashion", count: 2 },
        { name: "Home & Lifestyle", count: 2 },
      ],
      brands: ["Apple", "Samsung", "Sony", "Logitech", "Nike", "Levi's"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Box", short: "box", allowFractional: false },
        { name: "Pack", short: "pk", allowFractional: false },
      ],
      products: [
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
          sku: "SKU-SONYXM5",
          barcode: "027242000505",
          cost: "260.00",
          price: "399.00",
          stock: "35",
          category: "Electronics",
          brand: "Sony",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Nike Air Max 270 Black/White",
          sku: "SKU-NAM270",
          barcode: "195244002626",
          cost: "85.00",
          price: "150.00",
          stock: "25",
          category: "Apparel & Fashion",
          brand: "Nike",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Levi's 511 Slim Fit Jeans",
          sku: "SKU-LEV511",
          barcode: "052177002727",
          cost: "35.00",
          price: "69.50",
          stock: "40",
          category: "Apparel & Fashion",
          brand: "Levi's",
          unit: "Pcs",
          image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },
  };

  const allOrgs = await db.select().from(schema.organizations);
  const targetOrgs = allOrgs.length > 0 ? allOrgs : [{ id: demoOrgId }];

  for (const org of targetOrgs) {
    const orgId = org.id;

    // Retrieve the specific industry vertical from store settings
    const settingsRec = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.organizationId, orgId))
      .limit(1);

    const bType = (settingsRec[0]?.businessType as string) || "UNIVERSAL";
    const catalog = INDUSTRY_CATALOGS[bType] || INDUSTRY_CATALOGS.UNIVERSAL;

    // 1. Seed categories for this store's industry
    for (const cat of catalog.categories) {
      const existing = await db
        .select()
        .from(schema.categories)
        .where(
          and(
            eq(schema.categories.organizationId, orgId),
            eq(schema.categories.name, cat.name),
          ),
        )
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

    // 2. Seed brands for this store's industry
    for (const b of catalog.brands) {
      const existing = await db
        .select()
        .from(schema.brands)
        .where(
          and(
            eq(schema.brands.organizationId, orgId),
            eq(schema.brands.name, b),
          ),
        )
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

    // 3. Seed units for this store's industry
    for (const u of catalog.units) {
      const existing = await db
        .select()
        .from(schema.units)
        .where(
          and(
            eq(schema.units.organizationId, orgId),
            eq(schema.units.name, u.name),
          ),
        )
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

    // 4. Seed products tailored to this store's industry
    await db
      .delete(schema.products)
      .where(eq(schema.products.organizationId, orgId));

    for (const p of catalog.products) {
      const prodId = uuidv4();
      await db.insert(schema.products).values({
        id: prodId,
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
        reorderLevel: "5",
        expiryDate: p.expiryDate,
        hasBatch: !!p.batchNumber,
        batches: p.batchNumber
          ? [
              {
                batchNumber: p.batchNumber,
                expiryDate: p.expiryDate,
                stock: Number(p.stock),
              },
            ]
          : null,
      });
    }

    console.log(
      ` - Seeded ${catalog.products.length} [${bType}] Products for Organization: ${"name" in org ? org.name : orgId}`,
    );
  }

  // 6. Seed Customers CRM Records
  console.log("\n6. Seeding Customer Records...");
  const defaultOrgId = "demo_flagship_org_1001";
  const demoCustomers = [
    {
      id: uuidv4(),
      organizationId: defaultOrgId,
      name: "John Doe (VIP Customer)",
      email: "johndoe@example.com",
      phone: "+1 555-0192",
      creditLimit: "5000.00",
      walletBalance: "250.00",
      currentBalance: "0.00",
    },
    {
      id: uuidv4(),
      organizationId: defaultOrgId,
      name: "Sarah Smith",
      email: "sarah@example.com",
      phone: "+1 555-0843",
      creditLimit: "1000.00",
      walletBalance: "50.00",
      currentBalance: "0.00",
    },
    {
      id: uuidv4(),
      organizationId: defaultOrgId,
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
  // 7. Seed Restaurant Tables for Dining Orgs
  console.log("\n7. Seeding Restaurant & Cafe Tables...");
  const tableOrgs = ["demo_flagship_org_1001", "demo_org_restaurant", "demo_org_cafe"];
  for (const tOrg of tableOrgs) {
    const existingTables = await db
      .select()
      .from(schema.restaurantTables)
      .where(eq(schema.restaurantTables.organizationId, tOrg));
    if (existingTables.length === 0) {
      const sampleTables = [
        { name: "Table T-01 (Window)", capacity: 2, status: "available" },
        { name: "Table T-02 (Central)", capacity: 4, status: "available" },
        { name: "Table T-03 (Booth)", capacity: 4, status: "available" },
        { name: "VIP Lounge Table 01", capacity: 8, status: "available" },
        { name: "Patio Table P-01", capacity: 4, status: "available" },
      ];
      for (const t of sampleTables) {
        await db.insert(schema.restaurantTables).values({
          id: uuidv4(),
          organizationId: tOrg,
          name: t.name,
          capacity: t.capacity,
          status: t.status,
        });
      }
      console.log(` - Seeded 5 Restaurant Tables for ${tOrg}`);
    }
  }

  console.log("\n==========================================");
  console.log("✅ ONEDESK360 DATABASE SEEDING COMPLETED FOR ALL INDUSTRY TYPES");
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
