import { config } from "dotenv";
config({ path: ".env" });
const connectionString = process.env.NEON_DB!;

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/db/schema";
import { v4 as uuidv4 } from "uuid";

async function main() {
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    const orgId = "c8b4088d-9b98-447a-87ff-36a9a783add9";
    const adjId = uuidv4();
    console.log("Attempting insert...");
    
    await db.insert(schema.inventoryAdjustments).values({
      id: adjId,
      organizationId: orgId,
      ref: "ADJ-TEST",
      date: new Date().toISOString(),
      reason: "test",
      items: 543,
      net: "543",
      status: "approved",
    });
    console.log("Insert successful!");
    
    await db.delete(schema.inventoryAdjustments).where(schema.inventoryAdjustments.id.eq(adjId));
  } catch (e: any) {
    console.error("====== DATABASE ERROR ======");
    console.error(e.message);
    if (e.code) console.error("Code:", e.code);
    if (e.detail) console.error("Detail:", e.detail);
    if (e.cause) console.error("Cause:", e.cause);
  } finally {
    await client.end();
  }
}

main();
