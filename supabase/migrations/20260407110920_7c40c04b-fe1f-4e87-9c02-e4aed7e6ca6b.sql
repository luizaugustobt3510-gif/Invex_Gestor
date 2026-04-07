
-- Fix storage policies for oc-pdfs bucket (company-scoped)
DROP POLICY IF EXISTS "Authenticated users can upload OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Company members can download OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete OC PDFs" ON storage.objects;

CREATE POLICY "Company members can view their OC PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company members can upload their OC PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company members can delete their OC PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

-- Fix storage policies for atestados bucket (company-scoped)
DROP POLICY IF EXISTS "Authenticated users can upload atestados" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view atestados" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can download atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload atestados" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete atestados" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view atestados" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload atestados" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete atestados" ON storage.objects;

CREATE POLICY "Company members can view their atestados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company members can upload their atestados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company members can delete their atestados"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

-- Fix termination_reasons: require authentication for default reasons
DROP POLICY IF EXISTS "Anyone can view default reasons" ON public.termination_reasons;
CREATE POLICY "Authenticated users can view default reasons"
ON public.termination_reasons FOR SELECT
TO authenticated
USING (
  is_default = true
  OR company_id IS NULL
  OR is_company_member(auth.uid(), company_id)
  OR is_super_admin(auth.uid())
);
