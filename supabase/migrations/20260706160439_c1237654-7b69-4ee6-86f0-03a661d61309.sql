
-- 1. Add subscription fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_block boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'ativa';

-- 2. Function to evaluate subscription status (idempotent)
CREATE OR REPLACE FUNCTION public.evaluate_subscription_status(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  new_status text;
BEGIN
  SELECT next_due_date, grace_days, auto_block, subscription_status
    INTO c FROM public.companies WHERE id = _company_id;

  IF c IS NULL THEN
    RETURN NULL;
  END IF;

  IF c.next_due_date IS NULL THEN
    new_status := 'ativa';
  ELSIF CURRENT_DATE <= c.next_due_date THEN
    new_status := 'ativa';
  ELSIF CURRENT_DATE <= (c.next_due_date + COALESCE(c.grace_days, 0)) THEN
    new_status := 'em_atraso';
  ELSE
    IF c.auto_block THEN
      new_status := 'bloqueada';
    ELSE
      new_status := 'em_atraso';
    END IF;
  END IF;

  IF new_status <> c.subscription_status THEN
    UPDATE public.companies SET subscription_status = new_status WHERE id = _company_id;
  END IF;

  RETURN new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_subscription_status(uuid) TO authenticated, anon, service_role;

-- 3. Payments history table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pago',
  payment_date date,
  registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registered_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access subscription_payments"
  ON public.subscription_payments FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Members can view own subscription payments"
  ON public.subscription_payments FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

-- 4. Register payment RPC
CREATE OR REPLACE FUNCTION public.register_subscription_payment(
  _company_id uuid,
  _amount numeric,
  _payment_date date,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  new_due date;
  months_add int;
  payment_id uuid;
  registered_name text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente super admin pode registrar pagamentos';
  END IF;

  SELECT * INTO c FROM public.companies WHERE id = _company_id;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  months_add := CASE COALESCE(c.plan_type, 'mensal')
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 12
    ELSE 1
  END;

  new_due := (COALESCE(c.next_due_date, _payment_date) + (months_add || ' months')::interval)::date;

  SELECT COALESCE(nome, email) INTO registered_name FROM public.profiles WHERE user_id = auth.uid();

  INSERT INTO public.subscription_payments (
    company_id, due_date, amount, status, payment_date, registered_by, registered_by_name, notes
  ) VALUES (
    _company_id, COALESCE(c.next_due_date, _payment_date), _amount, 'pago', _payment_date, auth.uid(), registered_name, _notes
  ) RETURNING id INTO payment_id;

  UPDATE public.companies
    SET next_due_date = new_due,
        subscription_status = 'ativa'
    WHERE id = _company_id;

  RETURN payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_subscription_payment(uuid, numeric, date, text) TO authenticated, service_role;
