import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB);

async function check() {
  try {
    const res = await sql`SELECT * FROM appointments;`;
    console.log("Success:", res);
  } catch (e) {
    console.error("Select failed:", e);
  } finally {
    await sql.end();
  }
}
check();
