ALTER TABLE "organizations" ADD COLUMN "extra_users_quota" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "saas_plans" ADD COLUMN "per_extra_user_price" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_permissions" jsonb;