CREATE TABLE "branch_price_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"entity_type" text DEFAULT 'product' NOT NULL,
	"entity_id" text NOT NULL,
	"price" numeric(10, 2),
	"cost" numeric(10, 2),
	"wholesale_price" numeric(10, 2),
	"dealer_price" numeric(10, 2),
	"mrp" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_price_override_branch_entity_idx" UNIQUE("branch_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_membership_org_user_idx" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "kitchen_order_tickets" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "industry_type" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "manager_name" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "is_head_office" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "industry_type" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "branch_pricing_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch_id" text;--> statement-breakpoint
ALTER TABLE "branch_price_overrides" ADD CONSTRAINT "branch_price_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_price_overrides" ADD CONSTRAINT "branch_price_overrides_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_price_overrides_org_idx" ON "branch_price_overrides" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "branch_price_overrides_branch_idx" ON "branch_price_overrides" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_memberships_org_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_order_tickets" ADD CONSTRAINT "kitchen_order_tickets_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_branch_idx" ON "expenses" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "rentals_branch_idx" ON "rentals" USING btree ("branch_id");