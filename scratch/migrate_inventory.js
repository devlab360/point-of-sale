import { config } from "dotenv";
config();

import { db } from "../src/db/index";
import * as schema from "../src/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

async function runMigration() {
  console.log("Starting Multi-Location Inventory Migration...");
  
  // 1. Find all organizations
  const orgs = await db.select().from(schema.organizations);
  console.log(`Found ${orgs.length} organizations.`);

  for (const org of orgs) {
    // 2. Ensure each org has at least one location ("Main Store")
    let locations = await db.select().from(schema.locations).where(eq(schema.locations.organizationId, org.id));
    let mainLocation = locations.find(l => l.name === "Main Store");
    
    if (!mainLocation) {
      console.log(`Creating 'Main Store' location for Org: ${org.name}`);
      const locId = uuidv4();
      await db.insert(schema.locations).values({
        id: locId,
        organizationId: org.id,
        name: "Main Store",
        type: "store",
        status: "active",
      });
      mainLocation = { id: locId, organizationId: org.id, name: "Main Store", type: "store", status: "active" };
    }
    
    // 3. Move products.stock to product_inventory
    const products = await db.select().from(schema.products).where(eq(schema.products.organizationId, org.id));
    console.log(`Org ${org.name}: Found ${products.length} products. Syncing inventory...`);
    
    for (const prod of products) {
      const existingInv = await db.select().from(schema.productInventory).where(
        eq(schema.productInventory.productId, prod.id)
      );
      
      if (existingInv.length === 0) {
        // Insert product inventory based on products.stock
        await db.insert(schema.productInventory).values({
          id: uuidv4(),
          organizationId: org.id,
          productId: prod.id,
          locationId: mainLocation.id,
          stock: prod.stock || "0",
          reorderLevel: prod.reorderLevel || "10",
        });
      }
    }
  }

  console.log("Migration complete!");
}

runMigration().catch(console.error);
