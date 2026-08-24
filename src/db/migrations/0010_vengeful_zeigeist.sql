ALTER TABLE "purchase_return_items" ALTER COLUMN "quantity" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "cash_tendered" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "change_due" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "sales_return_items" ALTER COLUMN "quantity" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mrp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "expiry_warning_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "stock_allocation_method" text DEFAULT 'FIFO';