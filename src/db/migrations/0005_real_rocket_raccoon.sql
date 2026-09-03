CREATE TABLE "hidden_products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"hidden_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layaway_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"product_image" text DEFAULT '' NOT NULL,
	"requested_size" text DEFAULT 'N/A' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"percentage" integer NOT NULL,
	"deposit_amount" numeric(12, 2) NOT NULL,
	"hype_score" integer DEFAULT 0 NOT NULL,
	"customer_phone" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"payment_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_sales" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"items_summary" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"pending_balance" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"payment_status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_demand_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"requested_size" text DEFAULT 'N/A' NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"customer_email" text DEFAULT '' NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"raw_query" text DEFAULT '' NOT NULL,
	"was_matched" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"brand" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"size_options" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text NOT NULL,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verified_reviews_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE INDEX "layaway_phone_idx" ON "layaway_reservations" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "layaway_status_idx" ON "layaway_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offline_sales_created_idx" ON "offline_sales" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "demand_matched_idx" ON "product_demand_requests" USING btree ("was_matched");