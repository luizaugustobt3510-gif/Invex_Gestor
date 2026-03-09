
-- Temperature control records table
CREATE TABLE public.temperature_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  local text NOT NULL, -- 'almoxarifado' or 'armario_medicamentos'
  data date NOT NULL DEFAULT CURRENT_DATE,
  hora time NOT NULL DEFAULT CURRENT_TIME,
  temperatura_atual numeric NOT NULL,
  temperatura_min numeric NOT NULL,
  temperatura_max numeric NOT NULL,
  umidade_atual numeric NOT NULL,
  umidade_min numeric NOT NULL,
  umidade_max numeric NOT NULL,
  responsavel_id uuid NOT NULL,
  responsavel_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.temperature_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company logistics/admin can insert temp records"
  ON public.temperature_records FOR INSERT TO public
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
  );

CREATE POLICY "Company logistics/admin can view temp records"
  ON public.temperature_records FOR SELECT TO public
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
  );

CREATE POLICY "Super admin full access temp records"
  ON public.temperature_records FOR ALL TO public
  USING (is_super_admin(auth.uid()));
