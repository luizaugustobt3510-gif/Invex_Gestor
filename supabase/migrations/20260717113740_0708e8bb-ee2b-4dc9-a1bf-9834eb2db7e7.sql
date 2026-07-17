
-- 1. material_dispensations: novos campos
ALTER TABLE public.material_dispensations
  ADD COLUMN IF NOT EXISTS destino_tipo text NOT NULL DEFAULT 'paciente',
  ADD COLUMN IF NOT EXISTS destino_sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destino_sector_nome text,
  ADD COLUMN IF NOT EXISTS exam_type text,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric,
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'a_faturar';

-- 2. user_signatures: setor
ALTER TABLE public.user_signatures
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sector_nome text;

-- 3. materials: preço unitário
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS preco_unitario numeric;

-- 4. anamneses: assinatura utilizada
ALTER TABLE public.anamneses
  ADD COLUMN IF NOT EXISTS signature_image_url text,
  ADD COLUMN IF NOT EXISTS signature_source text;

-- 5. stock_access_grants
CREATE TABLE IF NOT EXISTS public.stock_access_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_sector_id uuid REFERENCES public.sectors(id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT true,
  can_write boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, to_user_id, from_sector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_access_grants TO authenticated;
GRANT ALL ON public.stock_access_grants TO service_role;

ALTER TABLE public.stock_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock grants"
  ON public.stock_access_grants
  FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Users view own stock grants"
  ON public.stock_access_grants
  FOR SELECT
  USING (auth.uid() = to_user_id AND public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_stock_access_grants_updated_at
  BEFORE UPDATE ON public.stock_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
