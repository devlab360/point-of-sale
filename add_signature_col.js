import postgres from "postgres";
import { config } from "dotenv";

config(); // load .env

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";
if (!connectionString) {
  console.error("No database connection string found.");
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  try {
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS signature_url TEXT;`;
    console.log("Successfully added signature_url column.");
  } catch (err) {
    console.error("Failed to add column:", err);
  } finally {
    await sql.end();
  }
}

main();
