-- Migration: Update stock_requests statuses for new workflow
-- Status flow: pending_rm_approval → pending_hr_approval (if hr_approval) OR pending_for_dispatch → ready_for_dispatch → dispatched → delivered

-- Update existing statuses to new names
UPDATE "public"."stock_requests" SET "status" = 'pending_rm_approval' WHERE "status" = 'pending';
UPDATE "public"."stock_requests" SET "status" = 'pending_for_dispatch' WHERE "status" = 'manager_approved';
UPDATE "public"."stock_requests" SET "status" = 'dispatched' WHERE "status" = 'dispatched';

-- Change default status for new rows
ALTER TABLE "public"."stock_requests" ALTER COLUMN "status" SET DEFAULT 'pending_rm_approval';

-- Add hr_approved_by column for tracking who approved at HR level
ALTER TABLE "public"."stock_requests" ADD COLUMN IF NOT EXISTS "hr_approved_by" "uuid" REFERENCES "public"."users"("id");
