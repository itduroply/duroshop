-- Allow authenticated users to upload and read category icons
-- Ensure bucket exists before applying policies

-- Storage policies live in the storage schema
CREATE POLICY "Allow authenticated uploads to category_icon"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category_icon');

CREATE POLICY "Allow authenticated reads from category_icon"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'category_icon');

CREATE POLICY "Allow authenticated updates to category_icon"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'category_icon')
WITH CHECK (bucket_id = 'category_icon');

CREATE POLICY "Allow authenticated deletes from category_icon"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'category_icon');
