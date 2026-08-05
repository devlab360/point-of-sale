CREATE INDEX "coupons_org_idx" ON "coupons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expenses_org_idx" ON "expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "gift_cards_org_idx" ON "gift_cards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promotions_org_idx" ON "promotions" USING btree ("organization_id");