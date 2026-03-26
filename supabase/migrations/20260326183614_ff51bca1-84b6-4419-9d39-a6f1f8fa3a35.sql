
-- Academia module tables

CREATE TABLE public.academy_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  telefone text,
  email text,
  data_nascimento date,
  data_matricula date NOT NULL DEFAULT CURRENT_DATE,
  plano text NOT NULL DEFAULT 'mensal',
  valor_mensalidade numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company member can view academy_students" ON public.academy_students
  FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admin can insert academy_students" ON public.academy_students
  FOR INSERT WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Company admin can update academy_students" ON public.academy_students
  FOR UPDATE USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Company admin can delete academy_students" ON public.academy_students
  FOR DELETE USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Super admin full access academy_students" ON public.academy_students
  FOR ALL USING (is_super_admin(auth.uid()));

-- Payments table
CREATE TABLE public.academy_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date NOT NULL,
  data_pagamento date,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'pendente',
  referencia text NOT NULL DEFAULT '',
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company member can view academy_payments" ON public.academy_payments
  FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admin can insert academy_payments" ON public.academy_payments
  FOR INSERT WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Company admin can update academy_payments" ON public.academy_payments
  FOR UPDATE USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Company admin can delete academy_payments" ON public.academy_payments
  FOR DELETE USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'))
  );

CREATE POLICY "Super admin full access academy_payments" ON public.academy_payments
  FOR ALL USING (is_super_admin(auth.uid()));
