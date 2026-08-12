CREATE TABLE "sale_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"transaction_ref" text,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_taxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"tax_name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"duration" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_id_products_id_fk";
--> statement-breakpoint
DROP INDEX "sale_items_prod_idx";--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "zip_code" text;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "reference_type" text DEFAULT 'PRODUCT' NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "reference_id" text DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cash_tendered" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "change_due" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "receipt_declaration" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bank_details" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "upi_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_taxes" ADD CONSTRAINT "sale_taxes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_taxes" ADD CONSTRAINT "sale_taxes_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_payments_org_idx" ON "sale_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_idx" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_taxes_org_idx" ON "sale_taxes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sale_taxes_sale_idx" ON "sale_taxes" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "services_org_idx" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "sale_items_ref_idx" ON "sale_items" USING btree ("reference_type","reference_id");