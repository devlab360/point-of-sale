import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB);

async function run() {
  try {
    console.log("Adding service variants schema...");
    
    // Add has_variants to services
    try {
        await sql.unsafe('ALTER TABLE "services" ADD COLUMN "has_variants" boolean DEFAULT false;');
        console.log("Added has_variants to services");
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log("Column has_variants already exists on services.");
        } else {
            throw e;
        }
    }
    
    // Create service_variants
    await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS "service_variants" (
            "id" text PRIMARY KEY NOT NULL,
            "organization_id" text NOT NULL,
            "service_id" text NOT NULL,
            "name" text NOT NULL,
            "price" numeric(10, 2) NOT NULL,
            "cost" numeric(10, 2) NOT NULL,
            "duration" integer,
            CONSTRAINT "service_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action,
            CONSTRAINT "service_variants_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action
        );
    `);
    console.log("Created service_variants");
    
    // Create service_variant_attributes
    await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS "service_variant_attributes" (
            "id" text PRIMARY KEY NOT NULL,
            "variant_id" text NOT NULL,
            "name" text NOT NULL,
            "value" text NOT NULL,
            CONSTRAINT "service_variant_attributes_variant_id_service_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."service_variants"("id") ON DELETE cascade ON UPDATE no action
        );
    `);
    console.log("Created service_variant_attributes");
    
    // Create indexes if they don't exist
    try {
        await sql.unsafe('CREATE INDEX "svc_variant_org_idx" ON "service_variants" USING btree ("organization_id");');
        await sql.unsafe('CREATE INDEX "svc_variant_svc_idx" ON "service_variants" USING btree ("service_id");');
        await sql.unsafe('CREATE INDEX "svc_variant_attr_idx" ON "service_variant_attributes" USING btree ("variant_id");');
    } catch (e) {
        console.log("Indexes might already exist:", e.message);
    }
    
    console.log("Migration applied successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}
run();
