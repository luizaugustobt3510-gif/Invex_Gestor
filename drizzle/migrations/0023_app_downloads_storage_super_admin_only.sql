DROP POLICY IF EXISTS "Anyone reads published app files" ON storage.objects;
CREATE POLICY "Super admin reads app files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'app-downloads' AND public.is_super_admin(auth.uid()));