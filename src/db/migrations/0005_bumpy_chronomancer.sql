ALTER TABLE "inventory_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "reorder_level" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "reorder_level" SET DEFAULT '10';--> statement-breakpoint
ALTER TABLE "purchase_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "purchase_return_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "sales_return_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "allow_fractional" boolean DEFAULT false NOT NULL;