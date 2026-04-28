-- ============ PAYROLL TAX BRACKETS (INSS/IRRF) ============
CREATE TABLE public.payroll_tax_brackets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NULL, -- NULL = global default (2025)
  tax_type TEXT NOT NULL CHECK (tax_type IN ('inss', 'irrf')),
  year INTEGER NOT NULL DEFAULT 2025,
  min_value NUMERIC NOT NULL DEFAULT 0,
  max_value NUMERIC NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  deduction NUMERIC NOT NULL DEFAULT 0,
  dependent_deduction NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_tax_brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view tax brackets"
ON public.payroll_tax_brackets FOR SELECT TO authenticated
USING (company_id IS NULL OR is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admin can manage own brackets"
ON public.payroll_tax_brackets FOR ALL TO authenticated
USING (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id))
WITH CHECK (company_id IS NOT NULL AND is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full tax brackets"
ON public.payroll_tax_brackets FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Seed INSS 2025 (faixas progressivas)
INSERT INTO public.payroll_tax_brackets (company_id, tax_type, year, min_value, max_value, rate, deduction) VALUES
(NULL, 'inss', 2025, 0,        1518.00, 7.5,  0),
(NULL, 'inss', 2025, 1518.01,  2793.88, 9.0,  0),
(NULL, 'inss', 2025, 2793.89,  4190.83, 12.0, 0),
(NULL, 'inss', 2025, 4190.84,  8157.41, 14.0, 0);

-- Seed IRRF 2025 (com dedução por dependente R$ 189,59)
INSERT INTO public.payroll_tax_brackets (company_id, tax_type, year, min_value, max_value, rate, deduction, dependent_deduction) VALUES
(NULL, 'irrf', 2025, 0,        2428.80, 0,     0,      189.59),
(NULL, 'irrf', 2025, 2428.81,  2826.65, 7.5,   182.16, 189.59),
(NULL, 'irrf', 2025, 2826.66,  3751.05, 15.0,  394.16, 189.59),
(NULL, 'irrf', 2025, 3751.06,  4664.68, 22.5,  675.49, 189.59),
(NULL, 'irrf', 2025, 4664.69,  NULL,    27.5,  908.73, 189.59);

-- ============ PAYROLL CONFIG ============
CREATE TABLE public.payroll_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  competencia TEXT NOT NULL, -- 'YYYY-MM'
  inss_mode TEXT NOT NULL DEFAULT 'auto' CHECK (inss_mode IN ('auto','manual')),
  inss_manual_rate NUMERIC NOT NULL DEFAULT 0,
  irrf_mode TEXT NOT NULL DEFAULT 'auto' CHECK (irrf_mode IN ('auto','manual')),
  irrf_manual_rate NUMERIC NOT NULL DEFAULT 0,
  vt_mode TEXT NOT NULL DEFAULT 'percent' CHECK (vt_mode IN ('percent','fixed')),
  vt_value NUMERIC NOT NULL DEFAULT 6,
  other_discounts NUMERIC NOT NULL DEFAULT 0,
  -- Encargos patronais
  inss_patronal_rate NUMERIC NOT NULL DEFAULT 20,
  fgts_rate NUMERIC NOT NULL DEFAULT 8,
  rat_rate NUMERIC NOT NULL DEFAULT 2,
  sistema_s_rate NUMERIC NOT NULL DEFAULT 5.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, competencia)
);

ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payroll_config"
ON public.payroll_config FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/RH/Fin manage payroll_config"
ON public.payroll_config FOR ALL
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

CREATE POLICY "Super admin full payroll_config"
ON public.payroll_config FOR ALL
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============ PAYROLL EVENTS ============
CREATE TABLE public.payroll_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bonus','desconto','falta','pensao','dependentes','vt','outros')),
  description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  is_percent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payroll_events"
ON public.payroll_events FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/RH/Fin manage payroll_events"
ON public.payroll_events FOR ALL
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

CREATE POLICY "Super admin full payroll_events"
ON public.payroll_events FOR ALL
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============ PAYROLL FORECAST ============
CREATE TABLE public.payroll_forecast (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  benefits_total NUMERIC NOT NULL DEFAULT 0,
  benefits_company NUMERIC NOT NULL DEFAULT 0,
  benefits_employee NUMERIC NOT NULL DEFAULT 0,
  bonus_total NUMERIC NOT NULL DEFAULT 0,
  faltas_value NUMERIC NOT NULL DEFAULT 0,
  inss_value NUMERIC NOT NULL DEFAULT 0,
  irrf_value NUMERIC NOT NULL DEFAULT 0,
  vt_value NUMERIC NOT NULL DEFAULT 0,
  pensao_value NUMERIC NOT NULL DEFAULT 0,
  other_discounts NUMERIC NOT NULL DEFAULT 0,
  total_discounts NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  encargos_patronais NUMERIC NOT NULL DEFAULT 0,
  company_cost NUMERIC NOT NULL DEFAULT 0,
  dependents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','gerado','cancelado')),
  financial_entry_id UUID NULL,
  generated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, competencia)
);

ALTER TABLE public.payroll_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payroll_forecast"
ON public.payroll_forecast FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/RH/Fin manage payroll_forecast"
ON public.payroll_forecast FOR ALL
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
)
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
);

CREATE POLICY "Super admin full payroll_forecast"
ON public.payroll_forecast FOR ALL
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Triggers de updated_at
CREATE TRIGGER trg_payroll_config_updated BEFORE UPDATE ON public.payroll_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_forecast_updated BEFORE UPDATE ON public.payroll_forecast FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_brackets_updated BEFORE UPDATE ON public.payroll_tax_brackets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payroll_forecast_comp ON public.payroll_forecast(company_id, competencia);
CREATE INDEX idx_payroll_events_comp ON public.payroll_events(company_id, employee_id, competencia);
CREATE INDEX idx_payroll_brackets_lookup ON public.payroll_tax_brackets(tax_type, year, company_id);