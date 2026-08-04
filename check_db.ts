import { config } from "dotenv";
config({ path: ".env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  const client = postgres(process.env.NEON_DB!, { max: 1 });
  const db = drizzle(client);

  try {
    const res = await client`SELECT id, organization_id, store_name FROM settings`;
    console.log("Settings rows:", res);
    
    const users = await client`SELECT id, organization_id, name, email FROM users`;
    console.log("Users rows:", users);
  } catch (e: any) {
    console.error("====== DATABASE ERROR ======");
    console.error(e.message);
  } finally {
    await client.end();
  }
}

main();
