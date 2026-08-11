import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";

const clientOptions = {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 5,
  connect_timeout: 3,
  ssl: 'require' as const,
  max_lifetime: 60 * 30,
  backoff: (retries: number) => Math.min(100 * Math.pow(2, retries), 2000),
};

const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client = globalForPostgres.postgresClient ?? postgres(connectionString, clientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });
