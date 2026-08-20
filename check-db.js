import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB);

async function check() {
  try {
    const res = await sql`SELECT * FROM users LIMIT 1`;
    console.log("Success! Users table columns:", Object.keys(res[0] || {}));
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await sql.end();
  }
}
check();
