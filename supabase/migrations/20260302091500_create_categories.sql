-- Create categories master table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar UNIQUE NOT NULL,
  description text,
  icon_name varchar,
  display_order int,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Optional: helpful index for ordering active categories
CREATE INDEX IF NOT EXISTS categories_active_order_idx
  ON public.categories (is_active, display_order);

-- Add category foreign key to items table
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS category_id uuid;

ALTER TABLE public.items
  ADD CONSTRAINT items_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS items_category_id_idx
  ON public.items (category_id);
