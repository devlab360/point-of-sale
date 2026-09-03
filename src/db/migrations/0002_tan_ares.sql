-- ============================================================
-- MIGRATION 0002: Soft Delete + Audit Timestamps
-- Adds created_at / updated_at / deleted_at to all tables,
-- partial unique indexes that exclude soft-deleted rows,
-- and auto-update triggers for updated_at.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. ADD COLUMNS (Drizzle-generated)
-- ──────────────────────────────────────────────────────────

ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_menu_grants" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_menu_grants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_menu_grants" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "branch_price_overrides" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "customer_ledgers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_ledgers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_ledgers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_challans" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_challans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_challans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "held_invoices" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "held_invoices" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "held_invoices" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "kitchen_order_tickets" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "org_subscriptions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_modifier_options" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_modifier_options" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_modifier_options" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_modifiers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "supplier_ledgers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_ledgers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "supplier_ledgers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tax_masters" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_branches" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_branches" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_org_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_org_idx" ON "faqs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "help_articles_org_idx" ON "help_articles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_adj_org_idx" ON "inventory_adjustments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_xfer_org_idx" ON "inventory_transfers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kitchen_tickets_org_idx" ON "kitchen_order_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_members_org_idx" ON "loyalty_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restaurant_tables_org_idx" ON "restaurant_tables" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_org_idx" ON "reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_org_idx" ON "support_tickets" USING btree ("organization_id");

-- ──────────────────────────────────────────────────────────
-- 2. UNIQUE CONSTRAINTS
--    Standard PostgreSQL unique constraints check all rows
--    including soft-deleted rows as specified.
-- ──────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────
-- 3. DELETED_AT FILTER INDEXES (speed up soft-delete queries)
--    Every table with deleted_at gets a filtered index so
--    WHERE deleted_at IS NULL is fast.
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_organizations_deleted" ON "organizations" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_deleted" ON "users" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_deleted" ON "products" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_categories_deleted" ON "categories" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_brands_deleted" ON "brands" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_deleted" ON "customers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_deleted" ON "suppliers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_services_deleted" ON "services" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_locations_deleted" ON "locations" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expenses_deleted" ON "expenses" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_deleted" ON "sales" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchases_deleted" ON "purchases" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_settings_deleted" ON "settings" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_shifts_deleted" ON "shifts" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_saas_plans_deleted" ON "saas_plans" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_subscriptions_deleted" ON "org_subscriptions" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_masters_deleted" ON "tax_masters" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_variants_deleted" ON "product_variants" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_inventory_deleted" ON "product_inventory" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_batches_deleted" ON "inventory_batches" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coupons_deleted" ON "coupons" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gift_cards_deleted" ON "gift_cards" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotions_deleted" ON "promotions" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotations_deleted" ON "quotations" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_delivery_challans_deleted" ON "delivery_challans" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_repairs_deleted" ON "repairs" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_deleted" ON "subscriptions" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rentals_deleted" ON "rentals" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vouchers_deleted" ON "vouchers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_deleted" ON "accounts" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cash_movements_deleted" ON "cash_movements" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_ledgers_deleted" ON "customer_ledgers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplier_ledgers_deleted" ON "supplier_ledgers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_log_deleted" ON "activity_log" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_deleted" ON "notifications" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_held_invoices_deleted" ON "held_invoices" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_returns_deleted" ON "sales_returns" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_purchase_returns_deleted" ON "purchase_returns" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_adjustments_deleted" ON "inventory_adjustments" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_transfers_deleted" ON "inventory_transfers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loyalty_members_deleted" ON "loyalty_members" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_help_articles_deleted" ON "help_articles" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_faqs_deleted" ON "faqs" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_deleted" ON "support_tickets" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_deleted" ON "reviews" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_deleted" ON "appointments" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_restaurant_tables_deleted" ON "restaurant_tables" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kitchen_order_tickets_deleted" ON "kitchen_order_tickets" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_payments_deleted" ON "subscription_payments" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_variants_deleted" ON "service_variants" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_bundles_deleted" ON "product_bundles" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_modifiers_deleted" ON "product_modifiers" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_modifier_options_deleted" ON "product_modifier_options" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_branch_price_overrides_deleted" ON "branch_price_overrides" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_organization_memberships_deleted" ON "organization_memberships" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_menu_grants_deleted" ON "admin_menu_grants" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_branches_deleted" ON "user_branches" ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_movements_deleted" ON "inventory_movements" ("deleted_at") WHERE "deleted_at" IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS set_updated_at ON "organizations"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "organizations" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "organization_memberships"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "organization_memberships" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "saas_plans"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "saas_plans" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "org_subscriptions"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "org_subscriptions" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "admin_menu_grants"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "admin_menu_grants" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "users"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "user_branches"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "user_branches" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "categories"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "brands"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "brands" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "units"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "units" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "tax_masters"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "tax_masters" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "suppliers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "suppliers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "products"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "product_variants"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "product_bundles"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_bundles" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "product_modifiers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_modifiers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "product_modifier_options"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_modifier_options" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "services"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "services" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "service_variants"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "service_variants" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "branch_price_overrides"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "branch_price_overrides" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "customers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "sales"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "sales" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "purchases"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "purchases" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "settings"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "settings" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "expenses"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "expenses" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "coupons"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "coupons" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "gift_cards"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "gift_cards" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "promotions"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "promotions" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "activity_log"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "activity_log" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "notifications"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "notifications" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "held_invoices"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "held_invoices" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "sales_returns"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "sales_returns" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "purchase_returns"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "purchase_returns" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "locations"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "locations" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "shifts"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "shifts" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "cash_movements"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "cash_movements" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "customer_ledgers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "customer_ledgers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "supplier_ledgers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "supplier_ledgers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "quotations"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "quotations" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "delivery_challans"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "delivery_challans" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "accounts"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "accounts" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "vouchers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "vouchers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "repairs"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "repairs" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "subscriptions"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "subscriptions" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "rentals"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "rentals" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "loyalty_members"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "loyalty_members" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "help_articles"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "help_articles" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "faqs"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "faqs" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "support_tickets"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "support_tickets" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "reviews"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "appointments"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "appointments" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "restaurant_tables"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "restaurant_tables" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "kitchen_order_tickets"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "kitchen_order_tickets" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "subscription_payments"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "subscription_payments" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "inventory_movements"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "inventory_movements" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "inventory_batches"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "inventory_batches" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "product_inventory"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_inventory" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "inventory_adjustments"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "inventory_adjustments" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at ON "inventory_transfers"; CREATE TRIGGER set_updated_at BEFORE UPDATE ON "inventory_transfers" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
