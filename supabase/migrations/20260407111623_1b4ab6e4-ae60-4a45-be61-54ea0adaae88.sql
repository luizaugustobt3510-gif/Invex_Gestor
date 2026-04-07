
-- Drop existing company admin policies on user_roles
DROP POLICY IF EXISTS "Company admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can delete roles" ON public.user_roles;

-- Recreate with company membership check and block admin_empresa assignment
CREATE POLICY "Company admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  AND role NOT IN ('super_admin', 'admin_empresa')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = user_roles.company_id
  )
);

CREATE POLICY "Company admins can update roles"
ON public.user_roles FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  AND role NOT IN ('super_admin', 'admin_empresa')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = user_roles.company_id
  )
);

CREATE POLICY "Company admins can delete roles"
ON public.user_roles FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  AND role NOT IN ('super_admin'::app_role, 'admin_empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = user_roles.company_id
  )
);
