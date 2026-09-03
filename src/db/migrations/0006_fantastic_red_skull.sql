ALTER TABLE "vault_items" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "vault_items" ADD COLUMN "order_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "vault_items_order_product_idx" ON "vault_items" USING btree ("order_id","product_id","customer_id");