import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";

// Configure postgres-js for serverless / transaction connection pooling (e.g., Neon / PgBouncer / Hyperdrive)
// max: Limits connections per instance to prevent Postgres connection exhaustion under high concurrency
// idle_timeout: Closes idle connections after 20 seconds in serverless environments
// connect_timeout: Aborts connection attempt after 10 seconds to fail fast
// prepare: Must be false when using PgBouncer / Neon Transaction pool mode
const client = postgres(connectionString, {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
