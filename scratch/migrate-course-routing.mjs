import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.NEON_DB);

async function main() {
  try {
    const checkRes = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='products' and column_name='course';
    `;
    
    if (checkRes.length === 0) {
      console.log("Adding 'course' column to 'products' table...");
      await sql`
        ALTER TABLE products 
        ADD COLUMN course text DEFAULT 'Main Course';
      `;
      console.log("Column added successfully!");
    } else {
      console.log("'course' column already exists.");
    }
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await sql.end();
  }
}

main();
