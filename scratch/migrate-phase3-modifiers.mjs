import { config } from "dotenv";
config();

import postgres from "postgres";

async function main() {
  const dbUrl = process.env.NEON_DB || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("NEON_DB or DATABASE_URL is not set");
  }

  const sql = postgres(dbUrl, { connect_timeout: 15000 });

  console.log("Adding product_modifiers table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "product_modifiers" (
      "id" text PRIMARY KEY NOT NULL,
      "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "selection_type" text DEFAULT 'multiple' NOT NULL,
      "is_required" boolean DEFAULT false NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL
    );
  `;
  
  console.log("Adding product_modifiers indexes...");
  await sql`CREATE INDEX IF NOT EXISTS "product_modifiers_org_idx" ON "product_modifiers" ("organization_id");`;
  await sql`CREATE INDEX IF NOT EXISTS "product_modifiers_product_idx" ON "product_modifiers" ("product_id");`;

  console.log("Adding product_modifier_options table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "product_modifier_options" (
      "id" text PRIMARY KEY NOT NULL,
      "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "modifier_id" text NOT NULL REFERENCES "product_modifiers"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "price" numeric(10, 2) DEFAULT '0' NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL
    );
  `;
  
  console.log("Adding product_modifier_options indexes...");
  await sql`CREATE INDEX IF NOT EXISTS "modifier_options_org_idx" ON "product_modifier_options" ("organization_id");`;
  await sql`CREATE INDEX IF NOT EXISTS "modifier_options_modifier_idx" ON "product_modifier_options" ("modifier_id");`;

  console.log("Adding modifiers column to sale_items...");
  try {
    await sql`ALTER TABLE "sale_items" ADD COLUMN "modifiers" jsonb;`;
  } catch (e) {
    if (!e.message.includes("already exists")) {
      throw e;
    }
  }

  console.log("Phase 3 Modifiers migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
