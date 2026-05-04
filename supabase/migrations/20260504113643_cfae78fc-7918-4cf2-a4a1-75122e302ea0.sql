
-- ============================================================
-- 1. Storage: remove overly permissive atestados policies
-- ============================================================
DROP POLICY IF EXISTS "RH/admin can view atestados" ON storage.objects;
DROP POLICY IF EXISTS "RH/admin can upload atestados" ON storage.objects;
DROP POLICY IF EXISTS "RH/admin can delete atestados" ON storage.objects;

-- Also tighten OC PDFs equivalents (same pattern, any auth user)
DROP POLICY IF EXISTS "Admins can delete OC PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload OC PDFs" ON storage.objects;

-- ============================================================
-- 2. Storage: add explicit UPDATE policies (company-scoped)
-- ============================================================
CREATE POLICY "Company members can update their atestados"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT (user_roles.company_id)::text
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'atestados'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT (user_roles.company_id)::text
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Company members can update their OC PDFs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT (user_roles.company_id)::text
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'oc-pdfs'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT (user_roles.company_id)::text
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  )
);

-- ============================================================
-- 3. Audit log: add explicit company_id column and tighten policy
-- ============================================================
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- Backfill from details JSON when possible
UPDATE public.audit_log
SET company_id = NULLIF(details->>'company_id','')::uuid
WHERE company_id IS NULL
  AND details ? 'company_id'
  AND (details->>'company_id') ~* '^[0-9a-f-]{36}$';

CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON public.audit_log(company_id);

DROP POLICY IF EXISTS "Company admins can view audit_log" ON public.audit_log;

CREATE POLICY "Company admins can view audit_log"
ON public.audit_log
FOR SELECT
USING (
  company_id IS NOT NULL
  AND public.is_company_admin(auth.uid(), company_id)
);

-- ============================================================
-- 4. Role check helper scoped to company (for future policies)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role_in_company(
  _user_id uuid,
  _role public.app_role,
  _company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR role = 'super_admin')
  )
$$;
