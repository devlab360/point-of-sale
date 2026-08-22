import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB);

async function run() {
  try {
    console.log("Adding has_variants...");
    await sql.unsafe('ALTER TABLE "products" ADD COLUMN "has_variants" boolean DEFAULT false;');
    
    // Attempt to set has_variants to true for products that have variants
    await sql.unsafe(`
        UPDATE "products" 
        SET "has_variants" = true 
        WHERE "id" IN (SELECT "product_id" FROM "product_variants")
    `);
    
    console.log("Migration applied successfully!");
  } catch (e) {
    if (e.message.includes('already exists')) {
       console.log("Column already exists.");
    } else {
       console.error("Migration failed:", e);
    }
  } finally {
    await sql.end();
  }
}
run();
