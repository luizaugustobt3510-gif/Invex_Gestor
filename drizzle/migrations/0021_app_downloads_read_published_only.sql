DROP POLICY IF EXISTS "Anyone reads app files" ON storage.objects;
CREATE POLICY "Anyone reads published app files" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'app-downloads'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.app_downloads d
      WHERE d.file_path = storage.objects.name AND d.ativo
    )
  )
);