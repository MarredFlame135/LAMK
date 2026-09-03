ALTER TABLE "product_events" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "product_events_dedupe_idx" ON "product_events" USING btree ("dedupe_key");