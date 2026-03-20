-- Remove RLS policies for development

-- activity_logs
DROP POLICY IF EXISTS "Allow authenticated users to view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow authenticated users to create activity logs" ON public.activity_logs;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- items
DROP POLICY IF EXISTS "Allow authenticated users to view items" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated users to create items" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated users to update items" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated users to delete items" ON public.items;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
