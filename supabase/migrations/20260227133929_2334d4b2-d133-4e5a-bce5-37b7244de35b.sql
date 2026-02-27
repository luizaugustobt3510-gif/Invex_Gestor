
-- =============================================
-- MÓDULO RH: Gestão de Pessoas
-- =============================================

-- 1. Tabela de Colaboradores
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  cargo TEXT NOT NULL,
  data_admissao DATE NOT NULL,
  salario NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view employees"
  ON public.employees FOR SELECT
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can update employees"
  ON public.employees FOR UPDATE
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can delete employees"
  ON public.employees FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access employees"
  ON public.employees FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de Férias
CREATE TABLE public.employee_vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'agendada',
  obs TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view vacations"
  ON public.employee_vacations FOR SELECT
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can insert vacations"
  ON public.employee_vacations FOR INSERT
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can update vacations"
  ON public.employee_vacations FOR UPDATE
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can delete vacations"
  ON public.employee_vacations FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access vacations"
  ON public.employee_vacations FOR ALL
  USING (is_super_admin(auth.uid()));

-- 3. Tabela de Atestados
CREATE TABLE public.employee_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL,
  motivo TEXT DEFAULT '',
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view certificates"
  ON public.employee_certificates FOR SELECT
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can insert certificates"
  ON public.employee_certificates FOR INSERT
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can update certificates"
  ON public.employee_certificates FOR UPDATE
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'))
  );

CREATE POLICY "Company RH/admin can delete certificates"
  ON public.employee_certificates FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access certificates"
  ON public.employee_certificates FOR ALL
  USING (is_super_admin(auth.uid()));

-- 4. Storage bucket para atestados
INSERT INTO storage.buckets (id, name, public) VALUES ('atestados', 'atestados', false);

CREATE POLICY "RH/admin can upload atestados"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'atestados'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "RH/admin can view atestados"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'atestados'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "RH/admin can delete atestados"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'atestados'
    AND auth.uid() IS NOT NULL
  );
