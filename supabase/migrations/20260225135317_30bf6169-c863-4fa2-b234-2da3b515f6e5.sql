
-- Create table for imported system balances
CREATE TABLE public.saldo_sistema_importado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  saldo_sistema numeric NOT NULL DEFAULT 0,
  data_importacao timestamp with time zone NOT NULL DEFAULT now(),
  lote_importacao text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saldo_sistema_importado ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view system balances"
  ON public.saldo_sistema_importado FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can insert system balances"
  ON public.saldo_sistema_importado FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete system balances"
  ON public.saldo_sistema_importado FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admin full access system balances"
  ON public.saldo_sistema_importado FOR ALL
  USING (is_super_admin(auth.uid()));
