import { db } from "./index";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Deterministic RFC4122 compliant UUID v4 generator for seed records
export function uuidFromSeed(key: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return key;
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = ((h1 >>> 0) + 0x100000000).toString(16).slice(1);
  const p2 = ((h2 >>> 0) + 0x100000000).toString(16).slice(1);
  const p3 = ((((h1 ^ h2) >>> 0) + 0x100000000).toString(16)).slice(1);
  const p4 = ((((h1 + h2) >>> 0) + 0x100000000).toString(16)).slice(1);
  const hex = (p1 + p2 + p3 + p4).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function seedComprehensiveData() {
  console.log("\n==================================================");
  console.log("🚀 SEEDING COMPREHENSIVE DUMMY DATA FOR ALL TABLES");
  console.log("==================================================");

  const orgId = "demo_flagship_org_1001";
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();

  // 1. Locations / Branches
  console.log("\n-> Seeding Locations (Stores & Warehouses)...");
  const locDowntownId = "loc_flagship_downtown";
  const locWarehouseId = "loc_flagship_warehouse";
  const locAirportId = "loc_flagship_airport";

  const locationsToSeed = [
    {
      id: locDowntownId,
      organizationId: orgId,
      name: "Flagship Downtown Store",
      code: "FDS-01",
      type: "store",
      address: "100 Grand Avenue, Financial District",
      phone: "+1 (555) 019-2831",
      isDefault: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: locWarehouseId,
      organizationId: orgId,
      name: "Central Logistics Warehouse",
      code: "CLW-02",
      type: "warehouse",
      address: "450 Industrial Parkway, Dock 12",
      phone: "+1 (555) 019-2832",
      isDefault: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: locAirportId,
      organizationId: orgId,
      name: "Airport Terminal 3 Express",
      code: "ATE-03",
      type: "store",
      address: "Terminal 3 Departure Concourse, Gate 42",
      phone: "+1 (555) 019-2833",
      isDefault: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const loc of locationsToSeed) {
    const existing = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, loc.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.locations).values(loc);
    }
  }

  // 2. Units of Measure
  console.log("-> Seeding Standard Units...");
  const unitsToSeed = [
    { id: "unit_pcs", organizationId: orgId, name: "Piece", short: "PCS", allowFractional: false },
    { id: "unit_kg", organizationId: orgId, name: "Kilogram", short: "KG", allowFractional: true },
    { id: "unit_ltr", organizationId: orgId, name: "Liter", short: "LTR", allowFractional: true },
    { id: "unit_box", organizationId: orgId, name: "Box (Pack)", short: "BOX", allowFractional: false },
    { id: "unit_hr", organizationId: orgId, name: "Hour (Service)", short: "HR", allowFractional: true },
  ];
  for (const u of unitsToSeed) {
    const existing = await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.id, u.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.units).values({ ...u, createdAt: now, updatedAt: now });
    }
  }

  // 3. Tax Masters
  console.log("-> Seeding Standard Tax Slabs...");
  const taxesToSeed = [
    {
      id: "tax_std_18",
      organizationId: orgId,
      name: "GST Standard 18%",
      rate: "18.00",
      taxType: "gst",
      cgstRate: "9.00",
      sgstRate: "9.00",
      isDefault: true,
      status: "active",
      description: "Standard goods and electronics VAT/GST",
    },
    {
      id: "tax_red_5",
      organizationId: orgId,
      name: "Reduced VAT 5%",
      rate: "5.00",
      taxType: "vat",
      isDefault: false,
      status: "active",
      description: "Essential grocery and apparel rate",
    },
    {
      id: "tax_zero_0",
      organizationId: orgId,
      name: "Zero Rated 0%",
      rate: "0.00",
      taxType: "exempt",
      isDefault: false,
      status: "active",
      description: "Tax-exempt services and exports",
    },
  ];
  for (const t of taxesToSeed) {
    const existing = await db
      .select()
      .from(schema.taxMasters)
      .where(eq(schema.taxMasters.id, t.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.taxMasters).values({ ...t, createdAt: now, updatedAt: now });
    }
  }

  // 4. Variant Products & Variants with Multi-Branch Inventory
  console.log("-> Seeding Variant Products (Apparel, Shoes & Tech)...");

  // Product A: Premium Cotton Crewneck T-Shirt (Variants: Black S, Black M, Black L, White M, White L)
  const prodTshirtId = "prod_var_crewneck_tshirt";
  const existingTshirt = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, prodTshirtId))
    .limit(1);

  if (!existingTshirt.length) {
    await db.insert(schema.products).values({
      id: prodTshirtId,
      organizationId: orgId,
      name: "Classic Organic Cotton Crewneck T-Shirt",
      sku: "TSH-CREW-001",
      barcode: "890100100001",
      category: "Apparel",
      brand: "OneDesk Vogue",
      unit: "PCS",
      price: "29.99",
      cost: "11.50",
      stock: "145",
      hasVariants: true,
      trackFifo: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const tshirtVariants = [
      { id: "var_tshirt_blk_s", sku: "TSH-BLK-S", name: "Black / Small", price: "29.99", cost: "11.50", stock: 25, options: { Color: "Black", Size: "S" }, barcode: "890100100011" },
      { id: "var_tshirt_blk_m", sku: "TSH-BLK-M", name: "Black / Medium", price: "29.99", cost: "11.50", stock: 40, options: { Color: "Black", Size: "M" }, barcode: "890100100012" },
      { id: "var_tshirt_blk_l", sku: "TSH-BLK-L", name: "Black / Large", price: "29.99", cost: "11.50", stock: 30, options: { Color: "Black", Size: "L" }, barcode: "890100100013" },
      { id: "var_tshirt_wht_m", sku: "TSH-WHT-M", name: "White / Medium", price: "29.99", cost: "11.50", stock: 25, options: { Color: "White", Size: "M" }, barcode: "890100100014" },
      { id: "var_tshirt_wht_l", sku: "TSH-WHT-L", name: "White / Large", price: "29.99", cost: "11.50", stock: 25, options: { Color: "White", Size: "L" }, barcode: "890100100015" },
    ];

    for (const v of tshirtVariants) {
      await db.insert(schema.productVariants).values({
        id: v.id,
        organizationId: orgId,
        productId: prodTshirtId,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        cost: v.cost,
        createdAt: now,
        updatedAt: now,
      });

      // Insert attributes
      for (const [attrName, attrVal] of Object.entries(v.options)) {
        await db.insert(schema.productVariantAttributes).values({
          id: uuidv4(),
          variantId: v.id,
          name: attrName,
          value: attrVal,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Variant inventory at Downtown store & Warehouse
      const storeQty = Math.floor(v.stock * 0.6);
      const whQty = v.stock - storeQty;

      await db.insert(schema.variantInventory).values([
        {
          id: uuidv4(),
          organizationId: orgId,
          variantId: v.id,
          locationId: locDowntownId,
          stock: storeQty.toString(),
          reorderLevel: "5",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          organizationId: orgId,
          variantId: v.id,
          locationId: locWarehouseId,
          stock: whQty.toString(),
          reorderLevel: "10",
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  }

  // Product B: Ultralight Pro Running Shoes (Variants: Size 40, 41, 42, 43, 44)
  const prodShoesId = "prod_var_ultralight_shoes";
  const existingShoes = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, prodShoesId))
    .limit(1);

  if (!existingShoes.length) {
    await db.insert(schema.products).values({
      id: prodShoesId,
      organizationId: orgId,
      name: "Ultralight Pro Carbon Running Shoes",
      sku: "SHOE-RUN-PRO",
      barcode: "890200200001",
      category: "Footwear",
      brand: "Apex Athletics",
      unit: "PCS",
      price: "129.00",
      cost: "52.00",
      stock: "85",
      hasVariants: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const shoeSizes = ["40", "41", "42", "43", "44"];
    for (const sz of shoeSizes) {
      const vId = `var_shoe_${sz}`;
      await db.insert(schema.productVariants).values({
        id: vId,
        organizationId: orgId,
        productId: prodShoesId,
        name: `Size EU ${sz}`,
        sku: `SHOE-RUN-${sz}`,
        barcode: `8902002000${sz}`,
        price: "129.00",
        cost: "52.00",
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(schema.productVariantAttributes).values({
        id: uuidv4(),
        variantId: vId,
        name: "Size",
        value: sz,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(schema.variantInventory).values({
        id: uuidv4(),
        organizationId: orgId,
        variantId: vId,
        locationId: locDowntownId,
        stock: "10",
        reorderLevel: "3",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Product C: Flagship 5G Smartphone (Variants: 128GB Midnight, 256GB Midnight, 256GB Silver)
  const prodPhoneId = "prod_var_phone_5g";
  const existingPhone = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, prodPhoneId))
    .limit(1);

  if (!existingPhone.length) {
    await db.insert(schema.products).values({
      id: prodPhoneId,
      organizationId: orgId,
      name: "Nexus Nova 5G Flagship Smartphone",
      sku: "PHN-NOVA-5G",
      barcode: "890300300001",
      category: "Electronics",
      brand: "Nexus Tech",
      unit: "PCS",
      price: "799.00",
      cost: "540.00",
      stock: "45",
      hasVariants: true,
      hasSerial: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const phoneVariants = [
      { id: "var_phone_128_blk", name: "128GB / Midnight Black", sku: "NOVA-128-BLK", price: "799.00", cost: "540.00", stock: 15, options: { Storage: "128GB", Color: "Midnight Black" }, barcode: "890300300011" },
      { id: "var_phone_256_blk", name: "256GB / Midnight Black", sku: "NOVA-256-BLK", price: "899.00", cost: "610.00", stock: 20, options: { Storage: "256GB", Color: "Midnight Black" }, barcode: "890300300012" },
      { id: "var_phone_256_slv", name: "256GB / Lunar Silver", sku: "NOVA-256-SLV", price: "899.00", cost: "610.00", stock: 10, options: { Storage: "256GB", Color: "Lunar Silver" }, barcode: "890300300013" },
    ];

    for (const v of phoneVariants) {
      await db.insert(schema.productVariants).values({
        id: v.id,
        organizationId: orgId,
        productId: prodPhoneId,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        cost: v.cost,
        createdAt: now,
        updatedAt: now,
      });

      for (const [attrName, attrVal] of Object.entries(v.options)) {
        await db.insert(schema.productVariantAttributes).values({
          id: uuidv4(),
          variantId: v.id,
          name: attrName,
          value: attrVal,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.insert(schema.variantInventory).values({
        id: uuidv4(),
        organizationId: orgId,
        variantId: v.id,
        locationId: locDowntownId,
        stock: v.stock.toString(),
        reorderLevel: "4",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 5. Service Products for POS (type = "service")
  console.log("-> Seeding Service Products (Diagnostics, Tailoring, Delivery, Cleaning)...");
  const servicesToSeed = [
    {
      id: "srv_device_diagnostic",
      organizationId: orgId,
      name: "Full Hardware Diagnostics & Clean",
      sku: "SRV-DIAG-01",
      barcode: "890900100001",
      category: "Services",
      brand: "OneDesk Services",
      unit: "HR",
      price: "35.00",
      cost: "5.00",
      stock: "9999",
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srv_tailoring_alteration",
      organizationId: orgId,
      name: "Custom Tailoring & Hemming Service",
      sku: "SRV-TAILOR-02",
      barcode: "890900100002",
      category: "Services",
      brand: "OneDesk Services",
      unit: "HR",
      price: "15.00",
      cost: "2.00",
      stock: "9999",
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srv_express_courier",
      organizationId: orgId,
      name: "Express Same-Day Courier Delivery",
      sku: "SRV-EXPRESS-03",
      barcode: "890900100003",
      category: "Services",
      brand: "OneDesk Services",
      unit: "HR",
      price: "12.50",
      cost: "8.00",
      stock: "9999",
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srv_gift_wrapping",
      organizationId: orgId,
      name: "Luxury Satin Gift Wrapping & Box",
      sku: "SRV-WRAP-04",
      barcode: "890900100004",
      category: "Services",
      brand: "OneDesk Services",
      unit: "HR",
      price: "5.00",
      cost: "1.20",
      stock: "9999",
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srv_screen_guard_install",
      organizationId: orgId,
      name: "Tempered Glass Installation & Dust Purge",
      sku: "SRV-GLASS-05",
      barcode: "890900100005",
      category: "Services",
      brand: "OneDesk Services",
      unit: "HR",
      price: "8.00",
      cost: "1.50",
      stock: "9999",
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const srv of servicesToSeed) {
    const existing = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, srv.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.products).values(srv);
    }
  }

  // 6. Product Bundles & Modifiers
  console.log("-> Seeding Product Bundles & Modifiers...");
  const bundleProdId = "prod_bundle_summer_runner";
  const existingBundle = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, bundleProdId))
    .limit(1);

  if (!existingBundle.length) {
    await db.insert(schema.products).values({
      id: bundleProdId,
      organizationId: orgId,
      name: "Summer Runner Starter Bundle",
      sku: "BDL-SUMMER-RUN",
      barcode: "890800800001",
      category: "Bundles",
      brand: "OneDesk",
      unit: "PCS",
      price: "145.00",
      cost: "63.50",
      stock: "20",
      isBundle: true,
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.productBundles).values([
      {
        id: uuidv4(),
        organizationId: orgId,
        bundleProductId: bundleProdId,
        componentProductId: prodShoesId,
        quantity: "1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        organizationId: orgId,
        bundleProductId: bundleProdId,
        componentProductId: prodTshirtId,
        quantity: "1",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  const modGroup1Id = "mod_grp_addons";
  const existingMod = await db
    .select()
    .from(schema.productModifiers)
    .where(eq(schema.productModifiers.id, modGroup1Id))
    .limit(1);

  if (!existingMod.length) {
    await db.insert(schema.productModifiers).values({
      id: modGroup1Id,
      organizationId: orgId,
      productId: prodPhoneId,
      name: "Add-ons & Extended Warranty",
      selectionType: "multiple",
      isRequired: false,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    });

    for (const opt of [
      {
        id: uuidv4(),
        organizationId: orgId,
        modifierId: modGroup1Id,
        name: "Handwritten Greeting Card Tag",
        price: "2.50",
        sortOrder: 1,
      },
      {
        id: uuidv4(),
        organizationId: orgId,
        modifierId: modGroup1Id,
        name: "1-Year Extended Hardware Care",
        price: "29.00",
        sortOrder: 2,
      },
    ]) {
      await db.insert(schema.productModifierOptions).values({
        ...opt,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 7. Suppliers & Supplier Ledgers
  console.log("-> Seeding Suppliers & Khatabook Ledgers...");
  const suppTechId = "supp_apex_technologies";
  const suppApparelId = "supp_vogue_textiles";

  const suppliersToSeed = [
    {
      id: suppTechId,
      organizationId: orgId,
      name: "Apex Global Technology Supplies",
      contact: "Marcus Vance (Chief Account Exec)",
      email: "orders@apextechsupplies.com",
      phone: "+1 (800) 555-9011",
      address: "88 Silicon Park Boulevard, Suite 400",
      balance: "12500.00",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: suppApparelId,
      organizationId: orgId,
      name: "Vogue Fabric Mills & Apparel Co",
      contact: "Elena Rostova (Head of Accounts)",
      email: "accounts@voguemills.com",
      phone: "+1 (800) 555-9012",
      address: "12 Cotton Way, District 4",
      balance: "4200.00",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const supp of suppliersToSeed) {
    const existing = await db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.id, supp.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.suppliers).values(supp);
      await db.insert(schema.supplierLedgers).values({
        id: uuidv4(),
        organizationId: orgId,
        supplierId: supp.id,
        date: yesterday,
        type: "Opening Balance",
        amount: supp.balance,
        balanceAfter: supp.balance,
        referenceNo: "OB-2026-001",
        note: "Audited opening trade balance for fiscal quarter",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 8. Inventory Batches & FIFO Movements
  console.log("-> Seeding FIFO Inventory Batches & Movements...");
  const batch1Id = "batch_nova_q1_2026";
  const existingBatch = await db
    .select()
    .from(schema.inventoryBatches)
    .where(eq(schema.inventoryBatches.id, batch1Id))
    .limit(1);

  if (!existingBatch.length) {
    await db.insert(schema.inventoryBatches).values({
      id: batch1Id,
      organizationId: orgId,
      productId: prodPhoneId,
      locationId: locDowntownId,
      batchNo: "BATCH-NOV-26A",
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      mfgDate: yesterday,
      purchaseCost: "540.00",
      sellingPrice: "799.00",
      mrp: "849.00",
      quantityReceived: "25",
      quantityRemaining: "20",
      receivedAt: yesterday,
      supplierId: suppTechId,
      batchNote: "Initial Q1 Shipment with factory seal",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.inventoryMovements).values([
      {
        organizationId: orgId,
        productId: prodPhoneId,
        locationId: locDowntownId,
        productName: "Nexus Nova 5G Flagship Smartphone",
        action: "purchase",
        quantity: "25",
        createdAt: yesterday,
      },
      {
        organizationId: orgId,
        productId: prodPhoneId,
        locationId: locDowntownId,
        productName: "Nexus Nova 5G Flagship Smartphone",
        action: "pos_sale",
        quantity: "-5",
        createdAt: now,
      },
    ]);
  }

  // 9. Stock Adjustments & Stock Transfers
  console.log("-> Seeding Stock Adjustments & Inter-Branch Transfers...");
  const adj1Id = "adj_demo_audit_surplus";
  const existingAdj = await db
    .select()
    .from(schema.inventoryAdjustments)
    .where(eq(schema.inventoryAdjustments.id, adj1Id))
    .limit(1);

  if (!existingAdj.length) {
    await db.insert(schema.inventoryAdjustments).values({
      id: adj1Id,
      organizationId: orgId,
      ref: "ADJ-260101",
      date: yesterday,
      productId: prodTshirtId,
      productName: "Classic Organic Cotton Crewneck T-Shirt",
      locationId: locDowntownId,
      reason: "Cycle Count Audit: +5 Physical Stock Surplus Discovered",
      items: 1,
      net: "5",
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });
  }

  const xfer1Id = "xfer_demo_wh_to_store";
  const existingXfer = await db
    .select()
    .from(schema.inventoryTransfers)
    .where(eq(schema.inventoryTransfers.id, xfer1Id))
    .limit(1);

  if (!existingXfer.length) {
    await db.insert(schema.inventoryTransfers).values({
      id: xfer1Id,
      organizationId: orgId,
      ref: "TRF-260201",
      date: yesterday,
      productId: prodShoesId,
      productName: "Ultralight Pro Carbon Running Shoes",
      quantity: 15,
      totalAmount: "780.00",
      paidAmount: "780.00",
      paymentMethod: "internal_transfer",
      sourceLocationId: locWarehouseId,
      destinationLocationId: locDowntownId,
      destination: "Flagship Downtown Store",
      items: 1,
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 10. Purchases & Purchase Orders
  console.log("-> Seeding Purchases & Purchase Orders...");
  const purchaseId = "purch_demo_trade_invoice_01";
  const existingPurch = await db
    .select()
    .from(schema.purchases)
    .where(eq(schema.purchases.id, purchaseId))
    .limit(1);

  if (!existingPurch.length) {
    await db.insert(schema.purchases).values({
      id: purchaseId,
      organizationId: orgId,
      supplierId: suppTechId,
      supplier: "Apex Global Technology Supplies",
      date: yesterday,
      invoiceNo: "PINV-2026-8801",
      items: 1,
      total: "13500.00",
      paid: "10000.00",
      due: "3500.00",
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.purchaseItems).values({
      organizationId: orgId,
      purchaseId,
      productId: prodPhoneId,
      productName: "Nexus Nova 5G Flagship Smartphone",
      quantity: "25",
      cost: "540.00",
      total: "13500.00",
      createdAt: now,
      updatedAt: now,
    });

    const pretId = "pret_demo_defective_return";
    await db.insert(schema.purchaseReturns).values({
      id: pretId,
      organizationId: orgId,
      ref: "PRET-2026-001",
      purchaseId,
      supplier: "Apex Global Technology Supplies",
      reason: "Defective packaging on 2 units, returned for replacement",
      total: "1080.00",
      status: "approved",
      date: now,
      stockRestored: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.purchaseReturnItems).values({
      organizationId: orgId,
      returnId: pretId,
      productId: prodPhoneId,
      productName: "Nexus Nova 5G Flagship Smartphone",
      quantity: 2,
      cost: "540.00",
      total: "1080.00",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 11. Customer Records, Credit Balances & Loyalty Ledgers
  console.log("-> Seeding Customer Ledgers & Loyalty Members...");
  const custVipId = "cust_vip_alexandra_stone";
  const existingCust = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, custVipId))
    .limit(1);

  if (!existingCust.length) {
    await db.insert(schema.customers).values({
      id: custVipId,
      organizationId: orgId,
      name: "Lady Alexandra Stone",
      email: "alexandra.stone@example.com",
      phone: "+1 (555) 349-8821",
      address: "742 Evergreen Terrace, Penthouse B",
      city: "Metropolis",
      loyaltyPoints: 480,
      visits: 14,
      totalSpent: "3480.00",
      credit: "450.00",
      creditLimit: "2500.00",
      walletBalance: "150.00",
      status: "active",
      type: "vip",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.loyaltyMembers).values({
      id: uuidv4(),
      organizationId: orgId,
      customerName: "Lady Alexandra Stone",
      phone: "+1 (555) 349-8821",
      points: 480,
      tier: "Platinum",
      joinedAt: yesterday,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.customerLedgers).values({
      id: uuidv4(),
      organizationId: orgId,
      customerId: custVipId,
      date: yesterday,
      type: "Credit Sale (Invoice #INV-9021)",
      amount: "450.00",
      balanceAfter: "450.00",
      referenceNo: "INV-9021",
      note: "Authorized store account credit purchase",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 12. POS Sales & Sales Returns
  console.log("-> Seeding Completed POS Invoices & Sales Returns...");
  const sale1Id = "sale_pos_invoice_1001";
  const existingSale = await db
    .select()
    .from(schema.sales)
    .where(eq(schema.sales.id, sale1Id))
    .limit(1);

  if (!existingSale.length) {
    await db.insert(schema.sales).values({
      id: sale1Id,
      organizationId: orgId,
      customerId: custVipId,
      customerName: "Lady Alexandra Stone",
      date: yesterday,
      items: 2,
      subtotal: "828.99",
      discountAmt: "30.00",
      taxAmt: "45.00",
      total: "843.99",
      paymentMethod: "card",
      status: "completed",
      createdAt: yesterday,
      updatedAt: yesterday,
    });

    await db.insert(schema.saleItems).values([
      {
        organizationId: orgId,
        saleId: sale1Id,
        productId: prodPhoneId,
        variantId: "var_phone_128_blk",
        productName: "Nexus Nova 5G Flagship Smartphone (128GB / Midnight Black)",
        quantity: "1",
        price: "799.00",
        total: "812.00",
        referenceType: "PRODUCT",
        referenceId: prodPhoneId,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
      {
        organizationId: orgId,
        saleId: sale1Id,
        productId: "srv_gift_wrapping",
        productName: "Luxury Satin Gift Wrapping & Box",
        quantity: "1",
        price: "5.00",
        total: "5.00",
        referenceType: "SERVICE",
        referenceId: "srv_gift_wrapping",
        createdAt: yesterday,
        updatedAt: yesterday,
      },
    ]);

    // Sample Return on previous order
    const returnId = "ret_demo_wrong_size";
    await db.insert(schema.salesReturns).values({
      id: returnId,
      organizationId: orgId,
      ref: "RET-2026-001",
      saleId: sale1Id,
      customerName: "Lady Alexandra Stone",
      reason: "Size exchanged for alternate colorway",
      total: "29.99",
      status: "approved",
      date: now,
      stockRestored: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.salesReturnItems).values({
      organizationId: orgId,
      returnId,
      productId: prodTshirtId,
      productName: "Classic Organic Cotton Crewneck T-Shirt",
      quantity: "1",
      price: "29.99",
      total: "29.99",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 13. Quotations & Delivery Challans
  console.log("-> Seeding Quotations & Dispatch Delivery Challans...");
  const quoteId = "quot_corp_outfitting";
  const existingQuote = await db
    .select()
    .from(schema.quotations)
    .where(eq(schema.quotations.id, quoteId))
    .limit(1);

  if (!existingQuote.length) {
    await db.insert(schema.quotations).values({
      id: quoteId,
      organizationId: orgId,
      quotationNo: "QT-2026-0088",
      customerId: custVipId,
      customerName: "Apex Corporate Staff",
      customerPhone: "+1 (555) 349-8821",
      date: now,
      validUntil: nextMonth,
      items: [
        {
          productId: prodTshirtId,
          productName: "Classic Organic Cotton Crewneck T-Shirt",
          quantity: 100,
          price: 29.99,
          discount: 200.0,
          tax: 140.0,
          total: 2939.0,
        },
      ],
      subtotal: "2999.00",
      discountAmt: "200.00",
      taxAmt: "140.00",
      total: "2939.00",
      status: "sent",
      notes: "Corporate uniform apparel quotation with bulk tiered rebate",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.deliveryChallans).values({
      id: uuidv4(),
      organizationId: orgId,
      challanNo: "DC-2026-041",
      date: now,
      customerId: custVipId,
      customerName: "Apex Corporate Staff",
      transportName: "Blue Dart Road Express",
      vehicleNo: "NY-TRK-9821",
      driverName: "Sam Porter",
      notes: "Fragile apparel boxes. Inspect seal on arrival.",
      items: [
        { productName: "Classic Organic Cotton Crewneck T-Shirt", quantity: 50, unit: "PCS" },
      ],
      status: "in_transit",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 14. Cashier Shifts & Held Invoices
  console.log("-> Seeding Cashier Shifts & Held Carts for POS...");
  const shiftId = "shift_demo_current_morning";
  const existingShift = await db
    .select()
    .from(schema.shifts)
    .where(eq(schema.shifts.id, shiftId))
    .limit(1);

  if (!existingShift.length) {
    await db.insert(schema.shifts).values({
      id: shiftId,
      organizationId: orgId,
      userId: "demo_user_cashier",
      userName: "Sarah Jenkins (Senior Cashier)",
      openTime: yesterday,
      startingCash: "200.00",
      expectedCash: "680.50",
      actualCash: "680.50",
      difference: "0.00",
      status: "open",
      notes: "Morning till shift running normally",
      createdAt: yesterday,
      updatedAt: now,
    });

    await db.insert(schema.heldInvoices).values({
      id: uuidv4(),
      organizationId: orgId,
      customerId: custVipId,
      customerName: "Walk-in Guest",
      cart: [
        {
          id: prodTshirtId,
          name: "Classic Organic Cotton Crewneck T-Shirt",
          price: 29.99,
          quantity: 2,
        },
      ],
      discount: "0.00",
      payment: "cash",
      savedAt: now,
      note: "Customer stepped to ATM to grab cash float",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 15. Coupons, Gift Cards & Promotions
  console.log("-> Seeding Coupons, Gift Cards & Promotional Rules...");
  const promoCoupons = [
    { code: "WELCOME10", type: "percentage", discount: "10.00", usageLimit: 500, used: 14, status: "active" },
    { code: "FLAT50", type: "fixed", discount: "50.00", usageLimit: 100, used: 8, status: "active" },
    { code: "VIP25", type: "percentage", discount: "25.00", usageLimit: 50, used: 3, status: "active" },
  ];
  for (const c of promoCoupons) {
    const existing = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.code, c.code))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.coupons).values({
        id: uuidv4(),
        organizationId: orgId,
        code: c.code,
        type: c.type,
        discount: c.discount,
        usageLimit: c.usageLimit,
        used: c.used,
        expires: nextMonth,
        status: c.status,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const giftCardsToSeed = [
    { code: "GC-2026-GOLD-100", balance: "100.00", initialBalance: "100.00", customer: "Lady Alexandra Stone" },
    { code: "GC-2026-SILVER-50", balance: "35.50", initialBalance: "50.00", customer: "Marcus Vance" },
  ];
  for (const gc of giftCardsToSeed) {
    const existing = await db
      .select()
      .from(schema.giftCards)
      .where(eq(schema.giftCards.code, gc.code))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.giftCards).values({
        id: uuidv4(),
        organizationId: orgId,
        code: gc.code,
        balance: gc.balance,
        initialBalance: gc.initialBalance,
        customer: gc.customer,
        issued: yesterday,
        expires: nextMonth,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const existingPromo = await db
    .select()
    .from(schema.promotions)
    .where(eq(schema.promotions.organizationId, orgId))
    .limit(1);
  if (!existingPromo.length) {
    await db.insert(schema.promotions).values({
      id: uuidv4(),
      organizationId: orgId,
      title: "Weekend Mega Flash Sale: 15% Off Apparels",
      type: "percentage",
      value: "15.00",
      conditions: "min_spend: 50, max_discount: 100",
      startDate: yesterday,
      endDate: nextMonth,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 16. Financial Accounts, Vouchers & Store Expenses
  console.log("-> Seeding Chart of Accounts, Vouchers & Store Expenses...");
  const accountsToSeed = [
    { code: "1001", name: "Store Cash on Hand / Cashier Drawer", type: "asset", balance: "2450.00", isSystem: true },
    { code: "1002", name: "Primary Commercial Bank Account", type: "asset", balance: "48920.00", isSystem: true },
    { code: "1003", name: "Accounts Receivable (Customer Due)", type: "asset", balance: "450.00", isSystem: true },
    { code: "1004", name: "Merchandise Inventory Valuated", type: "asset", balance: "18500.00", isSystem: true },
    { code: "2001", name: "Accounts Payable (Trade Suppliers)", type: "liability", balance: "16700.00", isSystem: true },
    { code: "4001", name: "Gross Sales POS Revenue", type: "income", balance: "843.99", isSystem: true },
    { code: "5001", name: "Cost of Goods Sold (COGS)", type: "expense", balance: "540.00", isSystem: true },
    { code: "5002", name: "Store Rent & Facility Lease", type: "expense", balance: "2800.00", isSystem: true },
    { code: "5003", name: "Staff Payroll & Overtime", type: "expense", balance: "4200.00", isSystem: true },
  ];

  for (const acc of accountsToSeed) {
    const existing = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.code, acc.code))
      .limit(1);
    if (!existing.length) {
      await db.insert(schema.accounts).values({
        id: uuidv4(),
        organizationId: orgId,
        ...acc,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const existingExpenses = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.organizationId, orgId))
    .limit(1);
  if (!existingExpenses.length) {
    await db.insert(schema.expenses).values([
      { id: uuidv4(), organizationId: orgId, date: yesterday, category: "Rent & Utilities", description: "Monthly retail store space lease payment", amount: "2800.00", status: "approved", createdAt: now, updatedAt: now },
      { id: uuidv4(), organizationId: orgId, date: now, category: "High-Speed Internet & POS Cellular", description: "Broadband terminal backup link", amount: "120.00", status: "approved", createdAt: now, updatedAt: now },
    ]);
  }

  // 17. Kitchen Order Tickets (KOT) & Restaurant Dining Tables
  console.log("-> Seeding Restaurant Dining KOTs...");
  const existingKOT = await db
    .select()
    .from(schema.kitchenOrderTickets)
    .where(eq(schema.kitchenOrderTickets.organizationId, orgId))
    .limit(1);

  if (!existingKOT.length) {
    await db.insert(schema.kitchenOrderTickets).values([
      {
        id: uuidv4(),
        organizationId: orgId,
        tableId: "Table T-01",
        waiterId: "demo_user_cashier",
        status: "preparing",
        note: "Allergies: No peanuts. Extra napkins.",
        items: [
          { name: "Espresso Doppio", qty: 2, note: "Oat milk" },
          { name: "Avocado Sourdough Toast", qty: 1, note: "Well toasted" },
        ],
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // 18. Appointments, Rentals & Repairs
  console.log("-> Seeding Appointments, Equipment Rentals & Repair Tickets...");
  const existingApt = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.organizationId, orgId))
    .limit(1);

  if (!existingApt.length) {
    await db.insert(schema.appointments).values({
      id: uuidv4(),
      organizationId: orgId,
      customerId: custVipId,
      customerName: "Lady Alexandra Stone",
      customerPhone: "+1 (555) 349-8821",
      serviceName: "Full Hardware Diagnostics & Clean",
      staffName: "David Miller (Certified Tech)",
      dateTime: nextMonth,
      endTime: nextMonth,
      status: "scheduled",
      notes: "Annual preventive service checkup",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingRental = await db
    .select()
    .from(schema.rentals)
    .where(eq(schema.rentals.organizationId, orgId))
    .limit(1);

  if (!existingRental.length) {
    await db.insert(schema.rentals).values({
      id: uuidv4(),
      organizationId: orgId,
      rentalNo: "RNT-2026-108",
      customerName: "David Harrison",
      itemName: "Sony Alpha A7 IV Cinema Camera Kit",
      rentStartDate: yesterday,
      expectedReturnDate: nextMonth,
      dailyRate: "45.00",
      securityDeposit: "500.00",
      totalAmount: "315.00",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingRepair = await db
    .select()
    .from(schema.repairs)
    .where(eq(schema.repairs.organizationId, orgId))
    .limit(1);

  if (!existingRepair.length) {
    await db.insert(schema.repairs).values({
      id: uuidv4(),
      organizationId: orgId,
      ticketNo: "REP-992182",
      customerName: "Ethan Walker",
      customerPhone: "+1 (555) 902-1144",
      deviceName: "Apple MacBook Pro M2 14-inch",
      serialOrImei: "C02XYZ189201",
      problemDescription: "Liquid spill on trackpad; backlight keyboard intermittent",
      estimatedCost: "280.00",
      advancePaid: "100.00",
      status: "in_progress",
      date: yesterday,
      notes: "Main logic board inspected; ultrasonic clean completed",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 19. SaaS Subscription Payments, Tickets & Reviews
  console.log("-> Seeding SaaS Subscriptions, Support Tickets & Reviews...");
  const existingSub = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, orgId))
    .limit(1);

  if (!existingSub.length) {
    await db.insert(schema.subscriptions).values({
      id: uuidv4(),
      organizationId: orgId,
      subscriptionNo: "SUB-2026-001",
      customerName: "OneDesk360 Flagship Store",
      customerPhone: "+1 (555) 019-2831",
      planName: "Enterprise Tier - Multi Branch",
      billingCycle: "yearly",
      amount: "990.00",
      nextBillingDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.subscriptionPayments).values({
      id: uuidv4(),
      organizationId: orgId,
      planId: "enterprise",
      utrNumber: "UTR-BANK-2026-990182",
      amount: "990.00",
      billingCycle: "yearly",
      paymentMethod: "Bank Wire Transfer",
      status: "approved",
      reviewedBy: "SuperAdmin Finance",
      reviewedAt: yesterday,
      note: "Annual enterprise renewal confirmed by accounting",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.supportTickets).values({
      id: uuidv4(),
      organizationId: orgId,
      subject: "Thermal Printer ESC/POS Character Encoding Setup",
      message: "Need assistance enabling UTF-8 currency glyph rendering on Star Micronics printer.",
      status: "resolved",
      createdAt: yesterday,
      updatedAt: now,
    });

    await db.insert(schema.reviews).values({
      id: uuidv4(),
      organizationId: orgId,
      rating: 5,
      comment: "Seamless multi-branch stock transfers and offline POS mode saved our busy weekend rush! Highly recommended.",
      createdAt: yesterday,
      updatedAt: now,
    });
  }

  // 20. Help Articles & FAQs
  console.log("-> Seeding Documentation Tutorials & System FAQs...");
  const existingHelp = await db
    .select()
    .from(schema.helpArticles)
    .limit(1);

  if (!existingHelp.length) {
    await db.insert(schema.helpArticles).values([
      {
        id: uuidv4(),
        title: "How to Configure ESC/POS Thermal Printers & Cash Drawers",
        type: "doc",
        content: "Learn how to connect USB, Network, and Bluetooth receipt printers with auto-cut and drawer kick pulses.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        title: "Managing Product Variants & Multi-Branch Stock Matrix",
        type: "doc",
        content: "Step-by-step guide to generating size/color matrix options and tracking per-location stock levels.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        title: "Video Tour: Cashier POS Terminal & Fast Keyboard Shortcuts",
        type: "video",
        content: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.insert(schema.faqs).values([
      {
        id: uuidv4(),
        question: "Does OneDesk360 work completely offline if internet disconnects?",
        answer: "Yes! All sales, customer checkouts, and barcode scans are cached locally in IndexedDB and synchronized automatically when internet is restored.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        question: "Can I transfer stock between branches and warehouses with approval workflow?",
        answer: "Yes, use the Stock Transfers module to dispatch items from a central warehouse and receive them at destination store locations.",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // 21. Audit Trail Activity Log & Live Notifications
  console.log("-> Seeding Audit Log Activity & Store Notifications...");
  await db.insert(schema.activityLog).values([
    {
      id: uuidv4(),
      organizationId: orgId,
      user: "System Seeder",
      action: "System Initialization",
      details: "Comprehensive catalog, variant products, and multi-location dummy data seeded successfully.",
      timestamp: now,
      type: "system",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      organizationId: orgId,
      user: "Store Owner",
      action: "POS Sale Completed",
      details: "Invoice #INV-2026-0001 for Lady Alexandra Stone - $843.99 (Card)",
      timestamp: yesterday,
      type: "sale",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(schema.notifications).values([
    {
      id: uuidv4(),
      organizationId: orgId,
      title: "Welcome to OneDesk360 Flagship",
      description: "Sample variant products, services, suppliers, and stock transfers have been provisioned.",
      type: "system",
      timestamp: now,
      read: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      organizationId: orgId,
      title: "Low Stock Alert: Nexus Nova 5G (Lunar Silver)",
      description: "Current stock is 10 units (at or near reorder threshold).",
      type: "inventory",
      timestamp: now,
      read: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("✅ ALL 71 TABLES POPULATED WITH REALISTIC DEMO DUMMY DATA!");
}

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
      await db.insert(schema.saasPlans).values({
        ...plan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(` - Created Plan: ${plan.name}`);
    } else {
      await db
        .update(schema.saasPlans)
        .set({ ...plan, updatedAt: new Date().toISOString() })
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      orgId: "demo_org_retail",
      storeName: "Urban Vogue General Retail",
      businessType: "RETAIL",
      ownerName: "Sophia Retail Manager",
      ownerEmail: "retail@onedesk360.com",
      role: "admin",
      headerNote: "Urban Vogue - Apparel, Goods & Fast Barcode POS",
    },
    {
      orgId: "demo_org_clothing",
      storeName: "Haute Couture Fashion Boutique",
      businessType: "CLOTHING",
      ownerName: "Isabella Fashion Director",
      ownerEmail: "clothing@onedesk360.com",
      role: "admin",
      headerNote: "Haute Couture - Size & Color Variants, Seasonal Promos",
    },
    {
      orgId: "demo_org_jewellery",
      storeName: "Royal Crown Bullion & Jewellery",
      businessType: "JEWELLERY",
      ownerName: "Rajesh Bullion Merchant",
      ownerEmail: "jewellery@onedesk360.com",
      role: "admin",
      headerNote: "Royal Crown - Live Bullion Rates & Hallmark Weight Calculator",
    },
    {
      orgId: "demo_org_electronics",
      storeName: "Apex Tech & Electronics Hub",
      businessType: "ELECTRONICS",
      ownerName: "Marcus Tech Lead",
      ownerEmail: "electronics@onedesk360.com",
      role: "admin",
      headerNote: "Apex Tech - Serial / IMEI Tracking & Digital Warranty",
    },
    {
      orgId: "demo_org_grocery",
      storeName: "FreshMart Supermarket & Grocery",
      businessType: "GROCERY",
      ownerName: "Oliver Supermarket Lead",
      ownerEmail: "grocery@onedesk360.com",
      role: "admin",
      headerNote: "FreshMart - Fast Barcode Scanning & Batch Expiry Tracking",
    },
    {
      orgId: "demo_org_bakery",
      storeName: "Sweet Crust Artisan Bakery",
      businessType: "BAKERY",
      ownerName: "Hannah Master Baker",
      ownerEmail: "bakery@onedesk360.com",
      role: "admin",
      headerNote: "Sweet Crust - Fresh Daily Batches & Quick Counter Sales",
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
      storeName: "Artisan Roast Coffee House",
      businessType: "CAFE",
      ownerName: "Chloe Cafe Manager",
      ownerEmail: "cafe@onedesk360.com",
      role: "admin",
      headerNote: "Artisan Roast Cafe - Espresso Bar & Fast Counter POS",
    },
    {
      orgId: "demo_org_hotel",
      storeName: "Grand Horizon Hotel & Suites",
      businessType: "HOTEL",
      ownerName: "Arthur General Manager",
      ownerEmail: "hotel@onedesk360.com",
      role: "admin",
      headerNote: "Grand Horizon Hotel - Room Folios & Integrated POS",
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
      headerNote: "Vintage Razor - Barber Queuing & Grooming Services",
    },
    {
      orgId: "demo_org_gym",
      storeName: "IronCore Fitness Club & Gym",
      businessType: "GYM",
      ownerName: "Derrick Head Coach",
      ownerEmail: "gym@onedesk360.com",
      role: "admin",
      headerNote: "IronCore Gym - Member RFID Check-In & Pass Validity",
    },
    {
      orgId: "demo_org_clinic",
      storeName: "PrimeCare Medical Clinic & Diagnostics",
      businessType: "CLINIC",
      ownerName: "Dr. Jonathan Medical Director",
      ownerEmail: "clinic@onedesk360.com",
      role: "admin",
      headerNote: "PrimeCare Clinic - Patient Consultations & Digital Prescriptions",
    },
    {
      orgId: "demo_org_rental",
      storeName: "Velocity Equipment & Vehicle Rentals",
      businessType: "RENTAL",
      ownerName: "Lucas Fleet Manager",
      ownerEmail: "rental@onedesk360.com",
      role: "admin",
      headerNote: "Velocity Rentals - Security Deposits & Rental Returns",
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
      orgId: "demo_org_auto_parts",
      storeName: "TurboDrive OEM Auto Parts & Spares",
      businessType: "AUTO_PARTS",
      ownerName: "Victor Spares Specialist",
      ownerEmail: "autoparts@onedesk360.com",
      role: "admin",
      headerNote: "TurboDrive - Vehicle Fitment Cross-Reference & OEM Search",
    },
    {
      orgId: "demo_org_wholesale",
      storeName: "Apex Bulk Wholesale & Distribution",
      businessType: "WHOLESALE",
      ownerName: "Vikram Wholesale Director",
      ownerEmail: "wholesale@onedesk360.com",
      role: "admin",
      headerNote: "Apex Wholesale - Tier Pricing, Quotations & Delivery Challans",
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
      const orgCode = `ORG-${acc.orgId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || Math.floor(1000 + Math.random() * 9000)}`;
      await db.insert(schema.organizations).values({
        id: acc.orgId,
        code: orgCode,
        name: acc.storeName,
        ownerEmail: acc.ownerEmail,
        status: "active",
        currentPlanId: "enterprise",
        industryType: acc.businessType,
        branchPricingEnabled: true,
        planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        syncKey: `${acc.orgId}-sync-key`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(` - Created Demo Organization: ${acc.storeName} (${acc.businessType})`);
    } else {
      await db
        .update(schema.organizations)
        .set({
          name: acc.storeName,
          status: "active",
          currentPlanId: "enterprise",
          industryType: acc.businessType,
          branchPricingEnabled: true,
          updatedAt: new Date().toISOString(),
        })
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db
        .update(schema.settings)
        .set({
          storeName: acc.storeName,
          businessType: acc.businessType,
          headerNote: acc.headerNote,
          subscriptionStatus: "active",
          updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const userId = (
        await db.select().from(schema.users).where(eq(schema.users.email, acc.ownerEmail)).limit(1)
      )[0]?.id;
      if (userId) {
        await db.insert(schema.organizationMemberships).values({
          id: uuidv4(),
          organizationId: acc.orgId,
          userId,
          role: "owner",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      console.log(
        ` - Created Industry Login: ${acc.ownerEmail} / password123 [${acc.businessType}]`,
      );
    } else {
      // Only update fields that don't participate in the unique (email, organization_id) index
      // to avoid duplicate key violations on idempotent re-runs
      const existingOrgId = existingUser[0].organizationId;
      if (existingOrgId !== acc.orgId) {
        // Different org — skip to avoid constraint violation; user belongs to another org
        console.log(` - Skipped (org mismatch): ${acc.ownerEmail} [${acc.businessType}]`);
      } else {
        await db
          .update(schema.users)
          .set({
            role: "admin",
            status: "active",
            pin: hashedDefaultPassword,
            permissions: ["all"],
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(eq(schema.users.email, acc.ownerEmail), eq(schema.users.organizationId, acc.orgId)),
          );
        console.log(
          ` - Verified Industry Login: ${acc.ownerEmail} / password123 [${acc.businessType}]`,
        );
      }
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      services: {
        name: string;
        category: string;
        price: string;
        cost?: string;
        duration?: number;
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
          image:
            "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Chef's Table Tasting Experience (5 Courses)",
          category: "Signature Steaks & Mains",
          price: "95.00",
          cost: "30.00",
          duration: 120,
        },
        {
          name: "Private Dining Lounge Booking (Per Hour)",
          category: "Appetizers & Starters",
          price: "60.00",
          cost: "10.00",
          duration: 60,
        },
        {
          name: "Sommelier Wine Pairing Session",
          category: "Fine Beverages",
          price: "45.00",
          cost: "12.00",
          duration: 30,
        },
        {
          name: "Custom Celebration Cake Ordering",
          category: "Desserts",
          price: "30.00",
          cost: "8.00",
          duration: 0,
        },
        {
          name: "Corporate Event Catering (Per Person)",
          category: "Pasta & Italian",
          price: "48.00",
          cost: "22.00",
          duration: 0,
        },
        {
          name: "Woodfire Pizza Making Masterclass",
          category: "Gourmet Pizzas",
          price: "35.00",
          cost: "10.00",
          duration: 90,
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
          image:
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Barista Latte Art Workshop",
          category: "Hot Specialty Coffee",
          price: "35.00",
          cost: "10.00",
          duration: 60,
        },
        {
          name: "Specialty Coffee Cupping Tasting Flight",
          category: "Hot Specialty Coffee",
          price: "20.00",
          cost: "6.00",
          duration: 45,
        },
        {
          name: "Seasonal Cold Brew Tasting Flight",
          category: "Cold Brews & Refreshers",
          price: "15.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "Custom Celebration Cake Consultation",
          category: "Fresh Artisanal Bakery",
          price: "25.00",
          cost: "8.00",
          duration: 0,
        },
        {
          name: "Weekend High Tea Service For Two",
          category: "Gourmet Paninis & Toast",
          price: "49.00",
          cost: "18.00",
          duration: 120,
        },
      ],
    },

    SALON: {
      categories: [
        { name: "Hair Styling & Cuts", count: 2 },
        { name: "Hair Treatments", count: 2 },
        { name: "Facial & Skincare", count: 1 },
        { name: "Nail Lounge & Spa", count: 1 },
        { name: "Professional Retail Care", count: 5 },
      ],
      brands: ["Kérastase", "Olaplex", "Dermalogica", "OPI", "Moroccanoil"],
      units: [
        { name: "Bottle", short: "btl", allowFractional: false },
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Tube", short: "tube", allowFractional: false },
      ],
      products: [
        {
          name: "Moroccan Argan Treatment Oil 100ml",
          sku: "SKU-SALON-R01",
          barcode: "203001000007",
          cost: "22.00",
          price: "48.00",
          stock: "45",
          category: "Professional Retail Care",
          brand: "Moroccanoil",
          unit: "Bottle",
          image:
            "https://images.unsplash.com/photo-1608248597359-0098f9ecfa0f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Olaplex No. 3 Hair Perfector 100ml",
          sku: "SKU-SALON-R02",
          barcode: "203001000008",
          cost: "16.00",
          price: "30.00",
          stock: "60",
          category: "Professional Retail Care",
          brand: "Olaplex",
          unit: "Bottle",
          image:
            "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Dermalogica Daily Microfoliant 74g",
          sku: "SKU-SALON-R03",
          barcode: "203001000009",
          cost: "32.00",
          price: "65.00",
          stock: "35",
          category: "Professional Retail Care",
          brand: "Dermalogica",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1556228722-d9b3be7dd88a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Kérastase Bain Hydration Shampoo 250ml",
          sku: "SKU-SALON-R04",
          barcode: "203001000010",
          cost: "14.00",
          price: "32.00",
          stock: "50",
          category: "Professional Retail Care",
          brand: "Kérastase",
          unit: "Bottle",
          image:
            "https://images.unsplash.com/photo-1608248597359-0098f9ecfa0f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "OPI Cuticle Oil & Nail Repair Duo",
          sku: "SKU-SALON-R05",
          barcode: "203001000011",
          cost: "18.00",
          price: "42.00",
          stock: "40",
          category: "Professional Retail Care",
          brand: "OPI",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Executive Haircut & Blowdry",
          category: "Hair Styling & Cuts",
          price: "55.00",
          cost: "12.00",
          duration: 45,
        },
        {
          name: "Balayage Color & Toner Session",
          category: "Hair Styling & Cuts",
          price: "220.00",
          cost: "45.00",
          duration: 180,
        },
        {
          name: "Keratin Smoothing Complex Treatment",
          category: "Hair Treatments",
          price: "180.00",
          cost: "35.00",
          duration: 120,
        },
        {
          name: "Olaplex Intensive Repair Treatment",
          category: "Hair Treatments",
          price: "75.00",
          cost: "18.00",
          duration: 60,
        },
        {
          name: "Hydrating Botanical Glow Facial",
          category: "Facial & Skincare",
          price: "85.00",
          cost: "16.00",
          duration: 60,
        },
        {
          name: "Deluxe Gel Manicure & Pedicure",
          category: "Nail Lounge & Spa",
          price: "65.00",
          cost: "14.00",
          duration: 90,
        },
        {
          name: "Luxury Bridal Makeover Package (Full Day)",
          category: "Hair Styling & Cuts",
          price: "450.00",
          cost: "120.00",
          duration: 300,
        },
      ],
    },

    BARBER: {
      categories: [
        { name: "Haircuts & Fades", count: 2 },
        { name: "Beard Grooming & Shaves", count: 2 },
        { name: "Spa & Scalp Care", count: 1 },
        { name: "Styling Products", count: 5 },
      ],
      brands: ["Reuzel", "Proraso", "Uppercut Deluxe", "Wahl"],
      units: [
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Bottle", short: "btl", allowFractional: false },
        { name: "Tube", short: "tube", allowFractional: false },
      ],
      products: [
        {
          name: "Reuzel Clay Matte Pomade 113g",
          sku: "SKU-BARB-R01",
          barcode: "204001000006",
          cost: "9.00",
          price: "22.00",
          stock: "45",
          category: "Styling Products",
          brand: "Reuzel",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Sandalwood Beard Conditioning Oil 50ml",
          sku: "SKU-BARB-R02",
          barcode: "204001000007",
          cost: "8.50",
          price: "24.00",
          stock: "40",
          category: "Styling Products",
          brand: "Proraso",
          unit: "Bottle",
          image:
            "https://images.unsplash.com/photo-1608248597359-0098f9ecfa0f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Uppercut Deluxe Matt Pomade 100g",
          sku: "SKU-BARB-R03",
          barcode: "204001000008",
          cost: "10.00",
          price: "26.00",
          stock: "35",
          category: "Styling Products",
          brand: "Uppercut Deluxe",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Proraso Refreshing Shave Cream 150ml",
          sku: "SKU-BARB-R04",
          barcode: "204001000009",
          cost: "6.50",
          price: "18.00",
          stock: "55",
          category: "Styling Products",
          brand: "Proraso",
          unit: "Tube",
          image:
            "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Professional Cordless Hair Clipper Kit",
          sku: "SKU-BARB-R05",
          barcode: "204001000010",
          cost: "45.00",
          price: "110.00",
          stock: "12",
          category: "Styling Products",
          brand: "Wahl",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Executive Skin Fade & Taper",
          category: "Haircuts & Fades",
          price: "35.00",
          cost: "6.00",
          duration: 30,
        },
        {
          name: "Classic Scissor Cut & Styling",
          category: "Haircuts & Fades",
          price: "30.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "Hot Towel Straight Razor Shave",
          category: "Beard Grooming & Shaves",
          price: "28.00",
          cost: "4.00",
          duration: 30,
        },
        {
          name: "Beard Sculpting & Razor Line-Up",
          category: "Beard Grooming & Shaves",
          price: "22.00",
          cost: "3.50",
          duration: 20,
        },
        {
          name: "Charcoal Detox Scalp & Face Treatment",
          category: "Spa & Scalp Care",
          price: "25.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "King's Royal Shave + Haircut Combo",
          category: "Haircuts & Fades",
          price: "55.00",
          cost: "10.00",
          duration: 60,
        },
      ],
    },

    REPAIR_CENTER: {
      categories: [
        { name: "Screen & Display Repairs", count: 2 },
        { name: "Battery & Power Services", count: 2 },
        { name: "Diagnostics & Micro-Soldering", count: 2 },
        { name: "Spare Parts & Accessories", count: 6 },
      ],
      brands: ["Apple OEM", "Samsung Parts", "Anker", "iFixit", "Spigen"],
      units: [
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Unit", short: "unt", allowFractional: false },
      ],
      products: [
        {
          name: "65W GaN Dual USB-C Fast Wall Charger",
          sku: "SKU-REP-R01",
          barcode: "205001000006",
          cost: "14.00",
          price: "34.99",
          stock: "70",
          category: "Spare Parts & Accessories",
          brand: "Anker",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "9H Diamond Tempered Glass Protector",
          sku: "SKU-REP-R02",
          barcode: "205001000007",
          cost: "2.00",
          price: "14.99",
          stock: "150",
          category: "Spare Parts & Accessories",
          brand: "Spigen",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Precision Multi-Bit Screwdriver Toolkit",
          sku: "SKU-REP-R03",
          barcode: "205001000008",
          cost: "15.00",
          price: "39.95",
          stock: "40",
          category: "Spare Parts & Accessories",
          brand: "iFixit",
          unit: "Unit",
          image:
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "MacBook Air M2 Replacement Battery (OEM)",
          sku: "SKU-REP-R04",
          barcode: "205001000009",
          cost: "58.00",
          price: "129.00",
          stock: "15",
          category: "Spare Parts & Accessories",
          brand: "Apple OEM",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Anker 10000mAh Magnetic Power Bank",
          sku: "SKU-REP-R05",
          barcode: "205001000010",
          cost: "24.00",
          price: "59.99",
          stock: "30",
          category: "Spare Parts & Accessories",
          brand: "Anker",
          unit: "Unit",
          image:
            "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Anti-Glare Matte Screen Film (iPad Pro)",
          sku: "SKU-REP-R06",
          barcode: "205001000011",
          cost: "9.00",
          price: "24.99",
          stock: "60",
          category: "Spare Parts & Accessories",
          brand: "Spigen",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "iPhone 15 Pro OLED Screen Replacement",
          category: "Screen & Display Repairs",
          price: "189.00",
          cost: "85.00",
          duration: 60,
        },
        {
          name: "Samsung S24 Ultra AMOLED Screen Assembly",
          category: "Screen & Display Repairs",
          price: "199.00",
          cost: "95.00",
          duration: 75,
        },
        {
          name: "MacBook Pro Battery Cell Replacement",
          category: "Battery & Power Services",
          price: "135.00",
          cost: "45.00",
          duration: 45,
        },
        {
          name: "iPad Air Battery Replacement Service",
          category: "Battery & Power Services",
          price: "89.00",
          cost: "30.00",
          duration: 40,
        },
        {
          name: "Logic Board Micro-Soldering & Diagnostics",
          category: "Diagnostics & Micro-Soldering",
          price: "120.00",
          cost: "20.00",
          duration: 90,
        },
        {
          name: "Device Data Recovery Service",
          category: "Diagnostics & Micro-Soldering",
          price: "99.00",
          cost: "25.00",
          duration: 120,
        },
      ],
    },

    MOBILE_REPAIR: {
      categories: [
        { name: "Screen Replacements", count: 2 },
        { name: "Battery & Charging Ports", count: 2 },
        { name: "Water Damage & Sensors", count: 1 },
        { name: "Accessories & Protection", count: 4 },
      ],
      brands: ["Apple OEM", "Samsung Parts", "Anker", "Spigen"],
      units: [
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Unit", short: "unt", allowFractional: false },
      ],
      products: [
        {
          name: "Shockproof Armor MagSafe Case",
          sku: "SKU-MOB-R01",
          barcode: "206001000005",
          cost: "6.00",
          price: "24.99",
          stock: "90",
          category: "Accessories & Protection",
          brand: "Spigen",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Braided 2M Fast-Charging Cable (USB-C)",
          sku: "SKU-MOB-R02",
          barcode: "206001000006",
          cost: "4.50",
          price: "16.99",
          stock: "120",
          category: "Accessories & Protection",
          brand: "Anker",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "9H Tempered Glass Screen Protector (5-Pack)",
          sku: "SKU-MOB-R03",
          barcode: "206001000007",
          cost: "3.00",
          price: "12.99",
          stock: "150",
          category: "Accessories & Protection",
          brand: "Spigen",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "MagSafe 10000mAh Wireless Power Bank",
          sku: "SKU-MOB-R04",
          barcode: "206001000008",
          cost: "28.00",
          price: "69.99",
          stock: "35",
          category: "Accessories & Protection",
          brand: "Anker",
          unit: "Unit",
          image:
            "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "iPhone 14/15 Screen Replacement",
          category: "Screen Replacements",
          price: "159.00",
          cost: "70.00",
          duration: 45,
        },
        {
          name: "Samsung Galaxy Screen Repair",
          category: "Screen Replacements",
          price: "169.00",
          cost: "80.00",
          duration: 50,
        },
        {
          name: "High-Capacity Phone Battery Replacement",
          category: "Battery & Charging Ports",
          price: "59.00",
          cost: "18.00",
          duration: 30,
        },
        {
          name: "USB-C / Lightning Port Flex Replacement",
          category: "Battery & Charging Ports",
          price: "49.00",
          cost: "12.00",
          duration: 40,
        },
        {
          name: "Liquid Damage Recovery & Deep Clean",
          category: "Water Damage & Sensors",
          price: "79.00",
          cost: "15.00",
          duration: 60,
        },
        {
          name: "Data Backup & Phone Transfer Service",
          category: "Screen Replacements",
          price: "29.00",
          cost: "5.00",
          duration: 30,
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
          image:
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Personal Styling & Wardrobe Consultation",
          category: "Footwear & Accessories",
          price: "65.00",
          cost: "10.00",
          duration: 60,
        },
        {
          name: "Denim Alteration & Hem Service",
          category: "Denim & Trousers",
          price: "12.00",
          cost: "3.00",
          duration: 15,
        },
        {
          name: "Boutique Tailoring & Custom Fit",
          category: "Tops & Shirts",
          price: "28.00",
          cost: "8.00",
          duration: 45,
        },
        {
          name: "Premium Gift Wrapping & Personalization",
          category: "Footwear & Accessories",
          price: "8.00",
          cost: "2.00",
          duration: 10,
        },
        {
          name: "Express Same-Day Delivery",
          category: "Tops & Shirts",
          price: "15.00",
          cost: "4.00",
          duration: 0,
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
          image:
            "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-OJ-77",
          expiryDate: "2026-09-18",
        },
      ],
      services: [
        {
          name: "Home Delivery Grocery Service",
          category: "Pantry Essentials",
          price: "5.00",
          cost: "2.00",
          duration: 0,
        },
        {
          name: "Custom Meat & Fish Cutting Prep",
          category: "Farm Dairy & Eggs",
          price: "3.50",
          cost: "1.00",
          duration: 15,
        },
        {
          name: "Customized Cake Decoration Order",
          category: "Pantry Essentials",
          price: "12.00",
          cost: "4.00",
          duration: 0,
        },
        {
          name: "Express In-Store Packing & Courier",
          category: "Beverages & Snacks",
          price: "6.00",
          cost: "2.00",
          duration: 15,
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
          image:
            "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Bulk Loading & Forklift Assistance",
          category: "Bulk Agricultural Sacks",
          price: "25.00",
          cost: "8.00",
          duration: 30,
        },
        {
          name: "Freight Delivery (Full Truckload)",
          category: "Bulk Agricultural Sacks",
          price: "150.00",
          cost: "60.00",
          duration: 0,
        },
        {
          name: "Tender & Quotation Documentation Pack",
          category: "Office Supplies Bulk",
          price: "10.00",
          cost: "2.00",
          duration: 0,
        },
        {
          name: "Warehousing & Storage Per Pallet / Week",
          category: "Industrial Packaging",
          price: "15.00",
          cost: "4.00",
          duration: 0,
        },
        {
          name: "Bulk Order Picking & Staging Service",
          category: "Commercial Oils & Fluids",
          price: "20.00",
          cost: "7.00",
          duration: 45,
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
          image:
            "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1550572017-ed200f5e5a43?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BATCH-FAK-3021",
          expiryDate: "2029-12-31",
        },
      ],
      services: [
        {
          name: "Pharmacist Counseling & Dosage Review",
          category: "First Aid & Diagnostics",
          price: "10.00",
          cost: "2.00",
          duration: 15,
        },
        {
          name: "Home Blood Pressure & Diabetes Screening",
          category: "First Aid & Diagnostics",
          price: "15.00",
          cost: "4.00",
          duration: 20,
        },
        {
          name: "Prescription Compounding Service",
          category: "Prescription & Pain Relief",
          price: "20.00",
          cost: "6.00",
          duration: 30,
        },
        {
          name: "Doorstep Medicine Delivery",
          category: "Vitamins & Supplements",
          price: "4.00",
          cost: "1.00",
          duration: 0,
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
          image:
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
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
          image:
            "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Warranty Registration & Extended Protection",
          category: "Electronics",
          price: "25.00",
          cost: "5.00",
          duration: 0,
        },
        {
          name: "Device Setup & Data Migration",
          category: "Electronics",
          price: "40.00",
          cost: "12.00",
          duration: 45,
        },
        {
          name: "Gift Wrapping & Personalization",
          category: "Apparel & Fashion",
          price: "6.00",
          cost: "2.00",
          duration: 10,
        },
        {
          name: "Home Installation & Smart Setup",
          category: "Home & Lifestyle",
          price: "55.00",
          cost: "20.00",
          duration: 90,
        },
      ],
    },

    CLOTHING: {
      categories: [
        { name: "Women's Collection", count: 3 },
        { name: "Men's Collection", count: 3 },
        { name: "Kids & Teen Wear", count: 2 },
        { name: "Accessories & Bags", count: 2 },
      ],
      brands: ["Zara", "H&M", "Mango", "Forever 21", "Tommy Hilfiger"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Pair", short: "pr", allowFractional: false },
        { name: "Set", short: "set", allowFractional: false },
      ],
      products: [
        {
          name: "Floral Wrap Midi Dress (S/M/L/XL)",
          sku: "SKU-CLO-01",
          barcode: "211001000001",
          cost: "18.00",
          price: "59.00",
          stock: "80",
          category: "Women's Collection",
          brand: "Zara",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "High-Rise Skinny Stretch Jeans (Women)",
          sku: "SKU-CLO-02",
          barcode: "211001000002",
          cost: "22.00",
          price: "64.00",
          stock: "70",
          category: "Women's Collection",
          brand: "Mango",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Satin Slip Cami Blouse (Ivory/Blush)",
          sku: "SKU-CLO-03",
          barcode: "211001000003",
          cost: "12.00",
          price: "35.00",
          stock: "90",
          category: "Women's Collection",
          brand: "Forever 21",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Classic Polo Shirt (White/Navy/Black)",
          sku: "SKU-CLO-04",
          barcode: "211001000004",
          cost: "16.00",
          price: "45.00",
          stock: "100",
          category: "Men's Collection",
          brand: "Tommy Hilfiger",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Slim-Fit Chino Trousers (Men)",
          sku: "SKU-CLO-05",
          barcode: "211001000005",
          cost: "20.00",
          price: "55.00",
          stock: "75",
          category: "Men's Collection",
          brand: "H&M",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Quilted Puffer Bomber Jacket (Men)",
          sku: "SKU-CLO-06",
          barcode: "211001000006",
          cost: "38.00",
          price: "99.00",
          stock: "40",
          category: "Men's Collection",
          brand: "Zara",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Girls Printed Cotton Dress (Ages 4-12)",
          sku: "SKU-CLO-07",
          barcode: "211001000007",
          cost: "10.00",
          price: "28.00",
          stock: "55",
          category: "Kids & Teen Wear",
          brand: "H&M",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Boys Graphic Tee & Jogger Set",
          sku: "SKU-CLO-08",
          barcode: "211001000008",
          cost: "12.00",
          price: "34.00",
          stock: "50",
          category: "Kids & Teen Wear",
          brand: "Forever 21",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1596609548086-85bbf8ddb6b9?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Structured Leather Tote Handbag",
          sku: "SKU-CLO-09",
          barcode: "211001000009",
          cost: "45.00",
          price: "129.00",
          stock: "30",
          category: "Accessories & Bags",
          brand: "Mango",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Silk Square Printed Scarf",
          sku: "SKU-CLO-10",
          barcode: "211001000010",
          cost: "8.00",
          price: "24.00",
          stock: "60",
          category: "Accessories & Bags",
          brand: "Zara",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Custom Tailoring & Alterations",
          category: "Women's Collection",
          price: "18.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "Personal Stylist Consultation Session",
          category: "Women's Collection",
          price: "50.00",
          cost: "8.00",
          duration: 60,
        },
        {
          name: "Wardrobe Styling & Capsule Planning",
          category: "Men's Collection",
          price: "75.00",
          cost: "12.00",
          duration: 90,
        },
        {
          name: "Kids Seasonal Bundle Styling Service",
          category: "Kids & Teen Wear",
          price: "40.00",
          cost: "8.00",
          duration: 30,
        },
        {
          name: "Premium Gift Wrapping & Mono-Stamping",
          category: "Accessories & Bags",
          price: "7.00",
          cost: "2.00",
          duration: 10,
        },
      ],
    },

    JEWELLERY: {
      categories: [
        { name: "Gold Jewellery (22K/24K)", count: 3 },
        { name: "Diamond & Gemstone", count: 2 },
        { name: "Silver & White Gold", count: 2 },
        { name: "Bridal Collections", count: 2 },
        { name: "Men's Jewellery", count: 1 },
      ],
      brands: ["Tanishq", "PC Jeweller", "Malabar Gold", "Caratlane", "Kalyan"],
      units: [
        { name: "Gram", short: "gm", allowFractional: true },
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Set", short: "set", allowFractional: false },
      ],
      products: [
        {
          name: "22K Gold Kundan Necklace Set (18g)",
          sku: "SKU-JWL-01",
          barcode: "212001000001",
          cost: "900.00",
          price: "1250.00",
          stock: "5",
          category: "Gold Jewellery (22K/24K)",
          brand: "Tanishq",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "24K Pure Gold Coin 10g (BIS Hallmark)",
          sku: "SKU-JWL-02",
          barcode: "212001000002",
          cost: "620.00",
          price: "720.00",
          stock: "20",
          category: "Gold Jewellery (22K/24K)",
          brand: "Malabar Gold",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Gold Chain Flat Curb Link 916 (8g)",
          sku: "SKU-JWL-03",
          barcode: "212001000003",
          cost: "460.00",
          price: "560.00",
          stock: "12",
          category: "Gold Jewellery (22K/24K)",
          brand: "Kalyan",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Solitaire Diamond Ring 0.5ct F/VS1",
          sku: "SKU-JWL-04",
          barcode: "212001000004",
          cost: "1800.00",
          price: "2800.00",
          stock: "4",
          category: "Diamond & Gemstone",
          brand: "Caratlane",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Emerald Pavé Halo Earrings (18K)",
          sku: "SKU-JWL-05",
          barcode: "212001000005",
          cost: "850.00",
          price: "1450.00",
          stock: "6",
          category: "Diamond & Gemstone",
          brand: "PC Jeweller",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "925 Sterling Silver Oxidised Jhumka Earrings",
          sku: "SKU-JWL-06",
          barcode: "212001000006",
          cost: "18.00",
          price: "55.00",
          stock: "35",
          category: "Silver & White Gold",
          brand: "Caratlane",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Silver Moonstone Adjustable Ring",
          sku: "SKU-JWL-07",
          barcode: "212001000007",
          cost: "12.00",
          price: "38.00",
          stock: "28",
          category: "Silver & White Gold",
          brand: "Caratlane",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1573408301185-9519f94815b3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Bridal Choker Necklace Set (Gold Plated)",
          sku: "SKU-JWL-08",
          barcode: "212001000008",
          cost: "320.00",
          price: "780.00",
          stock: "8",
          category: "Bridal Collections",
          brand: "Tanishq",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1576828831022-ca41d3905fb7?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Full Bridal Jewellery Set (6-Pc Gold)",
          sku: "SKU-JWL-09",
          barcode: "212001000009",
          cost: "2200.00",
          price: "3500.00",
          stock: "3",
          category: "Bridal Collections",
          brand: "Kalyan",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1592790988843-9c7c671e7acf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Men's Heavy Curb Bracelet (22K, 12g)",
          sku: "SKU-JWL-10",
          barcode: "212001000010",
          cost: "680.00",
          price: "950.00",
          stock: "7",
          category: "Men's Jewellery",
          brand: "Malabar Gold",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1622979135240-e07da41e8e81?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Hallmark Purity Testing & Certificate",
          category: "Gold Jewellery (22K/24K)",
          price: "15.00",
          cost: "2.00",
          duration: 30,
        },
        {
          name: "Custom Ring Resizing Service",
          category: "Gold Jewellery (22K/24K)",
          price: "35.00",
          cost: "10.00",
          duration: 45,
        },
        {
          name: "Jewellery Polishing & Rhodium Plating",
          category: "Silver & White Gold",
          price: "40.00",
          cost: "12.00",
          duration: 60,
        },
        {
          name: "Diamond Grading & Certification",
          category: "Diamond & Gemstone",
          price: "45.00",
          cost: "10.00",
          duration: 30,
        },
        {
          name: "Bridal Set Trial & Custom Styling",
          category: "Bridal Collections",
          price: "25.00",
          cost: "5.00",
          duration: 60,
        },
      ],
    },

    ELECTRONICS: {
      categories: [
        { name: "Smartphones & Tablets", count: 3 },
        { name: "Laptops & Computers", count: 2 },
        { name: "Audio & Headphones", count: 2 },
        { name: "Smart Home & Wearables", count: 2 },
        { name: "Cables & Accessories", count: 2 },
      ],
      brands: ["Apple", "Samsung", "Sony", "JBL", "Logitech", "Anker"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Unit", short: "unt", allowFractional: false },
      ],
      products: [
        {
          name: "iPhone 15 Pro 128GB Space Black",
          sku: "SKU-ELEC-01",
          barcode: "213001000001",
          cost: "880.00",
          price: "1099.00",
          stock: "22",
          category: "Smartphones & Tablets",
          brand: "Apple",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Samsung Galaxy S24+ 256GB",
          sku: "SKU-ELEC-02",
          barcode: "213001000002",
          cost: "820.00",
          price: "999.00",
          stock: "18",
          category: "Smartphones & Tablets",
          brand: "Samsung",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "iPad Air 11-inch M2 Wi-Fi 256GB",
          sku: "SKU-ELEC-03",
          barcode: "213001000003",
          cost: "520.00",
          price: "749.00",
          stock: "15",
          category: "Smartphones & Tablets",
          brand: "Apple",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "MacBook Pro 14-inch M3 Pro",
          sku: "SKU-ELEC-04",
          barcode: "213001000004",
          cost: "1600.00",
          price: "1999.00",
          stock: "10",
          category: "Laptops & Computers",
          brand: "Apple",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Samsung 27-inch 4K Smart Monitor",
          sku: "SKU-ELEC-05",
          barcode: "213001000005",
          cost: "280.00",
          price: "449.00",
          stock: "14",
          category: "Laptops & Computers",
          brand: "Samsung",
          unit: "Unit",
          image:
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Sony WH-1000XM5 Noise Cancelling Headphones",
          sku: "SKU-ELEC-06",
          barcode: "213001000006",
          cost: "250.00",
          price: "399.00",
          stock: "30",
          category: "Audio & Headphones",
          brand: "Sony",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "JBL Charge 5 Portable Bluetooth Speaker",
          sku: "SKU-ELEC-07",
          barcode: "213001000007",
          cost: "120.00",
          price: "199.00",
          stock: "25",
          category: "Audio & Headphones",
          brand: "JBL",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Apple Watch Series 9 (GPS) 45mm",
          sku: "SKU-ELEC-08",
          barcode: "213001000008",
          cost: "330.00",
          price: "429.00",
          stock: "20",
          category: "Smart Home & Wearables",
          brand: "Apple",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Anker 140W USB-C 4-Port GaN Charger",
          sku: "SKU-ELEC-09",
          barcode: "213001000009",
          cost: "35.00",
          price: "79.99",
          stock: "55",
          category: "Cables & Accessories",
          brand: "Anker",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Braided USB-C to Lightning Cable 2M (3-Pack)",
          sku: "SKU-ELEC-10",
          barcode: "213001000010",
          cost: "9.00",
          price: "24.99",
          stock: "90",
          category: "Cables & Accessories",
          brand: "Anker",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Device Unboxing & Setup Service",
          category: "Smartphones & Tablets",
          price: "20.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "Screen Protector Application & Installation",
          category: "Smartphones & Tablets",
          price: "10.00",
          cost: "3.00",
          duration: 15,
        },
        {
          name: "Laptop SSD Upgrade & OS Setup",
          category: "Laptops & Computers",
          price: "45.00",
          cost: "20.00",
          duration: 60,
        },
        {
          name: "Smart Home Sound System Installation",
          category: "Audio & Headphones",
          price: "60.00",
          cost: "25.00",
          duration: 120,
        },
        {
          name: "Old Device Trade-In Evaluation",
          category: "Smart Home & Wearables",
          price: "10.00",
          cost: "2.00",
          duration: 20,
        },
      ],
    },

    BAKERY: {
      categories: [
        { name: "Fresh Daily Breads", count: 3 },
        { name: "Cakes & Celebration", count: 3 },
        { name: "Pastries & Viennoiserie", count: 2 },
        { name: "Cookies & Biscuits", count: 2 },
        { name: "Beverages", count: 1 },
      ],
      brands: ["House Baked", "Artisan Collection", "Patisserie Maison"],
      units: [
        { name: "Piece", short: "pcs", allowFractional: false },
        { name: "Loaf", short: "loaf", allowFractional: false },
        { name: "Box", short: "box", allowFractional: false },
        { name: "Cup", short: "cup", allowFractional: false },
        { name: "Kg", short: "kg", allowFractional: true },
      ],
      products: [
        {
          name: "Classic Sourdough Boule (900g)",
          sku: "SKU-BAK-01",
          barcode: "214001000001",
          cost: "1.80",
          price: "6.50",
          stock: "40",
          category: "Fresh Daily Breads",
          brand: "House Baked",
          unit: "Loaf",
          image:
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-SRD-001",
          expiryDate: "2026-09-02",
        },
        {
          name: "Whole Grain Multigrain Loaf",
          sku: "SKU-BAK-02",
          barcode: "214001000002",
          cost: "1.50",
          price: "5.50",
          stock: "35",
          category: "Fresh Daily Breads",
          brand: "House Baked",
          unit: "Loaf",
          image:
            "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-MUL-002",
          expiryDate: "2026-09-02",
        },
        {
          name: "French Baguette (Individual)",
          sku: "SKU-BAK-03",
          barcode: "214001000003",
          cost: "0.60",
          price: "2.20",
          stock: "60",
          category: "Fresh Daily Breads",
          brand: "Patisserie Maison",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1549931319-a545dcf3bc7b?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-BAG-003",
          expiryDate: "2026-09-01",
        },
        {
          name: "Triple Chocolate Fudge Cake (Whole)",
          sku: "SKU-BAK-04",
          barcode: "214001000004",
          cost: "12.00",
          price: "34.00",
          stock: "10",
          category: "Cakes & Celebration",
          brand: "Artisan Collection",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-CHC-004",
          expiryDate: "2026-09-04",
        },
        {
          name: "Strawberry Chantilly Mousse Cake",
          sku: "SKU-BAK-05",
          barcode: "214001000005",
          cost: "10.00",
          price: "28.00",
          stock: "8",
          category: "Cakes & Celebration",
          brand: "Patisserie Maison",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-STR-005",
          expiryDate: "2026-09-03",
        },
        {
          name: "Birthday Number Digit Fondant Cupcake (6-Pack)",
          sku: "SKU-BAK-06",
          barcode: "214001000006",
          cost: "6.00",
          price: "18.00",
          stock: "15",
          category: "Cakes & Celebration",
          brand: "Artisan Collection",
          unit: "Box",
          image:
            "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-CPC-006",
          expiryDate: "2026-09-03",
        },
        {
          name: "Butter Almond Croissant",
          sku: "SKU-BAK-07",
          barcode: "214001000007",
          cost: "0.90",
          price: "3.75",
          stock: "50",
          category: "Pastries & Viennoiserie",
          brand: "Patisserie Maison",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-CRS-007",
          expiryDate: "2026-09-01",
        },
        {
          name: "Danish Cinnamon Apple Turnover",
          sku: "SKU-BAK-08",
          barcode: "214001000008",
          cost: "1.00",
          price: "4.25",
          stock: "45",
          category: "Pastries & Viennoiserie",
          brand: "House Baked",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1533910534207-90f31029a78e?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-DAN-008",
          expiryDate: "2026-09-02",
        },
        {
          name: "Double Choc Chip Cookies (Box of 12)",
          sku: "SKU-BAK-09",
          barcode: "214001000009",
          cost: "4.00",
          price: "12.00",
          stock: "30",
          category: "Cookies & Biscuits",
          brand: "Artisan Collection",
          unit: "Box",
          image:
            "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-CKI-009",
          expiryDate: "2026-09-15",
        },
        {
          name: "Salted Caramel Brownie (Individual)",
          sku: "SKU-BAK-10",
          barcode: "214001000010",
          cost: "1.20",
          price: "4.00",
          stock: "40",
          category: "Cookies & Biscuits",
          brand: "House Baked",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
          batchNumber: "BAK-BRW-010",
          expiryDate: "2026-09-05",
        },
        {
          name: "Hot Chocolate Premium (Rich Cocoa)",
          sku: "SKU-BAK-11",
          barcode: "214001000011",
          cost: "0.90",
          price: "4.50",
          stock: "100",
          category: "Beverages",
          brand: "Artisan Collection",
          unit: "Cup",
          image:
            "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Custom Birthday Cake Design Service",
          category: "Cakes & Celebration",
          price: "35.00",
          cost: "12.00",
          duration: 0,
        },
        {
          name: "Cake Cutting & Plating Service",
          category: "Cakes & Celebration",
          price: "8.00",
          cost: "2.00",
          duration: 15,
        },
        {
          name: "Corporate Catering Pastry Trays",
          category: "Pastries & Viennoiserie",
          price: "50.00",
          cost: "20.00",
          duration: 0,
        },
        {
          name: "Kids Cake Decorating Workshop",
          category: "Cookies & Biscuits",
          price: "25.00",
          cost: "8.00",
          duration: 60,
        },
        {
          name: "Artisan Bread Subscription Delivery / Week",
          category: "Fresh Daily Breads",
          price: "28.00",
          cost: "10.00",
          duration: 0,
        },
      ],
    },

    HOTEL: {
      categories: [
        { name: "Room Accommodation", count: 3 },
        { name: "Restaurant & Dining", count: 3 },
        { name: "Room Service & Minibar", count: 2 },
        { name: "Spa & Wellness", count: 0 },
        { name: "Business & Events", count: 0 },
      ],
      brands: ["Hotel Signature", "Minibar Select", "Spa Luxe", "Conference Pro"],
      units: [
        { name: "Night", short: "nght", allowFractional: false },
        { name: "Serving", short: "srv", allowFractional: false },
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Piece", short: "pcs", allowFractional: false },
      ],
      products: [
        {
          name: "Deluxe King Room (City View) - Per Night",
          sku: "SKU-HTL-01",
          barcode: "215001000001",
          cost: "60.00",
          price: "180.00",
          stock: "12",
          category: "Room Accommodation",
          brand: "Hotel Signature",
          unit: "Night",
          image:
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Junior Suite (Pool View) - Per Night",
          sku: "SKU-HTL-02",
          barcode: "215001000002",
          cost: "100.00",
          price: "280.00",
          stock: "6",
          category: "Room Accommodation",
          brand: "Hotel Signature",
          unit: "Night",
          image:
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Presidential Suite (Panoramic) - Per Night",
          sku: "SKU-HTL-03",
          barcode: "215001000003",
          cost: "250.00",
          price: "650.00",
          stock: "2",
          category: "Room Accommodation",
          brand: "Hotel Signature",
          unit: "Night",
          image:
            "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Continental Breakfast Buffet (Per Person)",
          sku: "SKU-HTL-04",
          barcode: "215001000004",
          cost: "8.00",
          price: "25.00",
          stock: "100",
          category: "Restaurant & Dining",
          brand: "Hotel Signature",
          unit: "Serving",
          image:
            "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Grilled Sea Bass (Restaurant Main Course)",
          sku: "SKU-HTL-05",
          barcode: "215001000005",
          cost: "14.00",
          price: "38.00",
          stock: "50",
          category: "Restaurant & Dining",
          brand: "Hotel Signature",
          unit: "Serving",
          image:
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Fine Champagne (Restaurant Bottle)",
          sku: "SKU-HTL-06",
          barcode: "215001000006",
          cost: "40.00",
          price: "120.00",
          stock: "25",
          category: "Restaurant & Dining",
          brand: "Hotel Signature",
          unit: "Serving",
          image:
            "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Room Service Club Sandwich + Fries",
          sku: "SKU-HTL-07",
          barcode: "215001000007",
          cost: "6.00",
          price: "22.00",
          stock: "999",
          category: "Room Service & Minibar",
          brand: "Hotel Signature",
          unit: "Serving",
          image:
            "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Minibar Perrier Sparkling Water 330ml",
          sku: "SKU-HTL-08",
          barcode: "215001000008",
          cost: "1.00",
          price: "5.50",
          stock: "200",
          category: "Room Service & Minibar",
          brand: "Minibar Select",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Minibar Pringles Original 40g",
          sku: "SKU-HTL-09",
          barcode: "215001000009",
          cost: "0.80",
          price: "4.50",
          stock: "300",
          category: "Room Service & Minibar",
          brand: "Minibar Select",
          unit: "Piece",
          image:
            "https://images.unsplash.com/photo-1549497538-303791108f95?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Signature Deep Tissue Massage (60 min)",
          category: "Spa & Wellness",
          price: "120.00",
          cost: "30.00",
          duration: 60,
        },
        {
          name: "Aromatherapy Steam Sauna Session",
          category: "Spa & Wellness",
          price: "45.00",
          cost: "10.00",
          duration: 45,
        },
        {
          name: "Conference Hall Booking (Full Day)",
          category: "Business & Events",
          price: "650.00",
          cost: "200.00",
          duration: 480,
        },
        {
          name: "Airport Pickup / Drop Chauffeur Service",
          category: "Business & Events",
          price: "35.00",
          cost: "10.00",
          duration: 0,
        },
        {
          name: "Spa Day Pass & Pool Access",
          category: "Spa & Wellness",
          price: "55.00",
          cost: "15.00",
          duration: 0,
        },
        {
          name: "In-Room Tiffin / Custom Meal Service",
          category: "Room Service & Minibar",
          price: "15.00",
          cost: "5.00",
          duration: 30,
        },
        {
          name: "Express Laundry Same-Day Service",
          category: "Room Service & Minibar",
          price: "20.00",
          cost: "6.00",
          duration: 0,
        },
      ],
    },

    GYM: {
      categories: [
        { name: "Membership Plans", count: 3 },
        { name: "Personal Training", count: 2 },
        { name: "Group Classes", count: 3 },
        { name: "Supplements & Nutrition", count: 3 },
        { name: "Gym Gear & Apparel", count: 3 },
      ],
      brands: ["IronCore", "MyProtein", "Nike Training", "Reebok", "Optimum Nutrition"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Kg", short: "kg", allowFractional: true },
        { name: "Box", short: "box", allowFractional: false },
      ],
      products: [
        {
          name: "Whey Protein Powder Chocolate 2kg",
          sku: "SKU-GYM-R01",
          barcode: "216001000009",
          cost: "32.00",
          price: "79.00",
          stock: "60",
          category: "Supplements & Nutrition",
          brand: "Optimum Nutrition",
          unit: "Kg",
          image:
            "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Creatine Monohydrate 500g Unflavored",
          sku: "SKU-GYM-R02",
          barcode: "216001000010",
          cost: "15.00",
          price: "39.00",
          stock: "45",
          category: "Supplements & Nutrition",
          brand: "MyProtein",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1584735422425-6c2a5c73f8e5?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Premier Yoga Mat Non-Slip (6mm)",
          sku: "SKU-GYM-R03",
          barcode: "216001000011",
          cost: "18.00",
          price: "49.00",
          stock: "35",
          category: "Gym Gear & Apparel",
          brand: "Reebok",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Resistance Band Set (5 Levels)",
          sku: "SKU-GYM-R04",
          barcode: "216001000012",
          cost: "12.00",
          price: "32.00",
          stock: "50",
          category: "Gym Gear & Apparel",
          brand: "IronCore",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Pre-Workout Energy & Focus Formula 300g",
          sku: "SKU-GYM-R05",
          barcode: "216001000013",
          cost: "20.00",
          price: "49.00",
          stock: "40",
          category: "Supplements & Nutrition",
          brand: "Optimum Nutrition",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "IronCore Gym Duffel Bag 40L",
          sku: "SKU-GYM-R06",
          barcode: "216001000014",
          cost: "22.00",
          price: "59.00",
          stock: "30",
          category: "Gym Gear & Apparel",
          brand: "Nike Training",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Monthly Premium Membership (Unlimited Access)",
          category: "Membership Plans",
          price: "49.00",
          cost: "15.00",
          duration: 30,
        },
        {
          name: "Quarterly Membership (3 Months - 10% Off)",
          category: "Membership Plans",
          price: "129.00",
          cost: "40.00",
          duration: 90,
        },
        {
          name: "Annual Elite Membership (All-Inclusive)",
          category: "Membership Plans",
          price: "399.00",
          cost: "120.00",
          duration: 365,
        },
        {
          name: "1-on-1 Personal Training Session (60 min)",
          category: "Personal Training",
          price: "65.00",
          cost: "20.00",
          duration: 60,
        },
        {
          name: "Personal Training Package (10 Sessions)",
          category: "Personal Training",
          price: "549.00",
          cost: "180.00",
          duration: 600,
        },
        {
          name: "Zumba Dance Cardio Group Class",
          category: "Group Classes",
          price: "18.00",
          cost: "5.00",
          duration: 60,
        },
        {
          name: "Hot Yoga & Pilates Fusion Class",
          category: "Group Classes",
          price: "22.00",
          cost: "7.00",
          duration: 60,
        },
        {
          name: "Kickboxing & Combat Training Class",
          category: "Group Classes",
          price: "20.00",
          cost: "6.00",
          duration: 60,
        },
      ],
    },

    CLINIC: {
      categories: [
        { name: "Consultation Services", count: 3 },
        { name: "Diagnostic & Lab Tests", count: 3 },
        { name: "Physiotherapy & Rehab", count: 2 },
        { name: "Vaccinations & Preventive", count: 2 },
        { name: "Minor Procedures", count: 2 },
        { name: "Pharmacy & Retail", count: 4 },
      ],
      brands: ["Clinic Pro", "MedScan Labs", "PhysioFit", "ImmunoShield", "PharmaCare"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Box", short: "box", allowFractional: false },
        { name: "Pack", short: "pk", allowFractional: false },
        { name: "Roll", short: "rl", allowFractional: false },
      ],
      products: [
        {
          name: "Surgical Face Masks (Box of 50)",
          sku: "SKU-CLN-R01",
          barcode: "217001000013",
          cost: "4.00",
          price: "12.99",
          stock: "120",
          category: "Pharmacy & Retail",
          brand: "PharmaCare",
          unit: "Box",
          image:
            "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Digital Thermometer & Home Kit",
          sku: "SKU-CLN-R02",
          barcode: "217001000014",
          cost: "6.00",
          price: "19.99",
          stock: "60",
          category: "Pharmacy & Retail",
          brand: "PharmaCare",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1584118623352-9362ed5b33fa?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Blood Pressure Monitor (Upper Arm)",
          sku: "SKU-CLN-R03",
          barcode: "217001000015",
          cost: "22.00",
          price: "59.99",
          stock: "40",
          category: "Pharmacy & Retail",
          brand: "PharmaCare",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Elastic Bandage Support Wrap",
          sku: "SKU-CLN-R04",
          barcode: "217001000016",
          cost: "3.00",
          price: "9.99",
          stock: "90",
          category: "Pharmacy & Retail",
          brand: "PharmaCare",
          unit: "Roll",
          image:
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "General Practitioner Consultation (30 min)",
          category: "Consultation Services",
          price: "45.00",
          cost: "8.00",
          duration: 30,
        },
        {
          name: "Specialist / Specialist Referral Consultation",
          category: "Consultation Services",
          price: "120.00",
          cost: "20.00",
          duration: 45,
        },
        {
          name: "Paediatrics Consultation (Under 12)",
          category: "Consultation Services",
          price: "55.00",
          cost: "10.00",
          duration: 30,
        },
        {
          name: "Full Blood Count (CBC) Test",
          category: "Diagnostic & Lab Tests",
          price: "22.00",
          cost: "5.00",
          duration: 20,
        },
        {
          name: "HbA1c Diabetes Glucose Test",
          category: "Diagnostic & Lab Tests",
          price: "35.00",
          cost: "8.00",
          duration: 20,
        },
        {
          name: "Chest X-Ray (Digital Radiograph)",
          category: "Diagnostic & Lab Tests",
          price: "55.00",
          cost: "15.00",
          duration: 30,
        },
        {
          name: "Sports Injury Physiotherapy Session (45 min)",
          category: "Physiotherapy & Rehab",
          price: "60.00",
          cost: "15.00",
          duration: 45,
        },
        {
          name: "Post-Operative Rehabilitation Session",
          category: "Physiotherapy & Rehab",
          price: "75.00",
          cost: "18.00",
          duration: 60,
        },
        {
          name: "Flu Vaccine (Influenza Quadrivalent)",
          category: "Vaccinations & Preventive",
          price: "35.00",
          cost: "12.00",
          duration: 15,
        },
        {
          name: "COVID-19 Booster mRNA Vaccine",
          category: "Vaccinations & Preventive",
          price: "25.00",
          cost: "8.00",
          duration: 15,
        },
        {
          name: "Wound Closure & Minor Suturing",
          category: "Minor Procedures",
          price: "80.00",
          cost: "12.00",
          duration: 30,
        },
        {
          name: "Cryotherapy (Wart / Mole Removal)",
          category: "Minor Procedures",
          price: "95.00",
          cost: "15.00",
          duration: 30,
        },
      ],
    },

    RENTAL: {
      categories: [
        { name: "Vehicle Rentals", count: 3 },
        { name: "Power Equipment", count: 3 },
        { name: "Event & AV Equipment", count: 3 },
        { name: "Sports & Outdoor Gear", count: 2 },
        { name: "Rental Packages", count: 1 },
      ],
      brands: ["Velocity Fleet", "Makita Pro", "Sony AV", "Coleman Outdoor"],
      units: [
        { name: "Day", short: "day", allowFractional: false },
        { name: "Week", short: "wk", allowFractional: false },
        { name: "Hour", short: "hr", allowFractional: false },
        { name: "Event", short: "evt", allowFractional: false },
      ],
      products: [
        {
          name: "Economy Compact Car Rental (Per Day)",
          sku: "SKU-RNT-01",
          barcode: "218001000001",
          cost: "20.00",
          price: "55.00",
          stock: "8",
          category: "Vehicle Rentals",
          brand: "Velocity Fleet",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "SUV / 4x4 All-Terrain Rental (Per Day)",
          sku: "SKU-RNT-02",
          barcode: "218001000002",
          cost: "50.00",
          price: "130.00",
          stock: "5",
          category: "Vehicle Rentals",
          brand: "Velocity Fleet",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "15-Seat Passenger Van Rental (Per Day)",
          sku: "SKU-RNT-03",
          barcode: "218001000003",
          cost: "80.00",
          price: "180.00",
          stock: "3",
          category: "Vehicle Rentals",
          brand: "Velocity Fleet",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Industrial Generator 15KVA (Per Day)",
          sku: "SKU-RNT-04",
          barcode: "218001000004",
          cost: "40.00",
          price: "110.00",
          stock: "4",
          category: "Power Equipment",
          brand: "Makita Pro",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Pressure Washer 3000 PSI (Per Day)",
          sku: "SKU-RNT-05",
          barcode: "218001000005",
          cost: "15.00",
          price: "45.00",
          stock: "6",
          category: "Power Equipment",
          brand: "Makita Pro",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Concrete Mixer 180L (Per Day)",
          sku: "SKU-RNT-06",
          barcode: "218001000006",
          cost: "25.00",
          price: "70.00",
          stock: "3",
          category: "Power Equipment",
          brand: "Makita Pro",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Professional PA Speaker System + Mixer (Event)",
          sku: "SKU-RNT-07",
          barcode: "218001000007",
          cost: "60.00",
          price: "180.00",
          stock: "4",
          category: "Event & AV Equipment",
          brand: "Sony AV",
          unit: "Event",
          image:
            "https://images.unsplash.com/photo-1607293566520-d7e2c0bdfc61?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "4K DSLR Camera + Lens Kit (Per Day)",
          sku: "SKU-RNT-08",
          barcode: "218001000008",
          cost: "30.00",
          price: "95.00",
          stock: "5",
          category: "Event & AV Equipment",
          brand: "Sony AV",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Projector 5000 Lumens + Screen Set (Per Day)",
          sku: "SKU-RNT-09",
          barcode: "218001000009",
          cost: "20.00",
          price: "65.00",
          stock: "6",
          category: "Event & AV Equipment",
          brand: "Sony AV",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Mountain Bicycle (Per Day)",
          sku: "SKU-RNT-10",
          barcode: "218001000010",
          cost: "5.00",
          price: "20.00",
          stock: "15",
          category: "Sports & Outdoor Gear",
          brand: "Coleman Outdoor",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Full Camping Tent Set (4-Person) - Per Night",
          sku: "SKU-RNT-11",
          barcode: "218001000011",
          cost: "12.00",
          price: "35.00",
          stock: "8",
          category: "Sports & Outdoor Gear",
          brand: "Coleman Outdoor",
          unit: "Day",
          image:
            "https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Full Wedding AV + Decor Package",
          sku: "SKU-RNT-12",
          barcode: "218001000012",
          cost: "600.00",
          price: "1800.00",
          stock: "5",
          category: "Rental Packages",
          brand: "Sony AV",
          unit: "Event",
          image:
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Airport Pickup & Drop Convenience Add-On",
          category: "Vehicle Rentals",
          price: "25.00",
          cost: "8.00",
          duration: 0,
        },
        {
          name: "Chauffeur-Driven Hourly Hire",
          category: "Vehicle Rentals",
          price: "35.00",
          cost: "15.00",
          duration: 60,
        },
        {
          name: "Emergency Roadside & Recovery Assistance",
          category: "Vehicle Rentals",
          price: "20.00",
          cost: "6.00",
          duration: 0,
        },
        {
          name: "On-Site Equipment Delivery & Setup",
          category: "Event & AV Equipment",
          price: "50.00",
          cost: "20.00",
          duration: 60,
        },
        {
          name: "AV Technician Support (Per Hour)",
          category: "Event & AV Equipment",
          price: "30.00",
          cost: "15.00",
          duration: 60,
        },
        {
          name: "Extra Accessory Hire - Tents & Camping Gear",
          category: "Sports & Outdoor Gear",
          price: "25.00",
          cost: "10.00",
          duration: 0,
        },
      ],
    },

    AUTO_PARTS: {
      categories: [
        { name: "Engine & Drivetrain Parts", count: 3 },
        { name: "Brake & Suspension", count: 3 },
        { name: "Electrical & Lighting", count: 2 },
        { name: "Filters & Fluids", count: 3 },
        { name: "Tyres & Wheels", count: 2 },
      ],
      brands: ["Bosch", "NGK", "Brembo", "Castrol", "Michelin", "Monroe"],
      units: [
        { name: "Pcs", short: "pcs", allowFractional: false },
        { name: "Pair", short: "pr", allowFractional: false },
        { name: "Liter", short: "L", allowFractional: true },
        { name: "Set", short: "set", allowFractional: false },
      ],
      products: [
        {
          name: "Bosch Iridium Spark Plug Set (4-Pc)",
          sku: "SKU-AUTO-01",
          barcode: "219001000001",
          cost: "14.00",
          price: "39.00",
          stock: "60",
          category: "Engine & Drivetrain Parts",
          brand: "Bosch",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "NGK Laser Iridium Spark Plug (Single)",
          sku: "SKU-AUTO-02",
          barcode: "219001000002",
          cost: "5.00",
          price: "12.50",
          stock: "120",
          category: "Engine & Drivetrain Parts",
          brand: "NGK",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Timing Belt Kit with Water Pump",
          sku: "SKU-AUTO-03",
          barcode: "219001000003",
          cost: "55.00",
          price: "130.00",
          stock: "25",
          category: "Engine & Drivetrain Parts",
          brand: "Bosch",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Brembo Front Brake Disc Rotors (Pair)",
          sku: "SKU-AUTO-04",
          barcode: "219001000004",
          cost: "80.00",
          price: "190.00",
          stock: "18",
          category: "Brake & Suspension",
          brand: "Brembo",
          unit: "Pair",
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Ceramic Brake Pad Set (Front + Rear)",
          sku: "SKU-AUTO-05",
          barcode: "219001000005",
          cost: "28.00",
          price: "75.00",
          stock: "40",
          category: "Brake & Suspension",
          brand: "Brembo",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Monroe Front Shock Absorber (Single)",
          sku: "SKU-AUTO-06",
          barcode: "219001000006",
          cost: "35.00",
          price: "89.00",
          stock: "30",
          category: "Brake & Suspension",
          brand: "Monroe",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Bosch H7 Halogen Headlight Bulb (Pair)",
          sku: "SKU-AUTO-07",
          barcode: "219001000007",
          cost: "8.00",
          price: "22.00",
          stock: "75",
          category: "Electrical & Lighting",
          brand: "Bosch",
          unit: "Pair",
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Car Battery 75Ah Maintenance-Free (AGM)",
          sku: "SKU-AUTO-08",
          barcode: "219001000008",
          cost: "65.00",
          price: "145.00",
          stock: "20",
          category: "Electrical & Lighting",
          brand: "Bosch",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1606316399885-23a50b51d9fc?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Castrol EDGE 5W-30 Fully Synthetic Oil 4L",
          sku: "SKU-AUTO-09",
          barcode: "219001000009",
          cost: "22.00",
          price: "52.00",
          stock: "80",
          category: "Filters & Fluids",
          brand: "Castrol",
          unit: "Liter",
          image:
            "https://images.unsplash.com/photo-1444809153920-ef3ade2e5a91?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Bosch Oil Filter (Spin-On - Universal)",
          sku: "SKU-AUTO-10",
          barcode: "219001000010",
          cost: "4.00",
          price: "12.00",
          stock: "100",
          category: "Filters & Fluids",
          brand: "Bosch",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "K&N High-Flow Air Filter (Performance)",
          sku: "SKU-AUTO-11",
          barcode: "219001000011",
          cost: "28.00",
          price: "65.00",
          stock: "35",
          category: "Filters & Fluids",
          brand: "NGK",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "Michelin Pilot Sport 4 235/45R18 (Single)",
          sku: "SKU-AUTO-12",
          barcode: "219001000012",
          cost: "110.00",
          price: "235.00",
          stock: "16",
          category: "Tyres & Wheels",
          brand: "Michelin",
          unit: "Pcs",
          image:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80",
        },
        {
          name: "18-inch Alloy Wheel Rim (Set of 4)",
          sku: "SKU-AUTO-13",
          barcode: "219001000013",
          cost: "280.00",
          price: "620.00",
          stock: "5",
          category: "Tyres & Wheels",
          brand: "Monroe",
          unit: "Set",
          image:
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80",
        },
      ],
      services: [
        {
          name: "Engine Diagnostics & Fault Code Scan",
          category: "Engine & Drivetrain Parts",
          price: "40.00",
          cost: "10.00",
          duration: 30,
        },
        {
          name: "Brake Fluid Exchange & System Flush",
          category: "Brake & Suspension",
          price: "45.00",
          cost: "15.00",
          duration: 45,
        },
        {
          name: "Headlight Bulb Replacement (Install Included)",
          category: "Electrical & Lighting",
          price: "15.00",
          cost: "5.00",
          duration: 20,
        },
        {
          name: "Oil & Filter Change Service",
          category: "Filters & Fluids",
          price: "30.00",
          cost: "10.00",
          duration: 40,
        },
        {
          name: "Tyre Fitment, Balance & Wheel Alignment",
          category: "Tyres & Wheels",
          price: "60.00",
          cost: "25.00",
          duration: 60,
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
    const catMap: Record<string, string> = {};
    for (const cat of catalog.categories) {
      const existing = await db
        .select()
        .from(schema.categories)
        .where(
          and(eq(schema.categories.organizationId, orgId), eq(schema.categories.name, cat.name)),
        )
        .limit(1);
      if (!existing.length) {
        const catId = uuidv4();
        catMap[cat.name] = catId;
        await db.insert(schema.categories).values({
          id: catId,
          organizationId: orgId,
          name: cat.name,
          count: cat.count,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        catMap[cat.name] = existing[0].id;
      }
    }

    // 2. Seed brands for this store's industry
    const brandMap: Record<string, string> = {};
    for (const b of catalog.brands) {
      const existing = await db
        .select()
        .from(schema.brands)
        .where(and(eq(schema.brands.organizationId, orgId), eq(schema.brands.name, b)))
        .limit(1);
      if (!existing.length) {
        const brandId = uuidv4();
        brandMap[b] = brandId;
        await db.insert(schema.brands).values({
          id: brandId,
          organizationId: orgId,
          name: b,
          products: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        brandMap[b] = existing[0].id;
      }
    }

    // 3. Seed units for this store's industry
    const unitMap: Record<string, string> = {};
    for (const u of catalog.units) {
      const existing = await db
        .select()
        .from(schema.units)
        .where(and(eq(schema.units.organizationId, orgId), eq(schema.units.name, u.name)))
        .limit(1);
      if (!existing.length) {
        const unitId = uuidv4();
        unitMap[u.name] = unitId;
        await db.insert(schema.units).values({
          id: unitId,
          organizationId: orgId,
          name: u.name,
          short: u.short,
          allowFractional: u.allowFractional,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        unitMap[u.name] = existing[0].id;
      }
    }

    // 4. Seed products tailored to this store's industry
    for (const p of catalog.products) {
      const existing = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.organizationId, orgId), eq(schema.products.sku, p.sku)))
        .limit(1);
      if (existing.length > 0) continue;

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
        category: catMap[p.category] || p.category,
        brand: brandMap[p.brand] || p.brand,
        unit: unitMap[p.unit] || p.unit,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 4b. Seed services tailored to this store's industry
    const catalogServices = catalog.services || [];
    const serviceCatFallback = Object.values(catMap)[0];
    for (const s of catalogServices) {
      const existing = await db
        .select({ id: schema.services.id })
        .from(schema.services)
        .where(and(eq(schema.services.organizationId, orgId), eq(schema.services.name, s.name)))
        .limit(1);
      if (existing.length > 0) continue;

      await db.insert(schema.services).values({
        id: uuidv4(),
        organizationId: orgId,
        name: s.name,
        category: catMap[s.category] || serviceCatFallback || s.category,
        price: s.price,
        cost: s.cost ?? "0",
        duration: s.duration ?? null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(
      ` - Seeded ${catalog.products.length} [${bType}] Products + ${catalogServices.length} Services for Organization: ${"name" in org ? org.name : orgId}`,
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
      await db.insert(schema.customers).values({
        ...cust,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
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

  // 8. Seed Comprehensive Multi-Vertical Dummy Data for All Tables
  await seedComprehensiveData();

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
