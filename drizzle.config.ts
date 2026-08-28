import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
const dbUrl = (process.env.DIRECT_URL || process.env.NEON_DB || process.env.DATABASE_URL || "").replace(":6543/", ":5432/");

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
} satisfies Config;
