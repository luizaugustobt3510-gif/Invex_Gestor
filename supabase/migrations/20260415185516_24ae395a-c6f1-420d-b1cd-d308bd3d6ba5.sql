
-- Maintenance records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipamento TEXT NOT NULL,
  controle TEXT NOT NULL DEFAULT 'preventiva',
  frequencia TEXT NOT NULL DEFAULT 'mensal',
  empresa_prestadora TEXT NOT NULL DEFAULT '',
  manutencao_preventiva DATE NOT NULL,
  data_validade DATE NOT NULL,
  manutencao_corretiva DATE,
  observacoes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Super admin full access maintenance_records"
  ON public.maintenance_records FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Company members can view maintenance_records"
  ON public.maintenance_records FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Manutencao/admin can insert maintenance_records"
  ON public.maintenance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
  );

CREATE POLICY "Manutencao/admin can update maintenance_records"
  ON public.maintenance_records FOR UPDATE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  );

CREATE POLICY "Manutencao/admin can delete maintenance_records"
  ON public.maintenance_records FOR DELETE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
  );

-- Maintenance attachments table
CREATE TABLE public.maintenance_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  maintenance_record_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'outros',
  uploaded_by UUID NOT NULL,
  uploaded_by_nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access maintenance_attachments"
  ON public.maintenance_attachments FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Company members can view maintenance_attachments"
  ON public.maintenance_attachments FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Manutencao/admin can insert maintenance_attachments"
  ON public.maintenance_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  );

CREATE POLICY "Manutencao/admin can delete maintenance_attachments"
  ON public.maintenance_attachments FOR DELETE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
  );

-- Service orders table
CREATE TABLE public.maintenance_service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipamento TEXT NOT NULL,
  tipo_servico TEXT NOT NULL DEFAULT 'corretiva',
  descricao TEXT NOT NULL DEFAULT '',
  prioridade TEXT NOT NULL DEFAULT 'media',
  empresa_prestadora TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  solicitante_id UUID NOT NULL,
  solicitante_nome TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_service_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_maintenance_service_orders_updated_at
  BEFORE UPDATE ON public.maintenance_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Super admin full access maintenance_service_orders"
  ON public.maintenance_service_orders FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Company members can view maintenance_service_orders"
  ON public.maintenance_service_orders FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert maintenance_service_orders"
  ON public.maintenance_service_orders FOR INSERT
  TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Manutencao/admin can update maintenance_service_orders"
  ON public.maintenance_service_orders FOR UPDATE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  );

CREATE POLICY "Manutencao/admin can delete maintenance_service_orders"
  ON public.maintenance_service_orders FOR DELETE
  TO authenticated
  USING (
    is_company_admin(auth.uid(), company_id)
    OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'manutencao'::app_role))
  );

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('manutencao-anexos', 'manutencao-anexos', false);

CREATE POLICY "Company members can view manutencao files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'manutencao-anexos');

CREATE POLICY "Manutencao users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'manutencao-anexos');

CREATE POLICY "Manutencao users can delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'manutencao-anexos');

-- Update domain access function to include manutencao
CREATE OR REPLACE FUNCTION public.user_has_domain_access(_user_id uuid, _company_id uuid, _module_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH role_access AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND (ur.company_id = _company_id OR ur.role = 'super_admin')
        AND (
          ur.role = 'super_admin'
          OR ur.role = 'admin_empresa'
          OR (_module_key = 'logistica' AND ur.role IN ('logistica', 'usuario_almox', 'solicitante'))
          OR (_module_key = 'rh' AND ur.role IN ('rh', 'visualizador'))
          OR (_module_key = 'financeiro' AND ur.role = 'financeiro')
          OR (_module_key = 'manutencao' AND ur.role IN ('manutencao', 'logistica', 'usuario_almox'))
        )
    ) AS allowed
  ),
  company_access AS (
    SELECT COALESCE(
      (
        SELECT cm.is_active
        FROM public.company_modules cm
        WHERE cm.company_id = _company_id
          AND cm.module_key = _module_key
        ORDER BY cm.updated_at DESC
        LIMIT 1
      ),
      true
    ) AS allowed
  ),
  user_access AS (
    SELECT COALESCE(
      (
        SELECT ump.is_active
        FROM public.user_module_permissions ump
        WHERE ump.user_id = _user_id
          AND ump.company_id = _company_id
          AND ump.module_key = _module_key
        ORDER BY ump.created_at DESC
        LIMIT 1
      ),
      true
    ) AS allowed
  )
  SELECT
    (SELECT allowed FROM role_access)
    AND (SELECT allowed FROM company_access)
    AND (SELECT allowed FROM user_access);
$function$;
