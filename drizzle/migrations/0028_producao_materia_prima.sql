CREATE TABLE public.raw_material_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL,
  quantidade_restante numeric NOT NULL,
  lote text NOT NULL DEFAULT '',
  procedencia text NOT NULL DEFAULT '',
  temperatura numeric,
  especificacao text DEFAULT '',
  numero_controle text NOT NULL DEFAULT '',
  boletim boolean NOT NULL DEFAULT false,
  fop text DEFAULT '',
  observacoes text DEFAULT '',
  foto_path text,
  custo_total numeric NOT NULL DEFAULT 0,
  financial_entry_id uuid,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.raw_material_entries TO authenticated;
GRANT ALL ON public.raw_material_entries TO service_role;
ALTER TABLE public.raw_material_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros veem entradas" ON public.raw_material_entries FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.raw_material_entries(id) ON DELETE CASCADE,
  produto_material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantidade_consumida numeric NOT NULL,
  quantidade_produzida numeric NOT NULL,
  lote_produto text NOT NULL DEFAULT '',
  observacoes text DEFAULT '',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.production_orders TO authenticated;
GRANT ALL ON public.production_orders TO service_role;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros veem producao" ON public.production_orders FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE OR REPLACE FUNCTION public.can_write_producao(_uid uuid, _company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_company_member(_uid, _company) AND (
    public.is_company_admin(_uid, _company)
    OR public.user_can_write_module(_uid, _company, 'logistica')
    OR public.user_can_write_module(_uid, _company, 'producao'))
$$;

CREATE OR REPLACE FUNCTION public.register_raw_entry(
  _company_id uuid, _material_id uuid, _quantidade numeric, _lote text, _procedencia text,
  _temperatura numeric, _especificacao text, _numero_controle text, _boletim boolean,
  _fop text, _observacoes text, _foto_path text, _custo_total numeric, _vencimento date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE mat RECORD; _id uuid; _fin uuid; _ctrl text;
BEGIN
  IF NOT public.can_write_producao(auth.uid(), _company_id) THEN RAISE EXCEPTION 'Sem permissão para registrar entrada'; END IF;
  IF _quantidade IS NULL OR _quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT * INTO mat FROM public.materials WHERE id = _material_id AND company_id = _company_id FOR UPDATE;
  IF mat IS NULL THEN RAISE EXCEPTION 'Material não encontrado'; END IF;
  _ctrl := NULLIF(trim(COALESCE(_numero_controle,'')), '');
  IF _ctrl IS NULL THEN
    SELECT 'MP-' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYYMMDD') || '-' ||
      lpad((count(*)+1)::text, 3, '0') INTO _ctrl
      FROM public.raw_material_entries WHERE company_id = _company_id
       AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  END IF;
  INSERT INTO public.raw_material_entries(company_id, material_id, quantidade, quantidade_restante, lote, procedencia,
    temperatura, especificacao, numero_controle, boletim, fop, observacoes, foto_path, custo_total, user_id)
  VALUES (_company_id, _material_id, _quantidade, _quantidade, COALESCE(_lote,''), COALESCE(_procedencia,''),
    _temperatura, COALESCE(_especificacao,''), _ctrl, COALESCE(_boletim,false), COALESCE(_fop,''),
    COALESCE(_observacoes,''), _foto_path, COALESCE(_custo_total,0), auth.uid())
  RETURNING id INTO _id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade WHERE id = mat.id;
  INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
  VALUES (_company_id, mat.id, _quantidade, 'entrada', 'Entrada matéria-prima ' || _ctrl || ' lote ' || COALESCE(_lote,''), auth.uid());
  IF COALESCE(_custo_total,0) > 0 THEN
    INSERT INTO public.financial_entries(company_id, user_id, tipo, descricao, valor, data, data_vencimento, status, origem, origem_id)
    VALUES (_company_id, auth.uid(), 'despesa', 'Matéria-prima ' || mat.material || ' · ' || _ctrl, _custo_total,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date, COALESCE(_vencimento, (now() AT TIME ZONE 'America/Sao_Paulo')::date),
      'pendente', 'producao', _id::text)
    RETURNING id INTO _fin;
    UPDATE public.raw_material_entries SET financial_entry_id = _fin WHERE id = _id;
  END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.register_production(
  _entry_id uuid, _produto_material_id uuid, _quantidade_consumida numeric,
  _quantidade_produzida numeric, _lote_produto text, _observacoes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e RECORD; mp RECORD; pr RECORD; _id uuid;
BEGIN
  SELECT * INTO e FROM public.raw_material_entries WHERE id = _entry_id FOR UPDATE;
  IF e IS NULL THEN RAISE EXCEPTION 'Lote de matéria-prima não encontrado'; END IF;
  IF NOT public.can_write_producao(auth.uid(), e.company_id) THEN RAISE EXCEPTION 'Sem permissão para produzir'; END IF;
  IF _quantidade_consumida IS NULL OR _quantidade_consumida <= 0 THEN RAISE EXCEPTION 'Quantidade consumida inválida'; END IF;
  IF _quantidade_produzida IS NULL OR _quantidade_produzida < 0 THEN RAISE EXCEPTION 'Quantidade produzida inválida'; END IF;
  IF _quantidade_consumida > e.quantidade_restante THEN
    RAISE EXCEPTION 'Saldo do lote insuficiente (disponível: %, solicitado: %)', e.quantidade_restante, _quantidade_consumida;
  END IF;
  SELECT * INTO mp FROM public.materials WHERE id = e.material_id FOR UPDATE;
  SELECT * INTO pr FROM public.materials WHERE id = _produto_material_id AND company_id = e.company_id FOR UPDATE;
  IF pr IS NULL THEN RAISE EXCEPTION 'Produto processado não encontrado'; END IF;
  IF pr.id = mp.id THEN RAISE EXCEPTION 'O produto processado deve ser diferente da matéria-prima'; END IF;
  IF mp.quantidade < _quantidade_consumida THEN RAISE EXCEPTION 'Estoque da matéria-prima insuficiente'; END IF;

  UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante - _quantidade_consumida WHERE id = e.id;
  UPDATE public.materials SET quantidade = quantidade - _quantidade_consumida WHERE id = mp.id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade_produzida WHERE id = pr.id;
  INSERT INTO public.production_orders(company_id, entry_id, produto_material_id, quantidade_consumida, quantidade_produzida, lote_produto, observacoes, user_id)
  VALUES (e.company_id, e.id, pr.id, _quantidade_consumida, _quantidade_produzida, COALESCE(NULLIF(trim(_lote_produto),''), 'PA-' || e.numero_controle), COALESCE(_observacoes,''), auth.uid())
  RETURNING id INTO _id;
  INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
  VALUES (e.company_id, mp.id, _quantidade_consumida, 'saida', 'Consumo produção lote ' || e.numero_controle, auth.uid()),
         (e.company_id, pr.id, _quantidade_produzida, 'entrada', 'Produção a partir do lote ' || e.numero_controle, auth.uid());
  RETURN _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.register_raw_entry(uuid,uuid,numeric,text,text,numeric,text,text,boolean,text,text,text,numeric,date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.register_production(uuid,uuid,numeric,numeric,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.register_raw_entry(uuid,uuid,numeric,text,text,numeric,text,text,boolean,text,text,text,numeric,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_production(uuid,uuid,numeric,numeric,text,text) TO authenticated;

CREATE POLICY "producao fotos leitura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'producao-fotos' AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "producao fotos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'producao-fotos' AND public.can_write_producao(auth.uid(), ((storage.foldername(name))[1])::uuid));