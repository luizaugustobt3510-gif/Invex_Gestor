-- Restringir acesso ao bucket atestados a perfis RH/admin
DROP POLICY IF EXISTS "Company members can view their atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload their atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete their atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update their atestados" ON storage.objects;

CREATE POLICY "RH/admin can view atestados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
        AND ur.role IN ('admin_empresa','rh','visualizador')
    )
  )
);

CREATE POLICY "RH/admin can upload atestados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
        AND ur.role IN ('admin_empresa','rh')
    )
  )
);

CREATE POLICY "RH/admin can update atestados"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
        AND ur.role IN ('admin_empresa','rh')
    )
  )
);

CREATE POLICY "RH/admin can delete atestados"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
        AND ur.role IN ('admin_empresa','rh')
    )
  )
);