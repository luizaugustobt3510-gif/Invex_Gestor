
-- 1. Employee occurrences table
CREATE TABLE public.employee_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'verbal',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL DEFAULT '',
  responsavel_nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can insert occurrences" ON public.employee_occurrences FOR INSERT TO public WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can view occurrences" ON public.employee_occurrences FOR SELECT TO public USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update occurrences" ON public.employee_occurrences FOR UPDATE TO public USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete occurrences" ON public.employee_occurrences FOR DELETE TO public USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access occurrences" ON public.employee_occurrences FOR ALL TO public USING (is_super_admin(auth.uid()));

-- 2. Development plans table
CREATE TABLE public.development_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'meta',
  status TEXT NOT NULL DEFAULT 'em_andamento',
  prazo DATE,
  evaluation_id UUID REFERENCES public.performance_evaluations(id) ON DELETE SET NULL,
  training_id UUID REFERENCES public.trainings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can insert dev plans" ON public.development_plans FOR INSERT TO public WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can view dev plans" ON public.development_plans FOR SELECT TO public USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update dev plans" ON public.development_plans FOR UPDATE TO public USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete dev plans" ON public.development_plans FOR DELETE TO public USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access dev plans" ON public.development_plans FOR ALL TO public USING (is_super_admin(auth.uid()));

-- 3. Add birthday field to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS data_nascimento DATE;
