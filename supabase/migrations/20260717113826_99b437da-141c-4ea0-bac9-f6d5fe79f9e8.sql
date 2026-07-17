
-- Anamneses: allow enfermagem/enfermeiro/recepcionista to insert/update
DROP POLICY IF EXISTS "anamneses insert admin/clinica" ON public.anamneses;
DROP POLICY IF EXISTS "anamneses update admin/clinica" ON public.anamneses;

CREATE POLICY "anamneses insert clinical" ON public.anamneses
  FOR INSERT
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
    )
  );

CREATE POLICY "anamneses update clinical" ON public.anamneses
  FOR UPDATE
  USING (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
    )
  )
  WITH CHECK (
    is_company_member(auth.uid(), company_id) AND (
      is_company_admin(auth.uid(), company_id)
      OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
      OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
    )
  );

-- Same for clinical_evolutions if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='clinical_evolutions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "clinical_evolutions insert clinical" ON public.clinical_evolutions';
    EXECUTE 'DROP POLICY IF EXISTS "clinical_evolutions update clinical" ON public.clinical_evolutions';
    EXECUTE $p$CREATE POLICY "clinical_evolutions insert clinical" ON public.clinical_evolutions
      FOR INSERT WITH CHECK (
        is_company_member(auth.uid(), company_id) AND (
          is_company_admin(auth.uid(), company_id)
          OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
        )
      )$p$;
    EXECUTE $p$CREATE POLICY "clinical_evolutions update clinical" ON public.clinical_evolutions
      FOR UPDATE USING (
        is_company_member(auth.uid(), company_id) AND (
          is_company_admin(auth.uid(), company_id)
          OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
        )
      )
      WITH CHECK (
        is_company_member(auth.uid(), company_id) AND (
          is_company_admin(auth.uid(), company_id)
          OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
          OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
        )
      )$p$;
  END IF;
END $$;
