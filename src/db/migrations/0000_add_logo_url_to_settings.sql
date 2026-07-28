CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"is_system" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user" text NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"timestamp" timestamp NOT NULL,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "adjustments" (
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
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"products" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "brand_name_idx" UNIQUE("name","organization_id")
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"shift_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'oklch(0.7 0.1 200)' NOT NULL,
	"icon" text DEFAULT '📦' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cat_name_idx" UNIQUE("name","organization_id")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"discount" numeric(12, 2) NOT NULL,
	"usage_limit" integer NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"expires" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ledgers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reference_no" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"loyalty_points" integer DEFAULT 0,
	"visits" integer DEFAULT 0,
	"total_spent" numeric(12, 2) DEFAULT '0',
	"credit" numeric(10, 2) DEFAULT '0',
	"credit_limit" numeric(10, 2),
	"wallet_balance" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'regular',
	"type" text DEFAULT 'retail',
	"gstin" text,
	"state_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_challans" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"challan_no" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"date" timestamp NOT NULL,
	"items" jsonb NOT NULL,
	"status" text NOT NULL,
	"transport_name" text,
	"vehicle_no" text,
	"driver_name" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"initial_balance" numeric(12, 2),
	"customer" text,
	"issued" timestamp,
	"expires" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "held_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"cart" jsonb NOT NULL,
	"discount" numeric(12, 2) NOT NULL,
	"payment" text NOT NULL,
	"saved_at" timestamp NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_name" text NOT NULL,
	"action" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"token" text NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"permissions" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text,
	"timestamp" timestamp NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_email" text NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"current_plan_id" text DEFAULT 'basic' NOT NULL,
	"plan_expiry_date" timestamp,
	"sync_key" text DEFAULT 'default-sync-key' NOT NULL,
	"is_online" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text NOT NULL,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"unit" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 10 NOT NULL,
	"image" text,
	"status" text DEFAULT 'active' NOT NULL,
	"expiry_date" timestamp,
	"wholesale_price" numeric(10, 2),
	"dealer_price" numeric(10, 2),
	"min_wholesale_qty" integer,
	"has_serial" boolean DEFAULT false,
	"serials" jsonb,
	"has_batch" boolean DEFAULT false,
	"batches" jsonb,
	"location_rack" text,
	"location_shelf" text,
	"location_bin" text,
	"hsn_code" text,
	"gst_rate" numeric(5, 2),
	"tax_inclusive" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sku_idx" UNIQUE("sku","organization_id"),
	CONSTRAINT "barcode_idx" UNIQUE("barcode","organization_id")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"conditions" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"cgst" numeric(10, 2),
	"sgst" numeric(10, 2),
	"igst" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "purchase_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref" text NOT NULL,
	"purchase_id" text NOT NULL,
	"supplier" text NOT NULL,
	"reason" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" text NOT NULL,
	"date" timestamp NOT NULL,
	"stock_restored" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" text,
	"supplier" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"invoice_no" text,
	"items" integer NOT NULL,
	"status" text NOT NULL,
	"subtotal" numeric(12, 2),
	"discount_amt" numeric(12, 2),
	"tax_amt" numeric(12, 2),
	"cgst_amt" numeric(12, 2),
	"sgst_amt" numeric(12, 2),
	"igst_amt" numeric(12, 2),
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"quotation_no" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"date" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amt" numeric(12, 2) NOT NULL,
	"tax_amt" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rental_no" text NOT NULL,
	"customer_name" text NOT NULL,
	"item_name" text NOT NULL,
	"rent_start_date" timestamp NOT NULL,
	"expected_return_date" timestamp NOT NULL,
	"daily_rate" numeric(12, 2) NOT NULL,
	"security_deposit" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ticket_no" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"device_name" text NOT NULL,
	"serial_or_imei" text,
	"problem_description" text NOT NULL,
	"estimated_cost" numeric(12, 2) NOT NULL,
	"advance_paid" numeric(12, 2) NOT NULL,
	"status" text NOT NULL,
	"date" timestamp NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "saas_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"features" jsonb,
	"limits" jsonb,
	"is_trial_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"login_at" timestamp NOT NULL,
	"logout_at" timestamp,
	"ip_address" text,
	"device" text,
	"status" text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"serial_number" text,
	"batch_no" text
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"items" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2),
	"discount_amt" numeric(12, 2),
	"tax_amt" numeric(12, 2),
	"cgst_amt" numeric(12, 2),
	"sgst_amt" numeric(12, 2),
	"igst_amt" numeric(12, 2),
	"payment_method" text NOT NULL,
	"payments" jsonb,
	"salesman_id" text,
	"salesman_name" text,
	"commission_amt" numeric(10, 2),
	"status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref" text NOT NULL,
	"sale_id" text NOT NULL,
	"customer_name" text,
	"reason" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" text NOT NULL,
	"date" timestamp NOT NULL,
	"stock_restored" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
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
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"open_time" timestamp NOT NULL,
	"close_time" timestamp,
	"starting_cash" numeric(12, 2) NOT NULL,
	"expected_cash" numeric(12, 2) NOT NULL,
	"actual_cash" numeric(12, 2),
	"difference" numeric(12, 2),
	"status" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"subscription_no" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"plan_name" text NOT NULL,
	"billing_cycle" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"next_billing_date" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_ledgers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reference_no" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"items" integer DEFAULT 0 NOT NULL,
	"gstin" text,
	"state_code" text
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ref" text NOT NULL,
	"date" timestamp NOT NULL,
	"destination" text NOT NULL,
	"items" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text NOT NULL,
	"last_active" timestamp DEFAULT now(),
	"status" text DEFAULT 'active' NOT NULL,
	"avatar" text,
	"phone" text,
	"location" text,
	"joined" timestamp,
	"pin" text,
	"permissions" jsonb,
	"commission_rate" numeric(5, 2),
	"monthly_target" numeric(12, 2),
	"earned_commission" numeric(12, 2),
	"email_verified" boolean DEFAULT false,
	"email_verification_token" text,
	"country_code" text,
	"time_zone" text,
	"date_format" text,
	"language" text,
	CONSTRAINT "user_email_idx" UNIQUE("email","organization_id")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"voucher_no" text NOT NULL,
	"date" timestamp NOT NULL,
	"type" text NOT NULL,
	"debit_account_id" text NOT NULL,
	"credit_account_id" text NOT NULL,
	"debit_account_name" text NOT NULL,
	"credit_account_name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"narration" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledgers" ADD CONSTRAINT "customer_ledgers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_challans" ADD CONSTRAINT "delivery_challans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "held_invoices" ADD CONSTRAINT "held_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ledgers" ADD CONSTRAINT "supplier_ledgers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_org_idx" ON "accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "activity_log_org_time_idx" ON "activity_log" USING btree ("organization_id","timestamp");--> statement-breakpoint
CREATE INDEX "adjustments_org_idx" ON "adjustments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "brands_org_idx" ON "brands" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cash_move_org_shift_idx" ON "cash_movements" USING btree ("organization_id","shift_id");--> statement-breakpoint
CREATE INDEX "categories_org_idx" ON "categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "coupons_org_idx" ON "coupons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "cust_ledg_org_cust_idx" ON "customer_ledgers" USING btree ("organization_id","customer_id","date");--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "delivery_challans_org_idx" ON "delivery_challans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expenses_org_date_idx" ON "expenses" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "gift_cards_org_idx" ON "gift_cards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "held_invoices_org_idx" ON "held_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inv_move_org_idx" ON "inventory_movements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inv_move_prod_idx" ON "inventory_movements" USING btree ("product_name");--> statement-breakpoint
CREATE INDEX "invitations_org_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "locations_org_idx" ON "locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_org_time_idx" ON "notifications" USING btree ("organization_id","timestamp");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promotions_org_idx" ON "promotions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "purchase_items_org_idx" ON "purchase_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_org_idx" ON "purchase_returns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_pur_idx" ON "purchase_returns" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_org_date_idx" ON "purchases" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "purchases_supp_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "quotations_org_idx" ON "quotations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rentals_org_idx" ON "rentals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repairs_org_idx" ON "repairs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "saas_sessions_org_idx" ON "saas_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "saas_sessions_user_idx" ON "saas_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sale_items_org_idx" ON "sale_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_prod_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_org_date_idx" ON "sales" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "sales_cust_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_returns_org_idx" ON "sales_returns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sales_returns_sale_idx" ON "sales_returns" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "settings_org_idx" ON "settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shifts_org_user_idx" ON "shifts" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "supp_ledg_org_supp_idx" ON "supplier_ledgers" USING btree ("organization_id","supplier_id","date");--> statement-breakpoint
CREATE INDEX "suppliers_org_idx" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transfers_org_idx" ON "transfers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "units_org_idx" ON "units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vouchers_org_date_idx" ON "vouchers" USING btree ("organization_id","date");