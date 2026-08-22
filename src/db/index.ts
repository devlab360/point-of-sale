import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";

const clientOptions = {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 5),
  idle_timeout: 20,       // Keep connection alive for 20s of inactivity (Neon cold-start buffer)
  connect_timeout: 15,    // Allow up to 15s for Neon serverless cold-start
  ssl: 'require' as const,
  max_lifetime: 60 * 30,
  max_retries: 3,         // Auto-retry transient connection failures
  backoff: (retries: number) => Math.min(500 * Math.pow(2, retries), 5000),
};

const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client = globalForPostgres.postgresClient ?? postgres(connectionString, clientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });
