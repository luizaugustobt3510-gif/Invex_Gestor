
-- Allow clinical roles to create and view their own material requests
DROP POLICY IF EXISTS "Module write reqs insert" ON public.material_requests;
CREATE POLICY "Module write reqs insert" ON public.material_requests
FOR INSERT TO authenticated
WITH CHECK (
  is_company_member(auth.uid(), company_id)
  AND (
    (user_can_write_module(auth.uid(), company_id, 'logistica') AND user_has_domain_access(auth.uid(), company_id, 'logistica'))
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = material_requests.company_id
        AND ur.role IN ('enfermagem','enfermeiro','recepcionista','clinica','admin_empresa')
    )
  )
);

DROP POLICY IF EXISTS "Restrict logistics requests by domain" ON public.material_requests;
CREATE POLICY "Restrict logistics requests by domain" ON public.material_requests
FOR SELECT TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    user_has_domain_access(auth.uid(), company_id, 'logistica')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = material_requests.company_id
        AND ur.role IN ('enfermagem','enfermeiro','recepcionista','clinica','admin_empresa')
    )
  )
);
