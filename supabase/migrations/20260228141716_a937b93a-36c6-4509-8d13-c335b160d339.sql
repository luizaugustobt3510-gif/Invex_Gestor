
-- Trainings catalog
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  periodicidade_meses INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view trainings" ON public.trainings FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can insert trainings" ON public.trainings FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update trainings" ON public.trainings FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete trainings" ON public.trainings FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access trainings" ON public.trainings FOR ALL
  USING (is_super_admin(auth.uid()));

-- Employee-Training link
CREATE TABLE public.employee_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  data_realizacao DATE NOT NULL,
  data_validade DATE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view employee_trainings" ON public.employee_trainings FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can insert employee_trainings" ON public.employee_trainings FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update employee_trainings" ON public.employee_trainings FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete employee_trainings" ON public.employee_trainings FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access employee_trainings" ON public.employee_trainings FOR ALL
  USING (is_super_admin(auth.uid()));

-- Time records (ponto/banco de horas)
CREATE TABLE public.time_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada TIME DEFAULT NULL,
  saida TIME DEFAULT NULL,
  horas_trabalhadas NUMERIC DEFAULT 0,
  horas_extras NUMERIC DEFAULT 0,
  obs TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view time_records" ON public.time_records FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can insert time_records" ON public.time_records FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update time_records" ON public.time_records FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete time_records" ON public.time_records FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access time_records" ON public.time_records FOR ALL
  USING (is_super_admin(auth.uid()));

-- Performance evaluations
CREATE TABLE public.performance_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 4),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view evaluations" ON public.performance_evaluations FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can insert evaluations" ON public.performance_evaluations FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update evaluations" ON public.performance_evaluations FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete evaluations" ON public.performance_evaluations FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access evaluations" ON public.performance_evaluations FOR ALL
  USING (is_super_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_records_updated_at BEFORE UPDATE ON public.time_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
