import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sql = postgres(process.env.NEON_DB!);
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code text;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS time_zone text;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format text;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS language text;`;
    console.log("Migration successful!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    process.exit(0);
  }
}

main();
