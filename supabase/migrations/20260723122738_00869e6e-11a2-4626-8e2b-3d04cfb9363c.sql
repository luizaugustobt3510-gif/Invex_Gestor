CREATE OR REPLACE FUNCTION public.deliver_material_request(_request_id uuid, _sector_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF lower(req.status) NOT IN ('pendente', 'aprovada', 'aprovado') THEN
    RAISE EXCEPTION 'Solicitação não pode ser entregue (status atual: %)', req.status;
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

  target_sector := _sector_id;
  IF target_sector IS NULL THEN
    SELECT id INTO target_sector FROM public.sectors
      WHERE company_id = req.company_id AND lower(nome) = lower(req.setor)
      LIMIT 1;
  END IF;
  IF target_sector IS NULL THEN
    RAISE EXCEPTION 'Setor de destino "%" não encontrado. Cadastre-o antes de entregar.', req.setor;
  END IF;

  UPDATE public.materials SET quantidade = new_stock WHERE id = mat.id;

  INSERT INTO public.sector_stock (company_id, sector_id, material_id, quantidade)
  VALUES (req.company_id, target_sector, mat.id, req.quantidade)
  ON CONFLICT (company_id, sector_id, material_id)
  DO UPDATE SET quantidade = public.sector_stock.quantidade + EXCLUDED.quantidade,
                updated_at = now();

  INSERT INTO public.stock_movements (company_id, material_id, quantidade, tipo, obs, user_id, sector_id, request_id)
  VALUES (req.company_id, mat.id, req.quantidade, 'transferencia',
          'Entrega solicitação para setor', auth.uid(), target_sector, req.id);

  UPDATE public.material_requests SET status = 'Entregue' WHERE id = req.id;

  RETURN req.id;
END;
$function$;