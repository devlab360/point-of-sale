CREATE TABLE "admin_menu_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"menu_key" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_menu_grants_org_menu_idx" UNIQUE("organization_id","menu_key")
);
--> statement-breakpoint
CREATE TABLE "inventory_batch_consumptions" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"sale_id" text,
	"quantity_consumed" numeric(10, 3) NOT NULL,
	"consumed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text,
	"purchase_cost" numeric(10, 2) NOT NULL,
	"quantity_received" numeric(10, 3) NOT NULL,
	"quantity_remaining" numeric(10, 3) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"purchase_order_id" text,
	"batch_note" text
);
--> statement-breakpoint
CREATE TABLE "org_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"billing_cycle" text DEFAULT 'trial' NOT NULL,
	"locked_price" numeric(10, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"start_date" timestamp NOT NULL,
	"renewal_date" timestamp,
	"expiry_date" timestamp,
	"activated_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"bundle_product_id" text NOT NULL,
	"component_product_id" text NOT NULL,
	"component_variant_id" text,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_modifier_options" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"modifier_id" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"selection_type" text DEFAULT 'multiple' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_variant_attributes" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"service_id" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"utr_number" text NOT NULL,
	"payment_method" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2),
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "super_admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saas_plans" ALTER COLUMN "price" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_variants" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "course" text DEFAULT 'Main Course';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_bundle" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "track_fifo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_modifiers" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "type" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "monthly_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "yearly_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "custom_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "menus" jsonb;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "trial_days" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "target_org_id" text;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "modifiers" jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "has_variants" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "admin_menu_grants" ADD CONSTRAINT "admin_menu_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batch_consumptions" ADD CONSTRAINT "inventory_batch_consumptions_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batch_consumptions" ADD CONSTRAINT "inventory_batch_consumptions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_plan_id_saas_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."saas_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_component_variant_id_product_variants_id_fk" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_options" ADD CONSTRAINT "product_modifier_options_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_options" ADD CONSTRAINT "product_modifier_options_modifier_id_product_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."product_modifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD CONSTRAINT "product_modifiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD CONSTRAINT "product_modifiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variant_attributes" ADD CONSTRAINT "service_variant_attributes_variant_id_service_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."service_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_saas_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."saas_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "super_admin_sessions" ADD CONSTRAINT "super_admin_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_menu_grants_org_idx" ON "admin_menu_grants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inv_batch_cons_batch_idx" ON "inventory_batch_consumptions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "inv_batch_cons_sale_idx" ON "inventory_batch_consumptions" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "inv_batch_product_idx" ON "inventory_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inv_batch_org_idx" ON "inventory_batches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_subs_org_idx" ON "org_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_subs_status_idx" ON "org_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bundle_product_idx" ON "product_bundles" USING btree ("bundle_product_id");--> statement-breakpoint
CREATE INDEX "bundle_component_idx" ON "product_bundles" USING btree ("component_product_id");--> statement-breakpoint
CREATE INDEX "bundle_org_idx" ON "product_bundles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "modifier_options_org_idx" ON "product_modifier_options" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "modifier_options_modifier_idx" ON "product_modifier_options" USING btree ("modifier_id");--> statement-breakpoint
CREATE INDEX "product_modifiers_org_idx" ON "product_modifiers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_modifiers_product_idx" ON "product_modifiers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "svc_variant_attr_idx" ON "service_variant_attributes" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "svc_variant_org_idx" ON "service_variants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "svc_variant_svc_idx" ON "service_variants" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "sub_payments_org_idx" ON "subscription_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sub_payments_status_idx" ON "subscription_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sa_sessions_user_idx" ON "super_admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sa_sessions_expiry_idx" ON "super_admin_sessions" USING btree ("expires_at");