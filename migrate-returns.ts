import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const connectionString = process.env.NEON_DB;
if (!connectionString) {
  throw new Error("NEON_DB is not set");
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log("Starting Return Tables Normalization Migration...");

  try {
    // 1. Create tables using raw SQL (easier for migration script)
    console.log("Creating sales_return_items table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "sales_return_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "return_id" text NOT NULL,
        "product_id" text NOT NULL,
        "product_name" text NOT NULL,
        "quantity" integer NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "total" numeric(10, 2) NOT NULL,
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action,
        FOREIGN KEY ("return_id") REFERENCES "sales_returns"("id") ON DELETE cascade ON UPDATE no action
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS "sales_return_items_org_idx" ON "sales_return_items" ("organization_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "sales_return_items_ret_idx" ON "sales_return_items" ("return_id");`;

    console.log("Creating purchase_return_items table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "purchase_return_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "return_id" text NOT NULL,
        "product_id" text NOT NULL,
        "product_name" text NOT NULL,
        "quantity" integer NOT NULL,
        "cost" numeric(10, 2) NOT NULL,
        "total" numeric(10, 2) NOT NULL,
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action,
        FOREIGN KEY ("return_id") REFERENCES "purchase_returns"("id") ON DELETE cascade ON UPDATE no action
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS "purchase_return_items_org_idx" ON "purchase_return_items" ("organization_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "purchase_return_items_ret_idx" ON "purchase_return_items" ("return_id");`;

    // 2. Migrate salesReturns items
    console.log("Migrating Sales Returns items...");
    // Check if items column still exists
    const srCols =
      await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_returns' AND column_name = 'items'`;
    if (srCols.length > 0) {
      const salesReturns = await sql`SELECT id, organization_id, items FROM "sales_returns"`;
      for (const ret of salesReturns) {
        let items = [];
        if (typeof ret.items === "string") {
          try {
            items = JSON.parse(ret.items);
          } catch (e) {}
        } else if (Array.isArray(ret.items)) {
          items = ret.items;
        }

        if (items && items.length > 0) {
          for (const item of items) {
            await sql`
               INSERT INTO "sales_return_items" 
               ("organization_id", "return_id", "product_id", "product_name", "quantity", "price", "total")
               VALUES
               (${ret.organization_id}, ${ret.id}, ${item.productId || ""}, ${item.productName || "Unknown"}, ${item.quantity || 1}, ${item.price || 0}, ${item.total || 0})
             `;
          }
        }
      }
      console.log("Dropping items column from sales_returns...");
      await sql`ALTER TABLE "sales_returns" DROP COLUMN "items"`;
    } else {
      console.log("sales_returns items column already migrated/dropped.");
    }

    // 3. Migrate purchaseReturns items
    console.log("Migrating Purchase Returns items...");
    const prCols =
      await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_returns' AND column_name = 'items'`;
    if (prCols.length > 0) {
      const purchaseReturns = await sql`SELECT id, organization_id, items FROM "purchase_returns"`;
      for (const ret of purchaseReturns) {
        let items = [];
        if (typeof ret.items === "string") {
          try {
            items = JSON.parse(ret.items);
          } catch (e) {}
        } else if (Array.isArray(ret.items)) {
          items = ret.items;
        }

        if (items && items.length > 0) {
          for (const item of items) {
            await sql`
               INSERT INTO "purchase_return_items" 
               ("organization_id", "return_id", "product_id", "product_name", "quantity", "cost", "total")
               VALUES
               (${ret.organization_id}, ${ret.id}, ${item.productId || ""}, ${item.productName || "Unknown"}, ${item.quantity || 1}, ${item.cost || item.price || 0}, ${item.total || 0})
             `;
          }
        }
      }
      console.log("Dropping items column from purchase_returns...");
      await sql`ALTER TABLE "purchase_returns" DROP COLUMN "items"`;
    } else {
      console.log("purchase_returns items column already migrated/dropped.");
    }

    console.log("Migration Complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

main();
