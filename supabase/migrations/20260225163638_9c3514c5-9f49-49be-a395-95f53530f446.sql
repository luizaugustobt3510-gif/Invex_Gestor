
-- =============================================
-- Company Modules (Feature Flags por empresa)
-- =============================================
CREATE TABLE public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_key)
);

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access company_modules"
  ON public.company_modules FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can view own modules"
  ON public.company_modules FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_company_modules_updated_at
  BEFORE UPDATE ON public.company_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Company Plans (Planos e limites por empresa)
-- =============================================
CREATE TABLE public.company_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'basico',
  max_users integer NOT NULL DEFAULT 5,
  max_items integer NOT NULL DEFAULT 500,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access company_plans"
  ON public.company_plans FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can view own plan"
  ON public.company_plans FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_company_plans_updated_at
  BEFORE UPDATE ON public.company_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- System Config (Configurações globais)
-- =============================================
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access system_config"
  ON public.system_config FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can read system_config"
  ON public.system_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Audit Log (Logs de auditoria)
-- =============================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access audit_log"
  ON public.audit_log FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can view audit_log"
  ON public.audit_log FOR SELECT
  USING (public.is_company_admin(auth.uid(), COALESCE((details->>'company_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- Insert default system config
INSERT INTO public.system_config (config_key, config_value) VALUES
  ('system_name', 'Invex'),
  ('primary_color', '#1B5E20');

-- Add status column to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';
