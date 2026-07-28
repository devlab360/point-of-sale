import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL || "";
const client = postgres(connectionString);
const db = drizzle(client);

async function run() {
  console.log("Creating settings table...");
  try {
    await client`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "trial_ends_at" timestamp,
        "trial_days" integer,
        "subscription_status" text,
        "currency_symbol" text,
        "currency_code" text,
        "store_name" text NOT NULL,
        "tax_id" text,
        "address" text,
        "phone" text,
        "email" text,
        "standard_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
        "reduced_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
        "prices_include_tax" boolean DEFAULT false NOT NULL,
        "show_tax_breakdown" boolean DEFAULT true NOT NULL,
        "header_note" text,
        "footer_note" text,
        "email_receipt_default" boolean DEFAULT true NOT NULL,
        "print_store_logo" boolean DEFAULT true NOT NULL,
        "logo_url" text,
        "country_code" text,
        "time_zone" text,
        "date_format" text,
        "language" text,
        "enable_gst" boolean DEFAULT false,
        "gstin" text,
        "state_code" text,
        "business_type" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    // If the table already existed but without logoUrl, let's ensure logo_url exists.
    try {
      await client`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_url" text;`;
    } catch(e) {}
    
    await client`
      CREATE INDEX IF NOT EXISTS "settings_org_idx" ON "settings" USING btree ("organization_id");
    `;
    console.log("Settings table created/updated successfully!");
  } catch (err) {
    console.error("Error creating settings table:", err);
  } finally {
    await client.end();
  }
}

run();
