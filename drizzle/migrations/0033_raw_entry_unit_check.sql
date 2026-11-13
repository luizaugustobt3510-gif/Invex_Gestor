CREATE OR REPLACE FUNCTION public.register_raw_entry(_company_id uuid, _material_id uuid, _quantidade numeric, _lote text, _procedencia text, _temperatura numeric, _especificacao text, _numero_controle text, _boletim boolean, _fop text, _observacoes text, _foto_path text, _custo_total numeric, _vencimento date, _validade date DEFAULT NULL::date)
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
  PERFORM public.check_qty_unit(_quantidade, mat.unidade, mat.material);
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