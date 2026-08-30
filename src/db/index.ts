import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:@localhost:5432/pos_db";

const isLocalHost =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const clientOptions = {
  prepare: false,
  max: Number(process.env.DB_POOL_MAX || 25),
  idle_timeout: 30,
  connect_timeout: 10,
  // ssl: isLocalHost ? false : process.env.DATABASE_SSL === "true" ? ("require" as const) : false,
  max_lifetime: 60 * 30,
  max_retries: 3,
  backoff: (retries: number) => Math.min(200 * Math.pow(2, retries), 2000),
};

const globalForPostgres = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client = globalForPostgres.postgresClient ?? postgres(connectionString, clientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });
