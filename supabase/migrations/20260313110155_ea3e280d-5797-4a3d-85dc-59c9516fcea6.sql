
-- Table for termination records
CREATE TABLE public.employee_terminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  data_desligamento date NOT NULL,
  motivo text NOT NULL,
  observacoes text DEFAULT '',
  responsavel_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_terminations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company RH/admin can view terminations" ON public.employee_terminations FOR SELECT USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can insert terminations" ON public.employee_terminations FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can update terminations" ON public.employee_terminations FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company RH/admin can delete terminations" ON public.employee_terminations FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access terminations" ON public.employee_terminations FOR ALL USING (is_super_admin(auth.uid()));

-- Table for configurable termination reasons
CREATE TABLE public.termination_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  motivo text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.termination_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view default reasons" ON public.termination_reasons FOR SELECT USING (is_default = true OR is_company_member(auth.uid(), company_id) OR is_super_admin(auth.uid()));
CREATE POLICY "Company admin can insert reasons" ON public.termination_reasons FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id) OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role)));
CREATE POLICY "Company admin can delete reasons" ON public.termination_reasons FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access reasons" ON public.termination_reasons FOR ALL USING (is_super_admin(auth.uid()));

-- Insert default termination reasons
INSERT INTO public.termination_reasons (motivo, is_default) VALUES
  ('Pedido de demissão', true),
  ('Demissão sem justa causa', true),
  ('Demissão por justa causa', true),
  ('Fim de contrato', true),
  ('Baixo desempenho', true),
  ('Redução de quadro', true),
  ('Transferência', true),
  ('Aposentadoria', true);
