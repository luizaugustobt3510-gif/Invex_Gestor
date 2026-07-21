
CREATE OR REPLACE FUNCTION public.transfer_material_to_sector(
  _company_id UUID,
  _material_id UUID,
  _sector_id UUID,
  _quantidade NUMERIC,
  _obs TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mat RECORD;
  new_stock NUMERIC;
  mov_id UUID;
BEGIN
  IF _quantidade IS NULL OR _quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF NOT (public.is_company_member(auth.uid(), _company_id)
          AND public.user_can_write_module(auth.uid(), _company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para transferir materiais';
  END IF;

  SELECT * INTO mat FROM public.materials
    WHERE id = _material_id AND company_id = _company_id FOR UPDATE;
  IF mat IS NULL THEN RAISE EXCEPTION 'Material inexistente'; END IF;

  new_stock := mat.quantidade - _quantidade;
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente (atual: %, solicitado: %)', mat.quantidade, _quantidade;
  END IF;

  UPDATE public.materials SET quantidade = new_stock WHERE id = mat.id;

  INSERT INTO public.sector_stock (company_id, sector_id, material_id, quantidade)
  VALUES (_company_id, _sector_id, mat.id, _quantidade)
  ON CONFLICT (company_id, sector_id, material_id)
  DO UPDATE SET quantidade = public.sector_stock.quantidade + EXCLUDED.quantidade,
                updated_at = now();

  INSERT INTO public.stock_movements (company_id, material_id, quantidade, tipo, obs, user_id, sector_id)
  VALUES (_company_id, mat.id, _quantidade, 'transferencia',
          COALESCE(_obs, 'Transferência avulsa para setor'), auth.uid(), _sector_id)
  RETURNING id INTO mov_id;

  RETURN mov_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_material_to_sector(UUID, UUID, UUID, NUMERIC, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.transfer_material_to_sector(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
