
-- ===== BENEFITS CATALOG =====
CREATE TABLE public.benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'outros', -- saude, alimentacao, bem_estar, outros
  cost_type TEXT NOT NULL DEFAULT 'empresa', -- empresa, coparticipacao, desconto_folha
  base_value NUMERIC NOT NULL DEFAULT 0,
  is_variable BOOLEAN NOT NULL DEFAULT false,
  allows_dependents BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, inativo
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_benefits_company ON public.benefits(company_id);

ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view benefits" ON public.benefits FOR SELECT
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "RH/admin insert benefits" ON public.benefits FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin update benefits" ON public.benefits FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin delete benefits" ON public.benefits FOR DELETE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Super admin full benefits" ON public.benefits FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER set_benefits_updated_at BEFORE UPDATE ON public.benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== EMPLOYEE BENEFITS LINK =====
CREATE TABLE public.employee_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  benefit_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo', -- ativo, cancelado, pendente
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  custom_value NUMERIC,
  payroll_discount NUMERIC NOT NULL DEFAULT 0,
  dependents_count INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_emp_benefits_company ON public.employee_benefits(company_id);
CREATE INDEX idx_emp_benefits_employee ON public.employee_benefits(employee_id);
CREATE INDEX idx_emp_benefits_benefit ON public.employee_benefits(benefit_id);

ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view emp_benefits" ON public.employee_benefits FOR SELECT
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "RH/admin insert emp_benefits" ON public.employee_benefits FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin update emp_benefits" ON public.employee_benefits FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin delete emp_benefits" ON public.employee_benefits FOR DELETE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Super admin full emp_benefits" ON public.employee_benefits FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER set_emp_benefits_updated_at BEFORE UPDATE ON public.employee_benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== MONTHLY COSTS =====
CREATE TABLE public.benefits_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  benefit_id UUID NOT NULL,
  employee_benefit_id UUID,
  competencia TEXT NOT NULL, -- "YYYY-MM"
  company_cost NUMERIC NOT NULL DEFAULT 0,
  employee_cost NUMERIC NOT NULL DEFAULT 0,
  net_cost NUMERIC NOT NULL DEFAULT 0,
  financial_entry_id UUID,
  financial_discount_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_id, benefit_id, competencia)
);

CREATE INDEX idx_ben_monthly_company ON public.benefits_monthly(company_id);
CREATE INDEX idx_ben_monthly_competencia ON public.benefits_monthly(competencia);
CREATE INDEX idx_ben_monthly_employee ON public.benefits_monthly(employee_id);

ALTER TABLE public.benefits_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view ben_monthly" ON public.benefits_monthly FOR SELECT
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "RH/admin insert ben_monthly" ON public.benefits_monthly FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin update ben_monthly" ON public.benefits_monthly FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "RH/admin delete ben_monthly" ON public.benefits_monthly FOR DELETE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Super admin full ben_monthly" ON public.benefits_monthly FOR ALL
  USING (is_super_admin(auth.uid()));
