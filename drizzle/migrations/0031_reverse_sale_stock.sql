-- Estorno do estoque de uma venda cancelada (só se a baixa foi feita)
CREATE OR REPLACE FUNCTION public.reverse_sale_stock(_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s RECORD; it RECORD;
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
  UPDATE public.sales SET estoque_baixado = false WHERE id = _sale_id;
END $function$;
REVOKE EXECUTE ON FUNCTION public.reverse_sale_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_sale_stock(uuid) TO authenticated;

-- Vendas finalizadas antes desta mudança já tiveram o estoque baixado pelo PDV
UPDATE public.sales SET estoque_baixado = true WHERE status = 'finalizada' AND estoque_baixado = false;