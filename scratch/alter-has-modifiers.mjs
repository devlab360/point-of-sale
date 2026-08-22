import { config } from "dotenv";
config();
import postgres from "postgres";

async function main() {
  const dbUrl = process.env.NEON_DB || process.env.DATABASE_URL;
  const sql = postgres(dbUrl, { connect_timeout: 15000 });
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS has_modifiers boolean DEFAULT false`;
  console.log('Done');
}
main().catch(console.error);
