-- Add reporting_manager column to users table
ALTER TABLE "public"."users"
  ADD COLUMN "reporting_manager" "uuid" REFERENCES "public"."users"("id");
