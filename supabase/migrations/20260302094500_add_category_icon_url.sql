-- Add icon_url to categories for uploaded icons
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon_url text;
