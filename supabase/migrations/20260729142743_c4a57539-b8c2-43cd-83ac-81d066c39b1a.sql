CREATE OR REPLACE FUNCTION public.has_clinical_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.is_company_admin(_user_id, _company_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.company_id = _company_id
          AND ur.role IN ('clinica','enfermagem','enfermeiro','recepcionista')
      )
$$;

CREATE POLICY "patients_clinical_domain_only"
ON public.patients
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id))
WITH CHECK (public.has_clinical_access(auth.uid(), company_id));