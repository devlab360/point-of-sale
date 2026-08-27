import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.NEON_DB || "postgres://postgres:@localhost:5432/pos_db";

const isLocalHost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const clientOptions = {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 5),
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: isLocalHost ? false : (process.env.DATABASE_SSL === "true" ? ("require" as const) : false),
  max_lifetime: 60 * 30,
  max_retries: 3,
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
