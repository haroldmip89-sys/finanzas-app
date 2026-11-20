CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"mindful_enabled" boolean DEFAULT true NOT NULL,
	"mindful_threshold_cents" bigint DEFAULT 10000 NOT NULL,
	"mindful_pause_minutes" integer DEFAULT 1440 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_threshold_positive" CHECK ("user_settings"."mindful_threshold_cents" > 0),
	CONSTRAINT "user_settings_pause_allowed" CHECK ("user_settings"."mindful_pause_minutes" in (10, 1440))
);
--> statement-breakpoint
ALTER TABLE "avoided_purchases" ADD COLUMN "remind_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "avoided_purchases" ADD CONSTRAINT "avoided_purchases_remind_postponed" CHECK ("avoided_purchases"."remind_at" is null or "avoided_purchases"."status" = 'postponed');