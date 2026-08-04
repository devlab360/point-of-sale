CREATE TABLE "purchase_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"return_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"return_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_category_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_brand_brands_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_unit_units_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_purchase_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."purchase_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_return_items_org_idx" ON "purchase_return_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "purchase_return_items_ret_idx" ON "purchase_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "sales_return_items_org_idx" ON "sales_return_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sales_return_items_ret_idx" ON "sales_return_items" USING btree ("return_id");--> statement-breakpoint
ALTER TABLE "purchase_returns" DROP COLUMN "items";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "items";