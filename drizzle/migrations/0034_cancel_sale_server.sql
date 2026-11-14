CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE s RECORD;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = _sale_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF NOT public.is_company_member(auth.uid(), s.company_id) OR NOT (
      public.user_can_write_module(auth.uid(), s.company_id, 'vendas')
      OR public.user_can_write_module(auth.uid(), s.company_id, 'logistica')) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar esta venda';
  END IF;
  IF s.status = 'cancelada' THEN RETURN; END IF;
  PERFORM public.reverse_sale_stock(_sale_id);
  UPDATE public.sales SET status = 'cancelada' WHERE id = _sale_id;
  UPDATE public.financial_entries SET status = 'cancelado'
   WHERE company_id = s.company_id AND origem = 'vendas' AND origem_id = _sale_id::text;
END $function$;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid) TO authenticated;