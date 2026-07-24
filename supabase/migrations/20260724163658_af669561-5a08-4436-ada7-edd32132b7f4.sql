-- Fix: enfermagem/enfermeiro/recepcionista/clinica cannot see materials catalog because
-- the RESTRICTIVE policy "Restrict logistics materials by domain" required logistica
-- domain access. Clinical roles must be able to view the catalog to request materials.

DROP POLICY IF EXISTS "Restrict logistics materials by domain" ON public.materials;

CREATE POLICY "Restrict logistics materials by domain"
  ON public.materials
  AS RESTRICTIVE
  FOR SELECT
  USING (
    user_has_domain_access(auth.uid(), company_id, 'logistica')
    OR has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    OR has_role_in_company(auth.uid(), 'admin_empresa'::app_role, company_id)
    OR is_super_admin(auth.uid())
  );