DROP POLICY IF EXISTS "clinical_evolutions_insert" ON public.clinical_evolutions;
DROP POLICY IF EXISTS "clinical_evolutions_update" ON public.clinical_evolutions;
DROP POLICY IF EXISTS "clinical_evolutions_delete" ON public.clinical_evolutions;

CREATE POLICY "clinical evolutions delete clinical"
ON public.clinical_evolutions
FOR DELETE
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
  )
);