CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"mindful_enabled" boolean DEFAULT true NOT NULL,
	"mindful_threshold_cents" bigint DEFAULT 10000 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_threshold_positive" CHECK ("user_settings"."mindful_threshold_cents" > 0)
);
