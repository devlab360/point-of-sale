import { db } from "./index";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "migrations"),
    });
    console.log("✅ Migrations completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigrations();
