
-- Add departamento column to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS departamento text DEFAULT '';

-- Create ASO table
CREATE TABLE public.employee_asos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  tipo text NOT NULL DEFAULT 'periodico', -- admissional, periodico, demissional
  data_realizacao date NOT NULL,
  data_vencimento date,
  arquivo_url text,
  status text NOT NULL DEFAULT 'valido', -- valido, vencido, proximo_vencer
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_asos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view asos"
  ON public.employee_asos FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));

CREATE POLICY "Company RH/admin can insert asos"
  ON public.employee_asos FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));

CREATE POLICY "Company RH/admin can update asos"
  ON public.employee_asos FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));

CREATE POLICY "Company RH/admin can delete asos"
  ON public.employee_asos FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access asos"
  ON public.employee_asos FOR ALL
  USING (is_super_admin(auth.uid()));
