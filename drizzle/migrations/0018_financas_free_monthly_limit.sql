-- Plano gratuito do Invex Finanças: até 5 despesas, 5 receitas e 5 reservas por mês
CREATE OR REPLACE FUNCTION public.personal_tx_bucket(_type text, _sub text, _desc text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _type = 'despesa' THEN 'despesa'
    WHEN _sub = 'Outros' AND lower(coalesce(_desc, '')) LIKE '%reserva%' THEN 'reserva'
    ELSE 'receita' END
$$;

CREATE OR REPLACE FUNCTION public.personal_tx_month(_competencia text, _date date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(_competencia, ''), to_char(_date, 'YYYY-MM'))
$$;

CREATE OR REPLACE FUNCTION public.financas_enforce_free_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bucket text; _month text; _n int; _label text;
BEGIN
  _bucket := public.personal_tx_bucket(NEW.type, NEW.subcategory, NEW.description);
  _month := public.personal_tx_month(NEW.competencia, NEW.date);
  IF TG_OP = 'UPDATE' AND NEW.user_id = OLD.user_id
     AND _bucket = public.personal_tx_bucket(OLD.type, OLD.subcategory, OLD.description)
     AND _month = public.personal_tx_month(OLD.competencia, OLD.date) THEN
    RETURN NEW;
  END IF;
  IF public.financas_is_premium(NEW.user_id) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('financas_free_limit:' || NEW.user_id::text));
  SELECT count(*) INTO _n FROM public.personal_transactions
   WHERE user_id = NEW.user_id AND id <> NEW.id
     AND public.personal_tx_bucket(type, subcategory, description) = _bucket
     AND public.personal_tx_month(competencia, date) = _month;
  IF _n >= 5 THEN
    _label := CASE _bucket WHEN 'despesa' THEN 'despesas' WHEN 'reserva' THEN 'reservas' ELSE 'receitas' END;
    RAISE EXCEPTION 'LIMITE_FINANCAS: o plano gratuito permite 5 % por mês (%). Assine o Premium para lançar sem limite.',
      _label, to_char(to_date(_month || '-01', 'YYYY-MM-DD'), 'MM/YYYY');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.financas_enforce_free_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_personal_tx_free_limit
  BEFORE INSERT OR UPDATE OF type, subcategory, description, date, competencia, user_id
  ON public.personal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.financas_enforce_free_limit();