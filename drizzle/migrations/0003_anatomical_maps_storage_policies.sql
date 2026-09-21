CREATE POLICY "anatomical_maps_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'anatomical-maps'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "anatomical_maps_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anatomical-maps'
    AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "anatomical_maps_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'anatomical-maps'
    AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "anatomical_maps_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'anatomical-maps'
    AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );