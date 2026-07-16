
CREATE POLICY "Users manage own signature files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
