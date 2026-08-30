CREATE TABLE "vault_purchase_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text NOT NULL,
	"product_title" text NOT NULL,
	"image_url" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vault_purchase_claims_customer_idx" ON "vault_purchase_claims" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "vault_purchase_claims_status_idx" ON "vault_purchase_claims" USING btree ("status");