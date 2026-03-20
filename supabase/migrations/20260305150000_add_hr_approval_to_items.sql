-- Add hr_approval column to items table
ALTER TABLE "public"."items" ADD COLUMN "hr_approval" boolean DEFAULT false NOT NULL;
