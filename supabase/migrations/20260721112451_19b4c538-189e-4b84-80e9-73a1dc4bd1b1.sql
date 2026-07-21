
-- =============================================================
-- 1) sector_stock
-- =============================================================
CREATE TABLE public.sector_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, sector_id, material_id)
);

CREATE INDEX idx_sector_stock_company_sector ON public.sector_stock(company_id, sector_id);
CREATE INDEX idx_sector_stock_material ON public.sector_stock(material_id);

GRANT SELECT ON public.sector_stock TO authenticated;
GRANT ALL ON public.sector_stock TO service_role;

ALTER TABLE public.sector_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read sector_stock of their company"
  ON public.sector_stock FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER trg_sector_stock_updated
  BEFORE UPDATE ON public.sector_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- 2) stock_movements — novos tipos e colunas de rastreio
-- =============================================================
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tipo_check;
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_tipo_check
  CHECK (tipo = ANY (ARRAY['entrada','saida','transferencia','consumo']));

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.material_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_consumption_id UUID;

CREATE INDEX IF NOT EXISTS idx_stock_movements_sector ON public.stock_movements(company_id, sector_id, created_at DESC);

-- =============================================================
-- 3) material_dispensations — link opcional para consumo
-- =============================================================
ALTER TABLE public.material_dispensations
  ADD COLUMN IF NOT EXISTS patient_consumption_id UUID;

-- =============================================================
-- 4) patient_consumptions
-- =============================================================
CREATE TABLE public.patient_consumptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  evolution_id UUID REFERENCES public.clinical_evolutions(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  professional_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC,
  exam_type TEXT,
  observacoes TEXT,
  dispensation_id UUID REFERENCES public.material_dispensations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_consumptions_company_patient ON public.patient_consumptions(company_id, patient_id, created_at DESC);
CREATE INDEX idx_patient_consumptions_evolution ON public.patient_consumptions(evolution_id);
CREATE INDEX idx_patient_consumptions_appointment ON public.patient_consumptions(appointment_id);

GRANT SELECT, INSERT, DELETE ON public.patient_consumptions TO authenticated;
GRANT ALL ON public.patient_consumptions TO service_role;

ALTER TABLE public.patient_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read patient_consumptions of their company"
  ON public.patient_consumptions FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Clinical roles insert patient_consumptions"
  ON public.patient_consumptions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.user_can_write_module(auth.uid(), company_id, 'dispensacao')
      OR public.user_can_write_module(auth.uid(), company_id, 'clinica')
      OR public.is_company_admin(auth.uid(), company_id)
    )
  );

CREATE POLICY "Admins or owner delete patient_consumptions"
  ON public.patient_consumptions FOR DELETE
  TO authenticated
  USING (
    public.is_company_admin(auth.uid(), company_id)
    OR professional_user_id = auth.uid()
  );

CREATE TRIGGER trg_patient_consumptions_updated
  BEFORE UPDATE ON public.patient_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK do link reverso (após ambas tabelas existirem)
ALTER TABLE public.material_dispensations
  ADD CONSTRAINT material_dispensations_patient_consumption_fkey
  FOREIGN KEY (patient_consumption_id)
  REFERENCES public.patient_consumptions(id) ON DELETE SET NULL;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_patient_consumption_fkey
  FOREIGN KEY (patient_consumption_id)
  REFERENCES public.patient_consumptions(id) ON DELETE SET NULL;

-- =============================================================
-- 5) RPC: deliver_material_request
-- =============================================================
CREATE OR REPLACE FUNCTION public.deliver_material_request(
  _request_id UUID,
  _sector_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  mat RECORD;
  target_sector UUID;
  new_stock NUMERIC;
BEGIN
  SELECT * INTO req FROM public.material_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;

  IF NOT (public.is_company_member(auth.uid(), req.company_id)
          AND public.user_can_write_module(auth.uid(), req.company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para entregar materiais';
  END IF;

  IF lower(req.status) <> 'pendente' THEN
    RAISE EXCEPTION 'Solicitação não está pendente (status atual: %)', req.status;
  END IF;

  SELECT * INTO mat FROM public.materials
    WHERE company_id = req.company_id AND codigo = req.codigo
    LIMIT 1 FOR UPDATE;
  IF mat IS NULL THEN
    RAISE EXCEPTION 'Material com código % não encontrado no estoque', req.codigo;
  END IF;

  new_stock := mat.quantidade - req.quantidade;
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente (atual: %, solicitado: %)', mat.quantidade, req.quantidade;
  END IF;

  -- Resolve setor de destino: parâmetro > match por nome do setor da request
  target_sector := _sector_id;
  IF target_sector IS NULL THEN
    SELECT id INTO target_sector FROM public.sectors
      WHERE company_id = req.company_id AND lower(nome) = lower(req.setor)
      LIMIT 1;
  END IF;
  IF target_sector IS NULL THEN
    RAISE EXCEPTION 'Setor de destino "%" não encontrado. Cadastre-o antes de entregar.', req.setor;
  END IF;

  -- Debita estoque central
  UPDATE public.materials SET quantidade = new_stock WHERE id = mat.id;

  -- Credita saldo do setor
  INSERT INTO public.sector_stock (company_id, sector_id, material_id, quantidade)
  VALUES (req.company_id, target_sector, mat.id, req.quantidade)
  ON CONFLICT (company_id, sector_id, material_id)
  DO UPDATE SET quantidade = public.sector_stock.quantidade + EXCLUDED.quantidade,
                updated_at = now();

  -- Movimentação de transferência
  INSERT INTO public.stock_movements (company_id, material_id, quantidade, tipo, obs, user_id, sector_id, request_id)
  VALUES (req.company_id, mat.id, req.quantidade, 'transferencia',
          'Entrega solicitação para setor', auth.uid(), target_sector, req.id);

  UPDATE public.material_requests SET status = 'Entregue' WHERE id = req.id;

  RETURN req.id;
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_material_request(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.deliver_material_request(UUID, UUID) TO authenticated;

-- =============================================================
-- 6) Trigger: apply_patient_consumption (BEFORE INSERT)
-- =============================================================
CREATE OR REPLACE FUNCTION public.apply_patient_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ss RECORD;
  mat RECORD;
  pat_name TEXT;
  sec_name TEXT;
  disp_id UUID;
  unit_val NUMERIC;
BEGIN
  SELECT * INTO mat FROM public.materials WHERE id = NEW.material_id FOR UPDATE;
  IF mat IS NULL THEN RAISE EXCEPTION 'Material inexistente'; END IF;

  unit_val := COALESCE(NEW.valor_unitario, mat.preco_unitario, mat.preco);

  SELECT * INTO ss FROM public.sector_stock
    WHERE company_id = NEW.company_id
      AND sector_id = NEW.sector_id
      AND material_id = NEW.material_id
    FOR UPDATE;

  IF ss IS NULL OR ss.quantidade < NEW.quantidade THEN
    RAISE EXCEPTION 'Saldo insuficiente no setor para % (disponível: %, solicitado: %)',
      mat.material, COALESCE(ss.quantidade, 0), NEW.quantidade;
  END IF;

  UPDATE public.sector_stock
    SET quantidade = quantidade - NEW.quantidade, updated_at = now()
    WHERE id = ss.id;

  SELECT nome INTO pat_name FROM public.patients WHERE id = NEW.patient_id;
  SELECT nome INTO sec_name FROM public.sectors WHERE id = NEW.sector_id;

  INSERT INTO public.material_dispensations (
    company_id, user_id, patient_id, patient_name,
    material_id, material_codigo, material_nome, quantidade, unidade,
    observacoes, destino_tipo, destino_sector_id, destino_sector_nome,
    exam_type, valor_unitario, valor_total, billing_status,
    patient_consumption_id
  ) VALUES (
    NEW.company_id, COALESCE(NEW.professional_user_id, auth.uid()), NEW.patient_id, pat_name,
    mat.id, mat.codigo, mat.material, NEW.quantidade, mat.unidade,
    NEW.observacoes, 'paciente', NEW.sector_id, sec_name,
    NEW.exam_type, unit_val, unit_val * NEW.quantidade, 'pendente',
    NEW.id
  ) RETURNING id INTO disp_id;

  NEW.dispensation_id := disp_id;
  NEW.valor_unitario := unit_val;

  INSERT INTO public.stock_movements (
    company_id, material_id, quantidade, tipo, obs, user_id,
    sector_id, patient_consumption_id
  ) VALUES (
    NEW.company_id, mat.id, NEW.quantidade, 'consumo',
    'Consumo assistencial - ' || COALESCE(pat_name, 'paciente'),
    COALESCE(NEW.professional_user_id, auth.uid()),
    NEW.sector_id, NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_patient_consumption
  BEFORE INSERT ON public.patient_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.apply_patient_consumption();

-- =============================================================
-- 7) Trigger: reverse_patient_consumption (AFTER DELETE)
-- =============================================================
CREATE OR REPLACE FUNCTION public.reverse_patient_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Estorna saldo do setor
  UPDATE public.sector_stock
    SET quantidade = quantidade + OLD.quantidade, updated_at = now()
    WHERE company_id = OLD.company_id
      AND sector_id = OLD.sector_id
      AND material_id = OLD.material_id;

  -- Registra estorno
  INSERT INTO public.stock_movements (company_id, material_id, quantidade, tipo, obs, user_id, sector_id)
  VALUES (OLD.company_id, OLD.material_id, OLD.quantidade, 'entrada',
          'Estorno consumo assistencial', auth.uid(), OLD.sector_id);

  -- Remove dispensação atrelada
  IF OLD.dispensation_id IS NOT NULL THEN
    DELETE FROM public.material_dispensations WHERE id = OLD.dispensation_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reverse_patient_consumption
  AFTER DELETE ON public.patient_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.reverse_patient_consumption();
