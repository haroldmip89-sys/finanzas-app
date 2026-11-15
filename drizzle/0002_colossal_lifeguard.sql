ALTER TABLE "categories" ADD COLUMN "system_key" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_system_key_unique" UNIQUE("user_id","system_key");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_system_key_valid" CHECK ("categories"."system_key" IS NULL
        OR ("categories"."system_key" = 'adjustment_income' AND "categories"."kind" = 'income')
        OR ("categories"."system_key" = 'adjustment_expense' AND "categories"."kind" = 'expense'));