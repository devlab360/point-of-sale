import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
const sql = postgres(process.env.NEON_DB);

async function runMigration() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS "product_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"stock" numeric(10, 3) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(10, 3) DEFAULT '10' NOT NULL
);`;
    await sql`CREATE TABLE IF NOT EXISTS "product_variant_attributes" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL
);`;
    await sql`CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"image" text
);`;
    await sql`ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "product_id" text;`;
    await sql`ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "variant_id" text;`;
    await sql`ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "location_id" text;`;
    await sql`ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "variant_id" text;`;
    await sql`ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "location_id" text;`;
    await sql`ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "variant_id" text;`;
    await sql`ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "location_id" text;`;
    console.log("Custom migration applied successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}

runMigration();
