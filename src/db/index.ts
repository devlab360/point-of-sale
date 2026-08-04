import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";

// Configure postgres-js for serverless / transaction connection pooling (Neon)
// prepare: false is required for PgBouncer / Neon Transaction pool mode
// max: Limits connections to prevent Postgres pool exhaustion
// idle_timeout: Closes idle connections after 20 seconds
// connect_timeout: Timeout after 15s to allow DNS resolution
const client = postgres(connectionString, {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 20,
  connect_timeout: 15,
  max_lifetime: 60 * 30,
  backoff: (retries: number) => Math.min(100 * Math.pow(2, retries), 2000),
});

export const db = drizzle(client, { schema });
