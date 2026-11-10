-- ===== Invex Finanças (finanças pessoais) — isolado por usuário =====

-- Premium manual (Super Admin)
CREATE TABLE public.financas_premium_grants (
  user_id uuid PRIMARY KEY,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  fim date,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financas_premium_grants TO authenticated;
GRANT ALL ON public.financas_premium_grants TO service_role;
ALTER TABLE public.financas_premium_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financas grants: dono le" ON public.financas_premium_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "financas grants: super admin gerencia" ON public.financas_premium_grants
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.financas_is_premium(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
    OR EXISTS (SELECT 1 FROM public.financas_premium_grants WHERE user_id = _uid AND ativo
         AND (fim IS NULL OR fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date))
    OR public.has_product_subscription(_uid, 'financas_premium')
$$;

CREATE OR REPLACE FUNCTION public.financas_admin_grant(_email text, _ativo boolean, _fim date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT user_id INTO _uid FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  INSERT INTO public.financas_premium_grants(user_id, email, ativo, fim, granted_by)
  VALUES (_uid, lower(trim(_email)), _ativo, _fim, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET ativo = EXCLUDED.ativo, fim = EXCLUDED.fim,
    granted_by = EXCLUDED.granted_by, updated_at = now();
  RETURN _uid;
END $$;

-- Compartilhamento (somente leitura) por e-mail
CREATE TABLE public.personal_account_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  viewer_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, viewer_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_account_shares TO authenticated;
GRANT ALL ON public.personal_account_shares TO service_role;
ALTER TABLE public.personal_account_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shares: dono gerencia" ON public.personal_account_shares
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "shares: convidado le o proprio convite" ON public.personal_account_shares
  FOR SELECT TO authenticated USING (lower(viewer_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE OR REPLACE FUNCTION public.personal_is_viewer_of(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.personal_account_shares s
    WHERE s.owner_id = _owner
      AND lower(s.viewer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.personal_is_viewer_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.personal_is_viewer_of(uuid) TO authenticated;

-- Pessoas
CREATE TABLE public.personal_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_people TO authenticated;
GRANT ALL ON public.personal_people TO service_role;
ALTER TABLE public.personal_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "people: dono gerencia" ON public.personal_people
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "people: compartilhado le" ON public.personal_people
  FOR SELECT TO authenticated USING (public.personal_is_viewer_of(user_id));

-- Categorias
CREATE TABLE public.personal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'despesa' CHECK (kind IN ('receita','despesa')),
  key text NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📦',
  subcategories text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_categories TO authenticated;
GRANT ALL ON public.personal_categories TO service_role;
ALTER TABLE public.personal_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories: dono gerencia" ON public.personal_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories: compartilhado le" ON public.personal_categories
  FOR SELECT TO authenticated USING (public.personal_is_viewer_of(user_id));
CREATE INDEX idx_personal_categories_user ON public.personal_categories (user_id, sort_order);

-- Lançamentos
CREATE TABLE public.personal_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('receita','despesa')),
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago','pendente')),
  note text,
  person_id uuid REFERENCES public.personal_people(id) ON DELETE SET NULL,
  series_id uuid,
  series_kind text CHECK (series_kind IN ('parcelado','recorrente')),
  installment_number integer,
  installment_total integer,
  competencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_transactions TO authenticated;
GRANT ALL ON public.personal_transactions TO service_role;
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions: dono gerencia" ON public.personal_transactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions: compartilhado le" ON public.personal_transactions
  FOR SELECT TO authenticated USING (public.personal_is_viewer_of(user_id));
CREATE INDEX idx_personal_tx_user_date ON public.personal_transactions (user_id, date DESC);
CREATE INDEX idx_personal_tx_series ON public.personal_transactions (series_id);
CREATE INDEX idx_personal_tx_person ON public.personal_transactions (person_id);

-- Teto de gastos por categoria
CREATE TABLE public.personal_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_budgets TO authenticated;
GRANT ALL ON public.personal_budgets TO service_role;
ALTER TABLE public.personal_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets: dono gerencia" ON public.personal_budgets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets: compartilhado le" ON public.personal_budgets
  FOR SELECT TO authenticated USING (public.personal_is_viewer_of(user_id));

-- updated_at
CREATE TRIGGER trg_personal_people_updated BEFORE UPDATE ON public.personal_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_personal_categories_updated BEFORE UPDATE ON public.personal_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_personal_transactions_updated BEFORE UPDATE ON public.personal_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_personal_budgets_updated BEFORE UPDATE ON public.personal_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_financas_grants_updated BEFORE UPDATE ON public.financas_premium_grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Premium decidido no banco: pessoas e compartilhamento
CREATE OR REPLACE FUNCTION public.financas_enforce_premium()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  _owner := CASE WHEN TG_TABLE_NAME = 'personal_account_shares' THEN NEW.owner_id ELSE NEW.user_id END;
  IF NOT public.financas_is_premium(_owner) THEN
    RAISE EXCEPTION 'PREMIUM_FINANCAS: recurso exclusivo do Invex Finanças Premium';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_personal_people_premium BEFORE INSERT ON public.personal_people FOR EACH ROW EXECUTE FUNCTION public.financas_enforce_premium();
CREATE TRIGGER trg_personal_shares_premium BEFORE INSERT ON public.personal_account_shares FOR EACH ROW EXECUTE FUNCTION public.financas_enforce_premium();

-- Pessoa vinculada precisa ser do mesmo dono do lançamento
CREATE OR REPLACE FUNCTION public.personal_tx_check_person()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.person_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.personal_people p WHERE p.id = NEW.person_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Pessoa inválida para este lançamento';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_personal_tx_person BEFORE INSERT OR UPDATE OF person_id, user_id ON public.personal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.personal_tx_check_person();