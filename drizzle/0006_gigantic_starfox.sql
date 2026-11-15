CREATE TABLE "installment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"principal_cents" bigint NOT NULL,
	"installment_count" integer NOT NULL,
	"installment_cents" bigint NOT NULL,
	"first_due_month" date NOT NULL,
	"paid_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installment_plans_principal_positive" CHECK ("installment_plans"."principal_cents" > 0),
	CONSTRAINT "installment_plans_installment_positive" CHECK ("installment_plans"."installment_cents" > 0),
	CONSTRAINT "installment_plans_count_range" CHECK ("installment_plans"."installment_count" between 2 and 60),
	CONSTRAINT "installment_plans_paid_range" CHECK ("installment_plans"."paid_count" >= 0 and "installment_plans"."paid_count" <= "installment_plans"."installment_count"),
	CONSTRAINT "installment_plans_month_first_day" CHECK ("installment_plans"."first_due_month" = date_trunc('month', "installment_plans"."first_due_month")::date)
);
--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_account_owner_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "installment_plans_user_idx" ON "installment_plans" USING btree ("user_id");