
-- 1) Table
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  module_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, role, module_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_module_permissions TO authenticated;
GRANT ALL ON public.role_module_permissions TO service_role;

ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read role permissions"
  ON public.role_module_permissions FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can insert role permissions"
  ON public.role_module_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update role permissions"
  ON public.role_module_permissions FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete role permissions"
  ON public.role_module_permissions FOR DELETE
  TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_role_module_permissions_updated_at
  BEFORE UPDATE ON public.role_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Compat seed: every (company, role, module) starts active so no one loses access.
-- Admin da empresa pode restringir depois.
INSERT INTO public.role_module_permissions (company_id, role, module_key, is_active)
SELECT c.id, r.role, m.module_key, true
FROM public.companies c
CROSS JOIN (
  SELECT unnest(enum_range(NULL::app_role)) AS role
) r
CROSS JOIN (
  VALUES
    ('logistica'),('rh'),('financeiro'),('vendas'),('manutencao'),
    ('academia'),('agenda'),('prontuario'),('clinica'),('ordem_servico'),
    ('relatorios'),('invex_fitness')
) m(module_key)
ON CONFLICT (company_id, role, module_key) DO NOTHING;

-- 3) Function used by frontend/RLS to check role→module access
CREATE OR REPLACE FUNCTION public.role_has_module(
  _user_id uuid,
  _company_id uuid,
  _module_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Super admin and company admin bypass matrix
    public.is_super_admin(_user_id)
    OR public.is_company_admin(_user_id, _company_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_module_permissions rmp
        ON rmp.company_id = _company_id
       AND rmp.role = ur.role
       AND rmp.module_key = _module_key
      WHERE ur.user_id = _user_id
        AND (ur.company_id = _company_id OR ur.role = 'super_admin')
        AND rmp.is_active = true
    )
    -- Backwards-compat: if no matrix row exists yet for that (company,role,module),
    -- default to allow so nobody loses access.
    OR NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_module_permissions rmp
        ON rmp.company_id = _company_id
       AND rmp.role = ur.role
       AND rmp.module_key = _module_key
      WHERE ur.user_id = _user_id
        AND (ur.company_id = _company_id OR ur.role = 'super_admin')
    );
$$;
