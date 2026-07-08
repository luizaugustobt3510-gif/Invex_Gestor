
-- Material requests: require domain access on DELETE (mirror SELECT restriction)
DROP POLICY IF EXISTS "Module write reqs delete" ON public.material_requests;
CREATE POLICY "Module write reqs delete"
ON public.material_requests
FOR DELETE
USING (
  public.user_can_write_module(auth.uid(), company_id, 'logistica')
  AND public.user_has_domain_access(auth.uid(), company_id, 'logistica')
);

-- user_roles UPDATE: make USING match WITH CHECK (also forbid escalation to admin_empresa in USING)
DROP POLICY IF EXISTS "Company admins can update roles" ON public.user_roles;
CREATE POLICY "Company admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin_empresa'::app_role])
  AND user_id <> auth.uid()
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin_empresa'::app_role])
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = user_roles.company_id
  )
);
