require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEON_DB || process.env.DATABASE_URL);

async function run() {
  console.log("Running Phase 2 migration...");

  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS track_fifo BOOLEAN DEFAULT FALSE`;
  console.log("✓ Added is_bundle, track_fifo to products");

  await sql`
    CREATE TABLE IF NOT EXISTS product_bundles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      bundle_product_id TEXT NOT NULL,
      component_product_id TEXT NOT NULL,
      component_variant_id TEXT,
      quantity NUMERIC(10,3) NOT NULL DEFAULT 1
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS bundle_product_idx ON product_bundles(bundle_product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS bundle_component_idx ON product_bundles(component_product_id)`;
  console.log("✓ Created product_bundles table");

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      location_id TEXT,
      purchase_cost NUMERIC(10,2) NOT NULL,
      quantity_received NUMERIC(10,3) NOT NULL,
      quantity_remaining NUMERIC(10,3) NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      purchase_order_id TEXT,
      batch_note TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS inv_batch_product_idx ON inventory_batches(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS inv_batch_org_idx ON inventory_batches(organization_id)`;
  console.log("✓ Created inventory_batches table");

  console.log("\n✅ Phase 2 migration complete!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
