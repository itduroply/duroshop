-- Add quantity column to visiting_card_requests
ALTER TABLE "public"."visiting_card_requests"
ADD COLUMN "quantity" integer NOT NULL DEFAULT 1;
