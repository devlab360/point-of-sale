import { config } from "dotenv";
config();

import postgres from "postgres";

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";
const sql = postgres(connectionString, { ssl: 'require' });

async function run() {
  console.log("Running Phase 2 migration (Part 2)...");

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_batch_consumptions (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
      sale_id TEXT REFERENCES sales(id),
      quantity_consumed NUMERIC(10,3) NOT NULL,
      consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS inv_batch_cons_batch_idx ON inventory_batch_consumptions(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS inv_batch_cons_sale_idx ON inventory_batch_consumptions(sale_id)`;
  console.log("✓ Created inventory_batch_consumptions table");

  console.log("\n✅ Phase 2 migration (Part 2) complete!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
