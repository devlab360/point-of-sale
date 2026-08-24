ALTER TABLE "inventory_batches" ADD COLUMN "batch_no" text;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "mfg_date" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "selling_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "mrp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD COLUMN "supplier_id" text;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inv_batch_expiry_idx" ON "inventory_batches" USING btree ("organization_id","expiry_date");