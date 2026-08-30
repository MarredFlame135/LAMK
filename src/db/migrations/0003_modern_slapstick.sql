CREATE TABLE "account_deletion_requests" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_for" timestamp NOT NULL
);
