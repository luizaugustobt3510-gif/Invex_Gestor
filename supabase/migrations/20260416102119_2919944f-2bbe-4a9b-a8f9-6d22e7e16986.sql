
-- Add location and subgroup fields to maintenance_records
ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS setor text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sala text DEFAULT '',
  ADD COLUMN IF NOT EXISTS andar text DEFAULT '',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.maintenance_records(id) ON DELETE SET NULL;

-- Add SLA fields to maintenance_service_orders
ALTER TABLE public.maintenance_service_orders
  ADD COLUMN IF NOT EXISTS data_inicio_atendimento timestamptz,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz;

-- Create maintenance_history table
CREATE TABLE public.maintenance_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  maintenance_record_id uuid NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'renovacao',
  descricao text NOT NULL DEFAULT '',
  data_evento date NOT NULL DEFAULT CURRENT_DATE,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL DEFAULT '',
  dados_anteriores jsonb DEFAULT '{}',
  dados_novos jsonb DEFAULT '{}',
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view maintenance_history"
  ON public.maintenance_history FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Manutencao/admin can insert maintenance_history"
  ON public.maintenance_history FOR INSERT TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
  );

CREATE POLICY "Super admin full access maintenance_history"
  ON public.maintenance_history FOR ALL TO public
  USING (is_super_admin(auth.uid()));

CREATE INDEX idx_maintenance_history_record ON public.maintenance_history(maintenance_record_id);
CREATE INDEX idx_maintenance_records_parent ON public.maintenance_records(parent_id);
