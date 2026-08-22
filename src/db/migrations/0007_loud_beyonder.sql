CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"service_id" text,
	"service_name" text NOT NULL,
	"staff_id" text,
	"staff_name" text,
	"date_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_order_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"table_id" text,
	"waiter_id" text,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"stock" numeric(10, 3) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(10, 3) DEFAULT '10' NOT NULL,
	CONSTRAINT "prod_inv_prod_loc_idx" UNIQUE("product_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "product_variant_attributes" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"image" text,
	CONSTRAINT "variant_sku_idx" UNIQUE("sku","organization_id"),
	CONSTRAINT "variant_barcode_idx" UNIQUE("barcode","organization_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"current_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prod_inv_org_idx" ON "product_inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "variant_attr_idx" ON "product_variant_attributes" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_prod_idx" ON "product_variants" USING btree ("product_id");