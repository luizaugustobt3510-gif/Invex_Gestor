
DROP POLICY IF EXISTS "anamnese_templates write admin/clinica" ON public.anamnese_templates;
DROP POLICY IF EXISTS "anamnese_templates update admin/clinica" ON public.anamnese_templates;

CREATE POLICY "anamnese_templates write clinical"
  ON public.anamnese_templates FOR INSERT
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
    )
  );

CREATE POLICY "anamnese_templates update clinical"
  ON public.anamnese_templates FOR UPDATE
  USING (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
    )
  )
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
    )
  );
