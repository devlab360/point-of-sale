ALTER TABLE "suppliers" ADD COLUMN "pan" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "credit_limit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "account_number" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "ifsc_swift" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "upi_id" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;