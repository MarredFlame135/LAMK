CREATE TABLE "vault_item_reactions" (
	"vault_item_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_item_reactions_vault_item_id_customer_id_pk" PRIMARY KEY("vault_item_id","customer_id")
);
--> statement-breakpoint
CREATE INDEX "vault_item_reactions_item_idx" ON "vault_item_reactions" USING btree ("vault_item_id");