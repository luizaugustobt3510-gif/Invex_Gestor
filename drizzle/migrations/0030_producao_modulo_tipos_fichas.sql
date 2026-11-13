-- Tipo do material: comum, matéria-prima ou produto final
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'comum';
UPDATE public.materials m SET tipo = 'materia_prima'
 WHERE tipo = 'comum' AND EXISTS (SELECT 1 FROM public.raw_material_entries e WHERE e.material_id = m.id);
UPDATE public.materials m SET tipo = 'produto_final'
 WHERE tipo = 'comum' AND EXISTS (SELECT 1 FROM public.production_orders o WHERE o.produto_material_id = m.id);
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_tipo_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_tipo_check CHECK (tipo IN ('comum','materia_prima','produto_final'));

-- Validade e custo nos lotes
ALTER TABLE public.raw_material_entries ADD COLUMN IF NOT EXISTS validade date;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS validade date;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS custo_materia_prima numeric NOT NULL DEFAULT 0;
UPDATE public.production_orders o SET custo_materia_prima = round(COALESCE(e.custo_total,0) / NULLIF(e.quantidade,0) * o.quantidade_consumida, 2)
  FROM public.raw_material_entries e WHERE e.id = o.entry_id AND o.custo_materia_prima = 0;

-- Baixa de estoque da venda feita uma única vez
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS estoque_baixado boolean NOT NULL DEFAULT false;

-- Fichas técnicas (rendimento esperado)
CREATE TABLE IF NOT EXISTS public.production_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  produto_material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  rendimento_esperado numeric NOT NULL DEFAULT 100,
  validade_dias integer,
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, produto_material_id, materia_prima_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_recipes TO authenticated;
GRANT ALL ON public.production_recipes TO service_role;
ALTER TABLE public.production_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros veem fichas" ON public.production_recipes FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "producao cria fichas" ON public.production_recipes FOR INSERT TO authenticated
  WITH CHECK (public.can_write_producao(auth.uid(), company_id));
CREATE POLICY "producao altera fichas" ON public.production_recipes FOR UPDATE TO authenticated
  USING (public.can_write_producao(auth.uid(), company_id)) WITH CHECK (public.can_write_producao(auth.uid(), company_id));
CREATE POLICY "producao exclui fichas" ON public.production_recipes FOR DELETE TO authenticated
  USING (public.can_write_producao(auth.uid(), company_id));
CREATE TRIGGER production_recipes_updated_at BEFORE UPDATE ON public.production_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Entrada de matéria-prima (agora com validade e marca o material como matéria-prima)
DROP FUNCTION IF EXISTS public.register_raw_entry(uuid, uuid, numeric, text, text, numeric, text, text, boolean, text, text, text, numeric, date);
CREATE FUNCTION public.register_raw_entry(_company_id uuid, _material_id uuid, _quantidade numeric, _lote text, _procedencia text, _temperatura numeric, _especificacao text, _numero_controle text, _boletim boolean, _fop text, _observacoes text, _foto_path text, _custo_total numeric, _vencimento date, _validade date DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    temperatura, especificacao, numero_controle, boletim, fop, observacoes, foto_path, custo_total, user_id, validade)
  VALUES (_company_id, _material_id, _quantidade, _quantidade, COALESCE(_lote,''), COALESCE(_procedencia,''),
    _temperatura, COALESCE(_especificacao,''), _ctrl, COALESCE(_boletim,false), COALESCE(_fop,''),
    COALESCE(_observacoes,''), _foto_path, COALESCE(_custo_total,0), auth.uid(), _validade)
  RETURNING id INTO _id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade,
    tipo = CASE WHEN tipo = 'comum' THEN 'materia_prima' ELSE tipo END
   WHERE id = mat.id;
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
END $function$;
GRANT EXECUTE ON FUNCTION public.register_raw_entry(uuid, uuid, numeric, text, text, numeric, text, text, boolean, text, text, text, numeric, date, date) TO authenticated;

-- Produção (agora com validade, custo e marca o produto como produto final)
DROP FUNCTION IF EXISTS public.register_production(uuid, uuid, numeric, numeric, text, text);
CREATE FUNCTION public.register_production(_entry_id uuid, _produto_material_id uuid, _quantidade_consumida numeric, _quantidade_produzida numeric, _lote_produto text, _observacoes text, _validade date DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e RECORD; mp RECORD; pr RECORD; _id uuid; _custo numeric;
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
  IF mp.quantidade < _quantidade_consumida THEN RAISE EXCEPTION 'Estoque da matéria-prima insuficiente (disponível: %)', mp.quantidade; END IF;
  _custo := round(COALESCE(e.custo_total,0) / NULLIF(e.quantidade,0) * _quantidade_consumida, 2);

  UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante - _quantidade_consumida WHERE id = e.id;
  UPDATE public.materials SET quantidade = quantidade - _quantidade_consumida WHERE id = mp.id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade_produzida,
    tipo = CASE WHEN tipo = 'comum' THEN 'produto_final' ELSE tipo END
   WHERE id = pr.id;
  INSERT INTO public.production_orders(company_id, entry_id, produto_material_id, quantidade_consumida, quantidade_produzida, lote_produto, observacoes, user_id, validade, custo_materia_prima)
  VALUES (e.company_id, e.id, pr.id, _quantidade_consumida, _quantidade_produzida, COALESCE(NULLIF(trim(_lote_produto),''), 'PA-' || e.numero_controle), COALESCE(_observacoes,''), auth.uid(), _validade, COALESCE(_custo,0))
  RETURNING id INTO _id;
  INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
  VALUES (e.company_id, mp.id, _quantidade_consumida, 'saida', 'Consumo produção lote ' || e.numero_controle, auth.uid()),
         (e.company_id, pr.id, _quantidade_produzida, 'entrada', 'Produção a partir do lote ' || e.numero_controle, auth.uid());
  RETURN _id;
END $function$;
GRANT EXECUTE ON FUNCTION public.register_production(uuid, uuid, numeric, numeric, text, text, date) TO authenticated;

-- Baixa de estoque de uma venda (vendedor não precisa de permissão de Logística)
CREATE OR REPLACE FUNCTION public.apply_sale_stock(_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s RECORD; it RECORD; m RECORD;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF NOT public.is_company_member(auth.uid(), s.company_id) OR NOT (
      public.user_can_write_module(auth.uid(), s.company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), s.company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para baixar estoque desta venda';
  END IF;
  IF s.estoque_baixado THEN RETURN; END IF;
  FOR it IN SELECT material_id, sum(quantidade) AS qtd FROM public.sale_items WHERE sale_id = _sale_id GROUP BY material_id LOOP
    SELECT * INTO m FROM public.materials WHERE id = it.material_id AND company_id = s.company_id FOR UPDATE;
    IF m IS NULL THEN RAISE EXCEPTION 'Produto da venda não encontrado'; END IF;
    IF m.quantidade < it.qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente de % (disponível: %, vendido: %)', m.material, m.quantidade, it.qtd;
    END IF;
    UPDATE public.materials SET quantidade = quantidade - it.qtd WHERE id = m.id;
    INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
    VALUES (s.company_id, m.id, it.qtd, 'saida', 'Venda #' || left(_sale_id::text, 8), auth.uid());
  END LOOP;
  UPDATE public.sales SET estoque_baixado = true WHERE id = _sale_id;
END $function$;
REVOKE EXECUTE ON FUNCTION public.apply_sale_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_sale_stock(uuid) TO authenticated;