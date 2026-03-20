-- Add auto-incrementing request_number column to stock_requests
-- Format: D00001, D00002, ...

CREATE SEQUENCE IF NOT EXISTS "public"."stock_requests_number_seq" START WITH 1;

ALTER TABLE "public"."stock_requests"
  ADD COLUMN "request_number" "text";

-- Backfill existing rows
UPDATE "public"."stock_requests"
SET "request_number" = 'D' || LPAD(nextval('public.stock_requests_number_seq')::text, 5, '0')
WHERE "request_number" IS NULL;

-- Make it NOT NULL with a default for future rows
CREATE OR REPLACE FUNCTION "public"."set_request_number"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'D' || LPAD(nextval('public.stock_requests_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_set_request_number"
  BEFORE INSERT ON "public"."stock_requests"
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION "public"."set_request_number"();
