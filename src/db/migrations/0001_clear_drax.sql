CREATE TABLE "inventory_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref" text NOT NULL,
	"date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"items" integer NOT NULL,
	"net" numeric(12, 2) NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref" text NOT NULL,
	"date" timestamp NOT NULL,
	"destination" text NOT NULL,
	"items" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "coupons_org_idx";--> statement-breakpoint
DROP INDEX "coupons_code_idx";--> statement-breakpoint
DROP INDEX "expenses_org_date_idx";--> statement-breakpoint
DROP INDEX "gift_cards_org_idx";--> statement-breakpoint
DROP INDEX "gift_cards_code_idx";--> statement-breakpoint
DROP INDEX "promotions_org_idx";--> statement-breakpoint
DROP INDEX "purchase_returns_org_idx";--> statement-breakpoint
DROP INDEX "purchase_returns_pur_idx";--> statement-breakpoint
DROP INDEX "purchases_supp_idx";--> statement-breakpoint
DROP INDEX "saas_sessions_org_idx";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "is_system" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "discount" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "value" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "conditions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_returns" ALTER COLUMN "items" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_returns" ALTER COLUMN "stock_restored" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "narration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "paid" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "due" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "purchase_items" jsonb;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD CONSTRAINT "loyalty_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_brands_id_fk" FOREIGN KEY ("brand") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_unit_units_id_fk" FOREIGN KEY ("unit") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_salesman_id_users_id_fk" FOREIGN KEY ("salesman_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "purchases_supplier_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sales_salesman_idx" ON "sales" USING btree ("salesman_id");--> statement-breakpoint
ALTER TABLE "saas_sessions" DROP COLUMN "org_id";