import { db } from "./src/db/index";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    console.log("Testing query...");
    const result = await db.select().from(users).where(eq(users.email, "aktarsamim529@gmail.com")).limit(1);
    console.log("Success:", result);
  } catch (error) {
    console.error("Query Failed.");
    console.error("Error Object:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    // Also try printing the raw postgres error if it's attached
    console.error("JSON Dump:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
  process.exit(0);
}

main();
