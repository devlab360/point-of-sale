import { config } from "dotenv";
config({ path: ".env" });
const connectionString = process.env.NEON_DB!;

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations successfully applied!");
  } catch (e: any) {
    console.error("====== DATABASE ERROR ======");
    console.error(e.message);
  } finally {
    await client.end();
  }
}

main();
