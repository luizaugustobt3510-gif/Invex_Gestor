
-- Grant clinical roles (enfermagem, enfermeiro, recepcionista, clinica) the ability
-- to VIEW logistics stock (materials) and use Dispensação, without giving them
-- write access to logistics. This is the "stock read authorization for nursing".

-- 1) Ensure role_module_permissions rows exist and are ACTIVE for the modules
-- the clinical staff need. Do this per-company that has anamnese/clinica active.
DO $$
DECLARE
  c RECORD;
  r TEXT;
  m TEXT;
  clinical_roles TEXT[] := ARRAY['enfermagem','enfermeiro','recepcionista','clinica'];
  clinical_modules TEXT[] := ARRAY['clinica','anamnese','pacientes','agenda','evolucao','dispensacao','assinaturas','dashboard'];
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    FOREACH r IN ARRAY clinical_roles LOOP
      FOREACH m IN ARRAY clinical_modules LOOP
        INSERT INTO public.role_module_permissions (company_id, role, module_key, is_active)
        VALUES (c.id, r::public.app_role, m, true)
        ON CONFLICT (company_id, role, module_key)
        DO UPDATE SET is_active = true, updated_at = now();
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 2) Add a dedicated permissive SELECT policy on materials for clinical roles
-- (they can SEE stock but not modify it). is_company_member already allows this
-- broadly, but this policy makes the intent explicit and durable.
DROP POLICY IF EXISTS "Clinical roles can view materials" ON public.materials;
CREATE POLICY "Clinical roles can view materials"
ON public.materials
FOR SELECT
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    public.has_role_in_company(auth.uid(), 'enfermagem'::public.app_role, company_id)
    OR public.has_role_in_company(auth.uid(), 'enfermeiro'::public.app_role, company_id)
    OR public.has_role_in_company(auth.uid(), 'recepcionista'::public.app_role, company_id)
    OR public.has_role_in_company(auth.uid(), 'clinica'::public.app_role, company_id)
  )
);
