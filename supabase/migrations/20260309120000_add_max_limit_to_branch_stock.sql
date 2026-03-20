ALTER TABLE "public"."branch_stock" ADD COLUMN IF NOT EXISTS "max_limit" integer DEFAULT 0 NOT NULL;
