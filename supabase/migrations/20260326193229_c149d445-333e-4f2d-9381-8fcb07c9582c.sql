
-- Add renovacao_automatica to academy_students
ALTER TABLE public.academy_students ADD COLUMN IF NOT EXISTS renovacao_automatica boolean NOT NULL DEFAULT true;

-- Financial categories table
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'despesa', -- 'receita' or 'despesa'
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view financial_categories" ON public.financial_categories
  FOR SELECT USING (is_company_member(auth.uid(), company_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Company admin/financeiro can insert financial_categories" ON public.financial_categories
  FOR INSERT WITH CHECK (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "Company admin/financeiro can update financial_categories" ON public.financial_categories
  FOR UPDATE USING (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "Company admin/financeiro can delete financial_categories" ON public.financial_categories
  FOR DELETE USING (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "Super admin full access financial_categories" ON public.financial_categories
  FOR ALL USING (is_super_admin(auth.uid()));

-- Financial entries table (unified for all business types)
CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'despesa', -- 'receita' or 'despesa'
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado', 'cancelado'
  categoria_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  recorrente boolean NOT NULL DEFAULT false,
  periodicidade text, -- 'mensal', 'trimestral', 'semestral', 'anual'
  origem text, -- 'manual', 'academia', 'venda', 'salario'
  origem_id text, -- ID reference from source module
  forma_pagamento text,
  observacoes text DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view financial_entries" ON public.financial_entries
  FOR SELECT USING (is_company_member(auth.uid(), company_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Company admin/financeiro can insert financial_entries" ON public.financial_entries
  FOR INSERT WITH CHECK (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  );

CREATE POLICY "Company admin/financeiro can update financial_entries" ON public.financial_entries
  FOR UPDATE USING (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  );

CREATE POLICY "Company admin/financeiro can delete financial_entries" ON public.financial_entries
  FOR DELETE USING (
    is_company_admin(auth.uid(), company_id) 
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'financeiro'::app_role))
  );

CREATE POLICY "Super admin full access financial_entries" ON public.financial_entries
  FOR ALL USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
