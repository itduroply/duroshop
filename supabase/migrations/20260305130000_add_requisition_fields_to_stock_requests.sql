-- Add requisition detail columns to stock_requests
ALTER TABLE "public"."stock_requests"
  ADD COLUMN "reason" "text",
  ADD COLUMN "expected_date" "date",
  ADD COLUMN "notes" "text",
  ADD COLUMN "assigned_to" "uuid" REFERENCES "public"."users"("id"),
  ADD COLUMN "category_id" "uuid" REFERENCES "public"."categories"("id");
