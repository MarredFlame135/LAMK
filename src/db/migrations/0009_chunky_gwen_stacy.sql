CREATE TABLE "vault_collection_ratings" (
	"owner_id" text NOT NULL,
	"rater_id" text NOT NULL,
	"stars" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_collection_ratings_owner_id_rater_id_pk" PRIMARY KEY("owner_id","rater_id")
);
--> statement-breakpoint
CREATE INDEX "vault_collection_ratings_owner_idx" ON "vault_collection_ratings" USING btree ("owner_id");