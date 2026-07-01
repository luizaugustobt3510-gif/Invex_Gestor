
-- Policies for prontuario-anexos: path is "<company_id>/<record_id>/<filename>"
CREATE POLICY "prontuario_att_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'prontuario-anexos'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "prontuario_att_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prontuario-anexos'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "prontuario_att_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'prontuario-anexos'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
