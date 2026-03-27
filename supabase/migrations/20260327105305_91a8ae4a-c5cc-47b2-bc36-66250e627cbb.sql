
-- Table for per-user module permissions
CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, module_key)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Company admins can manage user module permissions
CREATE POLICY "Company admins can view user_module_permissions"
  ON public.user_module_permissions FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR user_id = auth.uid());

CREATE POLICY "Company admins can insert user_module_permissions"
  ON public.user_module_permissions FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update user_module_permissions"
  ON public.user_module_permissions FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete user_module_permissions"
  ON public.user_module_permissions FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access user_module_permissions"
  ON public.user_module_permissions FOR ALL
  USING (is_super_admin(auth.uid()));

-- Add unique constraint on company_modules for upsert
ALTER TABLE public.company_modules ADD CONSTRAINT company_modules_company_module_unique UNIQUE (company_id, module_key);
