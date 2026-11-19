CREATE TYPE "public"."avoided_reason" AS ENUM('not_needed', 'out_of_budget', 'can_wait', 'other');--> statement-breakpoint
CREATE TYPE "public"."avoided_status" AS ENUM('avoided', 'postponed');--> statement-breakpoint
CREATE TABLE "avoided_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"date" date NOT NULL,
	"category_id" uuid,
	"category_kind" "category_kind" DEFAULT 'expense' NOT NULL,
	"reason" "avoided_reason",
	"note" text,
	"status" "avoided_status" DEFAULT 'avoided' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avoided_purchases_kind_expense" CHECK ("avoided_purchases"."category_kind" = 'expense'),
	CONSTRAINT "avoided_purchases_amount_positive" CHECK ("avoided_purchases"."amount_cents" > 0),
	CONSTRAINT "avoided_purchases_note_length" CHECK ("avoided_purchases"."note" is null or char_length("avoided_purchases"."note") <= 120)
);
--> statement-breakpoint
ALTER TABLE "avoided_purchases" ADD CONSTRAINT "avoided_purchases_category_owner_kind_fk" FOREIGN KEY ("category_id","user_id","category_kind") REFERENCES "public"."categories"("id","user_id","kind") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avoided_purchases_user_date_idx" ON "avoided_purchases" USING btree ("user_id","date" DESC NULLS LAST);