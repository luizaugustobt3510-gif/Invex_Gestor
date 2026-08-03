DROP POLICY IF EXISTS "Clinical staff delete company signatures" ON public.user_signatures;
CREATE POLICY "Clinical staff delete company signatures"
ON public.user_signatures FOR DELETE TO authenticated
USING (
  public.is_company_member(auth.uid(), company_id)
  AND public.has_clinical_access(auth.uid(), company_id)
);

CREATE OR REPLACE FUNCTION public.transfer_material_to_sector(_company_id uuid, _material_id uuid, _sector_id uuid, _quantidade numeric, _obs text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  mat RECORD;
  new_stock NUMERIC;
  mov_id UUID;
BEGIN
  IF _quantidade IS NULL OR _quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF NOT (public.is_company_member(auth.uid(), _company_id)
          AND (
            public.user_can_write_module(auth.uid(), _company_id, 'logistica')
            OR public.user_can_write_module(auth.uid(), _company_id, 'dispensacao')
            OR public.has_clinical_access(auth.uid(), _company_id)
          )) THEN
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
$function$;