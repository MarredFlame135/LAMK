CREATE TABLE "blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"privacy_version" text NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "linked_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_profiles" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"username" text,
	"date_of_birth" date,
	"profile_visibility" text DEFAULT 'private' NOT NULL,
	"show_tier" boolean DEFAULT false NOT NULL,
	"vault_visibility" text DEFAULT 'private' NOT NULL,
	"show_follow_lists" boolean DEFAULT false NOT NULL,
	"show_follower_count" boolean DEFAULT false NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vault_items" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text,
	"title" text NOT NULL,
	"image_url" text NOT NULL,
	"note" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "consent_log_customer_idx" ON "consent_log" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "follows_followee_idx" ON "follows" USING btree ("followee_id");--> statement-breakpoint
CREATE INDEX "linked_accounts_provider_account_idx" ON "linked_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "linked_accounts_customer_idx" ON "linked_accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_events_product_type_idx" ON "product_events" USING btree ("product_id","type");--> statement-breakpoint
CREATE INDEX "product_events_created_at_idx" ON "product_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "qr_tokens_customer_idx" ON "qr_tokens" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "social_profiles_username_idx" ON "social_profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "vault_items_customer_idx" ON "vault_items" USING btree ("customer_id");