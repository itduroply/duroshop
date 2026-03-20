-- Rename "Branch Manager" role to "Manager"
UPDATE "public"."roles"
SET "name" = 'Manager'
WHERE "name" = 'Branch Manager';
