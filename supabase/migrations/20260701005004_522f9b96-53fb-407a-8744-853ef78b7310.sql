
-- Restrict system_config reads to super admins only
DROP POLICY IF EXISTS "Authenticated can read system_config" ON public.system_config;

-- Tighten user_roles UPDATE and INSERT policies to prevent self-privilege escalation
DROP POLICY IF EXISTS "Company admins can update roles" ON public.user_roles;
CREATE POLICY "Company admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  AND role <> 'super_admin'::app_role
  AND user_id <> auth.uid()
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin_empresa'::app_role])
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = user_roles.user_id AND p.company_id = user_roles.company_id
  )
);

DROP POLICY IF EXISTS "Company admins can insert roles" ON public.user_roles;
CREATE POLICY "Company admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  AND role <> ALL (ARRAY['super_admin'::app_role, 'admin_empresa'::app_role])
  AND user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = user_roles.user_id AND p.company_id = user_roles.company_id
  )
);
