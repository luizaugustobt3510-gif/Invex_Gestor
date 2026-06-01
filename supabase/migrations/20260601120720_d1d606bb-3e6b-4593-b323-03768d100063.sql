
DROP POLICY IF EXISTS "Members view payroll_forecast" ON public.payroll_forecast;
CREATE POLICY "Admin/RH/Fin view payroll_forecast" ON public.payroll_forecast
FOR SELECT USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

DROP POLICY IF EXISTS "Members view payroll_events" ON public.payroll_events;
CREATE POLICY "Admin/RH/Fin view payroll_events" ON public.payroll_events
FOR SELECT USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

DROP POLICY IF EXISTS "Members view payroll_config" ON public.payroll_config;
CREATE POLICY "Admin/RH/Fin view payroll_config" ON public.payroll_config
FOR SELECT USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

DROP POLICY IF EXISTS "Company members can view manutencao files" ON storage.objects;
DROP POLICY IF EXISTS "Manutencao users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Manutencao users can delete files" ON storage.objects;

CREATE POLICY "Manutencao company view" ON storage.objects FOR SELECT
USING (
  bucket_id = 'manutencao-anexos' AND auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (SELECT (company_id)::text FROM user_roles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Manutencao company upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'manutencao-anexos' AND auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (SELECT (company_id)::text FROM user_roles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Manutencao company update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'manutencao-anexos' AND auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (SELECT (company_id)::text FROM user_roles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Manutencao company delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'manutencao-anexos' AND auth.uid() IS NOT NULL AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (SELECT (company_id)::text FROM user_roles WHERE user_id = auth.uid())
  )
);
