
ALTER TABLE public.user_signatures ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_shared_signature_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_shared AND NOT public.is_company_admin(auth.uid(), NEW.company_id) THEN
      NEW.is_shared := false;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_shared IS DISTINCT FROM OLD.is_shared
       AND NOT public.is_company_admin(auth.uid(), NEW.company_id) THEN
      RAISE EXCEPTION 'Somente administradores podem definir assinaturas padrão da empresa';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_shared_signature_admin ON public.user_signatures;
CREATE TRIGGER trg_enforce_shared_signature_admin
BEFORE INSERT OR UPDATE ON public.user_signatures
FOR EACH ROW EXECUTE FUNCTION public.enforce_shared_signature_admin();

DROP POLICY IF EXISTS "Clinical staff view shared signatures" ON public.user_signatures;
CREATE POLICY "Clinical staff view shared signatures"
ON public.user_signatures FOR SELECT TO authenticated
USING (
  is_shared = true
  AND public.is_company_member(auth.uid(), company_id)
  AND public.has_clinical_access(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "Company admins manage signatures" ON public.user_signatures;
CREATE POLICY "Company admins manage signatures"
ON public.user_signatures FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Clinical staff read shared signature files" ON storage.objects;
CREATE POLICY "Clinical staff read shared signature files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND EXISTS (
    SELECT 1 FROM public.user_signatures us
    WHERE us.image_url = storage.objects.name
      AND us.is_shared = true
      AND public.is_company_member(auth.uid(), us.company_id)
      AND public.has_clinical_access(auth.uid(), us.company_id)
  )
);
