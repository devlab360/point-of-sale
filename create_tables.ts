import { config } from "dotenv";
config({ path: ".env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  const client = postgres(process.env.NEON_DB!, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("Creating tables if they don't exist...");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "inventory_adjustments" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "ref" text NOT NULL,
        "date" timestamp NOT NULL,
        "reason" text NOT NULL,
        "items" integer NOT NULL,
        "net" numeric(12, 2) NOT NULL,
        "status" text NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS "inventory_transfers" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "ref" text NOT NULL,
        "date" timestamp NOT NULL,
        "destination" text NOT NULL,
        "items" integer NOT NULL,
        "status" text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "inventory_movements" (
        "id" serial PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "product_name" text NOT NULL,
        "action" text NOT NULL,
        "quantity" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("Tables created successfully!");
  } catch (e: any) {
    console.error("====== DATABASE ERROR ======");
    console.error("Message:", e.message);
    console.error("Code:", e.code);
    console.error("Cause:", e.cause);
  } finally {
    await client.end();
  }
}

main();
