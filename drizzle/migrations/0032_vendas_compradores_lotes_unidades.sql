-- ===== Unidades: quais aceitam fração (kg, t, L...) =====
CREATE OR REPLACE FUNCTION public.unit_is_fractional(_u text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT upper(trim(coalesce(_u, ''))) IN (
    'KG','KGS','KILO','KILOS','QUILO','QUILOS','G','GR','GRAMA','GRAMAS','MG',
    'T','TON','TONELADA','TONELADAS','L','LT','LTS','LITRO','LITROS','ML',
    'M','MT','METRO','METROS','CM','M2','M²','M3','M³','ARROBA','@'
  )
$$;

CREATE OR REPLACE FUNCTION public.check_qty_unit(_qtd numeric, _unidade text, _nome text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _qtd IS NOT NULL AND NOT public.unit_is_fractional(_unidade) AND _qtd <> trunc(_qtd) THEN
    RAISE EXCEPTION '% é vendido/controlado em % e não aceita quantidade fracionada (%)', _nome, coalesce(nullif(trim(_unidade),''),'unidade'), _qtd;
  END IF;
END $$;

-- ===== Compradores =====
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica','juridica')),
  documento text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  uf text,
  segmento text NOT NULL DEFAULT '',
  prazo_pagamento_dias integer NOT NULL DEFAULT 0,
  limite_credito numeric NOT NULL DEFAULT 0,
  nota numeric NOT NULL DEFAULT 5,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_company_idx ON public.customers(company_id, nome);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales users view customers" ON public.customers FOR SELECT TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica')
      OR public.user_can_write_module(auth.uid(), company_id, 'financeiro'));
CREATE POLICY "Sales users insert customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Sales users update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'))
  WITH CHECK (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Sales users delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  nota numeric NOT NULL DEFAULT 5,
  pontualidade numeric NOT NULL DEFAULT 5,
  comentario text,
  avaliador_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_evaluations_customer_idx ON public.customer_evaluations(customer_id);
GRANT SELECT, INSERT, DELETE ON public.customer_evaluations TO authenticated;
GRANT ALL ON public.customer_evaluations TO service_role;
ALTER TABLE public.customer_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales users view customer evaluations" ON public.customer_evaluations FOR SELECT TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica')
      OR public.user_can_write_module(auth.uid(), company_id, 'financeiro'));
CREATE POLICY "Sales users insert customer evaluations" ON public.customer_evaluations FOR INSERT TO authenticated
  WITH CHECK ((public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'))
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.company_id = customer_evaluations.company_id));
CREATE POLICY "Sales users delete customer evaluations" ON public.customer_evaluations FOR DELETE TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), company_id, 'logistica'));

-- ===== Venda: comprador e lote =====
ALTER TABLE public.sales ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN cliente_nome text NOT NULL DEFAULT '';
ALTER TABLE public.sale_items ADD COLUMN lote text NOT NULL DEFAULT '';
ALTER TABLE public.sale_items ADD COLUMN lote_modo text NOT NULL DEFAULT 'auto';
ALTER TABLE public.sale_items ADD COLUMN lote_ref_id uuid;
ALTER TABLE public.sale_items ADD COLUMN lote_ref_tipo text;

-- ===== Lotes de produto (produção ou entrada pela Vendas) =====
CREATE TABLE public.product_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  lote text NOT NULL DEFAULT '',
  data_producao date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  validade date,
  quantidade numeric NOT NULL DEFAULT 0,
  quantidade_restante numeric NOT NULL DEFAULT 0,
  origem text NOT NULL DEFAULT 'entrada',
  origem_id uuid,
  custo_total numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_lots_material_idx ON public.product_lots(company_id, material_id, data_producao);
GRANT SELECT ON public.product_lots TO authenticated;
GRANT ALL ON public.product_lots TO service_role;
ALTER TABLE public.product_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view product lots" ON public.product_lots FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE TABLE public.sale_item_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  material_id uuid NOT NULL,
  lote_tipo text NOT NULL DEFAULT 'sem_lote',
  lote_id uuid,
  lote text NOT NULL DEFAULT '',
  data_producao date,
  validade date,
  quantidade numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sale_item_lots_sale_idx ON public.sale_item_lots(sale_id);
CREATE INDEX sale_item_lots_lote_idx ON public.sale_item_lots(lote_id);
GRANT SELECT ON public.sale_item_lots TO authenticated;
GRANT ALL ON public.sale_item_lots TO service_role;
ALTER TABLE public.sale_item_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view sale item lots" ON public.sale_item_lots FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- Data de produção na ordem de produção
ALTER TABLE public.production_orders ADD COLUMN data_producao date DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
UPDATE public.production_orders SET data_producao = (created_at AT TIME ZONE 'America/Sao_Paulo')::date;

-- Backfill: produções já feitas viram lotes; o estoque atual é distribuído dos lotes mais novos para os mais antigos
INSERT INTO public.product_lots(company_id, material_id, lote, data_producao, validade, quantidade, quantidade_restante, origem, origem_id, custo_total, user_id, created_at)
SELECT po.company_id, po.produto_material_id, po.lote_produto, po.data_producao, po.validade, po.quantidade_produzida,
  GREATEST(0, LEAST(po.quantidade_produzida, GREATEST(m.quantidade,0) - COALESCE(sum(po.quantidade_produzida) OVER (
     PARTITION BY po.produto_material_id ORDER BY po.created_at DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0))),
  'producao', po.id, po.custo_materia_prima, po.user_id, po.created_at
FROM public.production_orders po JOIN public.materials m ON m.id = po.produto_material_id
WHERE po.quantidade_produzida > 0;

-- Vendedores (módulo Vendas) podem ver o catálogo de produtos mesmo sem Logística
DROP POLICY "Restrict logistics materials by domain" ON public.materials;
CREATE POLICY "Restrict logistics materials by domain" ON public.materials AS RESTRICTIVE FOR SELECT TO public
USING (
  public.user_has_domain_access(auth.uid(), company_id, 'logistica')
  OR public.has_role_in_company(auth.uid(), 'enfermagem'::app_role, company_id)
  OR public.has_role_in_company(auth.uid(), 'enfermeiro'::app_role, company_id)
  OR public.has_role_in_company(auth.uid(), 'recepcionista'::app_role, company_id)
  OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
  OR public.has_role_in_company(auth.uid(), 'admin_empresa'::app_role, company_id)
  OR public.is_super_admin(auth.uid())
  OR public.user_can_write_module(auth.uid(), company_id, 'vendas')
);

-- ===== Baixa de estoque da venda com lotes =====
CREATE OR REPLACE FUNCTION public.apply_sale_stock(_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE s RECORD; it RECORD; m RECORD; l RECORD; _rest numeric; _take numeric; _lotes text;
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
      RAISE EXCEPTION 'Estoque insuficiente de % (disponível: % %, vendido: % %)', m.material, m.quantidade, m.unidade, it.qtd, m.unidade;
    END IF;
    UPDATE public.materials SET quantidade = quantidade - it.qtd WHERE id = m.id;
    INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
    VALUES (s.company_id, m.id, it.qtd, 'saida', 'Venda #' || left(_sale_id::text, 8), auth.uid());
  END LOOP;

  -- Lotes: escolhido à mão, automático (mais antigo primeiro) ou sem lote
  FOR it IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id ORDER BY created_at, id LOOP
    _rest := it.quantidade;
    IF it.lote_modo = 'manual' AND it.lote_ref_id IS NOT NULL THEN
      IF it.lote_ref_tipo = 'materia_prima' THEN
        SELECT id, COALESCE(NULLIF(lote,''), numero_controle) AS lote, (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS data_producao, validade, quantidade_restante
          INTO l FROM public.raw_material_entries
         WHERE id = it.lote_ref_id AND company_id = s.company_id AND material_id = it.material_id FOR UPDATE;
        IF l IS NULL THEN RAISE EXCEPTION 'Lote escolhido não encontrado'; END IF;
        IF l.quantidade_restante < _rest THEN RAISE EXCEPTION 'O lote % só tem % disponível', l.lote, l.quantidade_restante; END IF;
        UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante - _rest WHERE id = l.id;
      ELSE
        SELECT id, lote, data_producao, validade, quantidade_restante INTO l FROM public.product_lots
         WHERE id = it.lote_ref_id AND company_id = s.company_id AND material_id = it.material_id FOR UPDATE;
        IF l IS NULL THEN RAISE EXCEPTION 'Lote escolhido não encontrado'; END IF;
        IF l.quantidade_restante < _rest THEN RAISE EXCEPTION 'O lote % só tem % disponível', l.lote, l.quantidade_restante; END IF;
        UPDATE public.product_lots SET quantidade_restante = quantidade_restante - _rest WHERE id = l.id;
      END IF;
      INSERT INTO public.sale_item_lots(company_id, sale_id, sale_item_id, material_id, lote_tipo, lote_id, lote, data_producao, validade, quantidade)
      VALUES (s.company_id, _sale_id, it.id, it.material_id, COALESCE(it.lote_ref_tipo,'produto'), l.id, COALESCE(l.lote,''), l.data_producao, l.validade, _rest);
      _rest := 0;
    ELSIF it.lote_modo = 'auto' THEN
      FOR l IN
        SELECT * FROM (
          SELECT pl.id, 'produto'::text AS tipo, pl.lote, pl.data_producao, pl.validade, pl.quantidade_restante, pl.created_at
            FROM public.product_lots pl WHERE pl.company_id = s.company_id AND pl.material_id = it.material_id AND pl.quantidade_restante > 0
          UNION ALL
          SELECT r.id, 'materia_prima', COALESCE(NULLIF(r.lote,''), r.numero_controle), (r.created_at AT TIME ZONE 'America/Sao_Paulo')::date, r.validade, r.quantidade_restante, r.created_at
            FROM public.raw_material_entries r WHERE r.company_id = s.company_id AND r.material_id = it.material_id AND r.quantidade_restante > 0
        ) x ORDER BY x.data_producao, x.created_at
      LOOP
        EXIT WHEN _rest <= 0;
        _take := LEAST(_rest, l.quantidade_restante);
        IF l.tipo = 'materia_prima' THEN
          UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante - _take WHERE id = l.id AND quantidade_restante >= _take;
        ELSE
          UPDATE public.product_lots SET quantidade_restante = quantidade_restante - _take WHERE id = l.id AND quantidade_restante >= _take;
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'O saldo do lote % mudou durante a venda. Tente novamente.', l.lote; END IF;
        INSERT INTO public.sale_item_lots(company_id, sale_id, sale_item_id, material_id, lote_tipo, lote_id, lote, data_producao, validade, quantidade)
        VALUES (s.company_id, _sale_id, it.id, it.material_id, l.tipo, l.id, COALESCE(l.lote,''), l.data_producao, l.validade, _take);
        _rest := _rest - _take;
      END LOOP;
    END IF;
    IF _rest > 0 THEN
      INSERT INTO public.sale_item_lots(company_id, sale_id, sale_item_id, material_id, lote_tipo, lote, quantidade)
      VALUES (s.company_id, _sale_id, it.id, it.material_id, 'sem_lote', COALESCE(it.lote,''), _rest);
    END IF;
    SELECT string_agg(DISTINCT NULLIF(lote,''), ', ') INTO _lotes FROM public.sale_item_lots WHERE sale_item_id = it.id;
    UPDATE public.sale_items SET lote = COALESCE(_lotes, '') WHERE id = it.id;
  END LOOP;

  UPDATE public.sales SET estoque_baixado = true WHERE id = _sale_id;
END $function$;

CREATE OR REPLACE FUNCTION public.reverse_sale_stock(_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE s RECORD; it RECORD; lt RECORD;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF NOT public.is_company_member(auth.uid(), s.company_id) OR NOT (
      public.user_can_write_module(auth.uid(), s.company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), s.company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para estornar esta venda';
  END IF;
  IF NOT s.estoque_baixado THEN RETURN; END IF;
  FOR it IN SELECT material_id, sum(quantidade) AS qtd FROM public.sale_items WHERE sale_id = _sale_id GROUP BY material_id LOOP
    UPDATE public.materials SET quantidade = quantidade + it.qtd WHERE id = it.material_id AND company_id = s.company_id;
    INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
    VALUES (s.company_id, it.material_id, it.qtd, 'entrada', 'Estorno venda #' || left(_sale_id::text, 8), auth.uid());
  END LOOP;
  FOR lt IN SELECT * FROM public.sale_item_lots WHERE sale_id = _sale_id AND lote_id IS NOT NULL LOOP
    IF lt.lote_tipo = 'materia_prima' THEN
      UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante + lt.quantidade WHERE id = lt.lote_id AND company_id = s.company_id;
    ELSE
      UPDATE public.product_lots SET quantidade_restante = quantidade_restante + lt.quantidade WHERE id = lt.lote_id AND company_id = s.company_id;
    END IF;
  END LOOP;
  DELETE FROM public.sale_item_lots WHERE sale_id = _sale_id;
  UPDATE public.sales SET estoque_baixado = false WHERE id = _sale_id;
END $function$;

-- ===== Finalizar venda inteira no servidor (venda, itens, estoque, lotes e financeiro) =====
CREATE OR REPLACE FUNCTION public.finalize_sale(
  _company_id uuid, _items jsonb, _forma_pagamento text, _desconto numeric DEFAULT 0, _desconto_tipo text DEFAULT 'valor',
  _customer_id uuid DEFAULT NULL, _observacoes text DEFAULT '', _vencimento date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _sale uuid; _cli RECORD; _nome text; _sub numeric := 0; _desc numeric; _total numeric; it jsonb; m RECORD;
  _q numeric; _p numeric; _hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; _venc date; _n int := 0;
  _modo text; _forma text := COALESCE(NULLIF(trim(_forma_pagamento),''), 'dinheiro');
BEGIN
  IF NOT public.is_company_member(auth.uid(), _company_id) OR NOT (
      public.user_can_write_module(auth.uid(), _company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), _company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para registrar vendas';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;
  IF _customer_id IS NOT NULL THEN
    SELECT * INTO _cli FROM public.customers WHERE id = _customer_id AND company_id = _company_id;
    IF _cli IS NULL THEN RAISE EXCEPTION 'Comprador não encontrado'; END IF;
    _nome := _cli.nome;
  ELSE
    _nome := 'Consumidor não identificado';
  END IF;
  IF _forma = 'a_prazo' AND _customer_id IS NULL THEN
    RAISE EXCEPTION 'Venda a prazo precisa de um comprador identificado';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO m FROM public.materials WHERE id = (it->>'material_id')::uuid AND company_id = _company_id;
    IF m IS NULL THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    _q := (it->>'quantidade')::numeric;
    _p := COALESCE((it->>'preco_unitario')::numeric, m.preco);
    IF _q IS NULL OR _q <= 0 THEN RAISE EXCEPTION 'Quantidade inválida para %', m.material; END IF;
    IF _p < 0 THEN RAISE EXCEPTION 'Preço inválido para %', m.material; END IF;
    PERFORM public.check_qty_unit(_q, m.unidade, m.material);
    _sub := _sub + round(_q * _p, 2);
  END LOOP;

  _desc := CASE WHEN _desconto_tipo = 'percentual' THEN round(_sub * COALESCE(_desconto,0) / 100, 2) ELSE COALESCE(_desconto,0) END;
  _desc := GREATEST(0, LEAST(_desc, _sub));
  _total := _sub - _desc;

  INSERT INTO public.sales(company_id, user_id, valor_total, desconto, desconto_tipo, forma_pagamento, status, observacoes, customer_id, cliente_nome)
  VALUES (_company_id, auth.uid(), _total, _desc, COALESCE(_desconto_tipo,'valor'), _forma, 'finalizada', COALESCE(_observacoes,''), _customer_id, _nome)
  RETURNING id INTO _sale;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO m FROM public.materials WHERE id = (it->>'material_id')::uuid AND company_id = _company_id;
    _q := (it->>'quantidade')::numeric;
    _p := COALESCE((it->>'preco_unitario')::numeric, m.preco);
    _modo := COALESCE(NULLIF(it->>'lote_modo',''), 'auto');
    IF _modo NOT IN ('auto','manual','sem_lote') THEN _modo := 'auto'; END IF;
    INSERT INTO public.sale_items(sale_id, company_id, material_id, quantidade, preco_unitario, subtotal, lote, lote_modo, lote_ref_id, lote_ref_tipo)
    VALUES (_sale, _company_id, m.id, _q, _p, round(_q * _p, 2), COALESCE(it->>'lote',''), _modo,
      NULLIF(it->>'lote_ref_id','')::uuid, NULLIF(it->>'lote_ref_tipo',''));
    _n := _n + 1;
  END LOOP;

  PERFORM public.apply_sale_stock(_sale);

  _venc := CASE WHEN _forma = 'a_prazo' THEN COALESCE(_vencimento, _hoje + COALESCE(_cli.prazo_pagamento_dias, 0)) ELSE _hoje END;
  INSERT INTO public.financial_entries(company_id, user_id, tipo, descricao, valor, data, data_vencimento, data_pagamento, status, forma_pagamento, origem, origem_id)
  VALUES (_company_id, auth.uid(), 'receita',
    'Venda #' || left(_sale::text, 8) || ' · ' || _nome || ' · ' || _n || ' item(ns)', _total, _hoje, _venc,
    CASE WHEN _forma = 'a_prazo' THEN NULL ELSE _hoje END,
    CASE WHEN _forma = 'a_prazo' THEN 'pendente' ELSE 'pago' END, _forma, 'vendas', _sale::text);

  RETURN _sale;
END $function$;

-- ===== Cadastro de produto e entrada de lote pela Vendas (empresas sem Logística/Produção) =====
CREATE OR REPLACE FUNCTION public.save_sale_product(
  _company_id uuid, _id uuid, _codigo text, _material text, _unidade text, _preco numeric, _minimo numeric DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _r uuid;
BEGIN
  IF NOT public.is_company_member(auth.uid(), _company_id) OR NOT (
      public.user_can_write_module(auth.uid(), _company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), _company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para cadastrar produtos';
  END IF;
  IF NULLIF(trim(COALESCE(_material,'')),'') IS NULL THEN RAISE EXCEPTION 'Informe o nome do produto'; END IF;
  IF COALESCE(_preco,0) < 0 THEN RAISE EXCEPTION 'Preço inválido'; END IF;
  IF _id IS NULL THEN
    IF NULLIF(trim(COALESCE(_codigo,'')),'') IS NULL THEN RAISE EXCEPTION 'Informe o código do produto'; END IF;
    INSERT INTO public.materials(company_id, codigo, material, unidade, preco, minimo, quantidade, tipo)
    VALUES (_company_id, trim(_codigo), trim(_material), COALESCE(NULLIF(trim(_unidade),''),'UN'), COALESCE(_preco,0), COALESCE(_minimo,0), 0, 'produto_final')
    RETURNING id INTO _r;
  ELSE
    UPDATE public.materials SET material = trim(_material), unidade = COALESCE(NULLIF(trim(_unidade),''), unidade),
      preco = COALESCE(_preco, preco), minimo = COALESCE(_minimo, minimo)
     WHERE id = _id AND company_id = _company_id RETURNING id INTO _r;
    IF _r IS NULL THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  END IF;
  RETURN _r;
END $function$;

CREATE OR REPLACE FUNCTION public.register_product_lot(
  _company_id uuid, _material_id uuid, _quantidade numeric, _lote text, _data_producao date, _validade date, _observacoes text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE m RECORD; _id uuid; _l text;
BEGIN
  IF NOT public.is_company_member(auth.uid(), _company_id) OR NOT (
      public.user_can_write_module(auth.uid(), _company_id, 'vendas')
      OR public.can_write_producao(auth.uid(), _company_id)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar entrada de lote';
  END IF;
  IF _quantidade IS NULL OR _quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  SELECT * INTO m FROM public.materials WHERE id = _material_id AND company_id = _company_id FOR UPDATE;
  IF m IS NULL THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  PERFORM public.check_qty_unit(_quantidade, m.unidade, m.material);
  _l := NULLIF(trim(COALESCE(_lote,'')),'');
  IF _l IS NULL THEN
    _l := 'L-' || to_char(COALESCE(_data_producao, (now() AT TIME ZONE 'America/Sao_Paulo')::date), 'YYYYMMDD') || '-' ||
      (SELECT lpad((count(*)+1)::text, 2, '0') FROM public.product_lots WHERE company_id = _company_id AND material_id = _material_id);
  END IF;
  INSERT INTO public.product_lots(company_id, material_id, lote, data_producao, validade, quantidade, quantidade_restante, origem, observacoes, user_id)
  VALUES (_company_id, m.id, _l, COALESCE(_data_producao, (now() AT TIME ZONE 'America/Sao_Paulo')::date), _validade, _quantidade, _quantidade, 'entrada', COALESCE(_observacoes,''), auth.uid())
  RETURNING id INTO _id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade WHERE id = m.id;
  INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
  VALUES (_company_id, m.id, _quantidade, 'entrada', 'Entrada de lote ' || _l, auth.uid());
  RETURN _id;
END $function$;

-- ===== Produção: data de produção, unidades e lote do produto =====
DROP FUNCTION public.register_production(uuid, uuid, numeric, numeric, text, text, date);
CREATE FUNCTION public.register_production(_entry_id uuid, _produto_material_id uuid, _quantidade_consumida numeric, _quantidade_produzida numeric, _lote_produto text, _observacoes text, _validade date DEFAULT NULL::date, _data_producao date DEFAULT NULL::date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE e RECORD; mp RECORD; pr RECORD; _id uuid; _custo numeric; _lote text;
  _dp date := COALESCE(_data_producao, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
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
  IF mp.quantidade < _quantidade_consumida THEN RAISE EXCEPTION 'Estoque da matéria-prima insuficiente (disponível: % %)', mp.quantidade, mp.unidade; END IF;
  PERFORM public.check_qty_unit(_quantidade_consumida, mp.unidade, mp.material);
  PERFORM public.check_qty_unit(_quantidade_produzida, pr.unidade, pr.material);
  _custo := round(COALESCE(e.custo_total,0) / NULLIF(e.quantidade,0) * _quantidade_consumida, 2);
  _lote := COALESCE(NULLIF(trim(_lote_produto),''), 'PA-' || e.numero_controle);

  UPDATE public.raw_material_entries SET quantidade_restante = quantidade_restante - _quantidade_consumida WHERE id = e.id;
  UPDATE public.materials SET quantidade = quantidade - _quantidade_consumida WHERE id = mp.id;
  UPDATE public.materials SET quantidade = quantidade + _quantidade_produzida,
    tipo = CASE WHEN tipo = 'comum' THEN 'produto_final' ELSE tipo END
   WHERE id = pr.id;
  INSERT INTO public.production_orders(company_id, entry_id, produto_material_id, quantidade_consumida, quantidade_produzida, lote_produto, observacoes, user_id, validade, custo_materia_prima, data_producao)
  VALUES (e.company_id, e.id, pr.id, _quantidade_consumida, _quantidade_produzida, _lote, COALESCE(_observacoes,''), auth.uid(), _validade, COALESCE(_custo,0), _dp)
  RETURNING id INTO _id;
  IF _quantidade_produzida > 0 THEN
    INSERT INTO public.product_lots(company_id, material_id, lote, data_producao, validade, quantidade, quantidade_restante, origem, origem_id, custo_total, user_id)
    VALUES (e.company_id, pr.id, _lote, _dp, _validade, _quantidade_produzida, _quantidade_produzida, 'producao', _id, COALESCE(_custo,0), auth.uid());
  END IF;
  INSERT INTO public.stock_movements(company_id, material_id, quantidade, tipo, obs, user_id)
  VALUES (e.company_id, mp.id, _quantidade_consumida, 'saida', 'Consumo produção lote ' || e.numero_controle, auth.uid()),
         (e.company_id, pr.id, _quantidade_produzida, 'entrada', 'Produção a partir do lote ' || e.numero_controle, auth.uid());
  RETURN _id;
END $function$;