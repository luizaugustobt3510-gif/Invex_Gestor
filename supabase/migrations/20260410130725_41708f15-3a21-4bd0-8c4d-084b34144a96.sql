
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  tipo_material TEXT NOT NULL DEFAULT '',
  preco_medio NUMERIC NOT NULL DEFAULT 0,
  prazo_medio_dias INTEGER NOT NULL DEFAULT 0,
  nota_qualidade NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view suppliers"
ON public.suppliers FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admin/logistica can insert suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

CREATE POLICY "Company admin/logistica can update suppliers"
ON public.suppliers FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

CREATE POLICY "Company admin/logistica can delete suppliers"
ON public.suppliers FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

CREATE POLICY "Super admin full access suppliers"
ON public.suppliers FOR ALL
USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create supplier evaluations table
CREATE TABLE public.supplier_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  nota NUMERIC NOT NULL DEFAULT 0,
  comentario TEXT DEFAULT '',
  avaliador_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view supplier_evaluations"
ON public.supplier_evaluations FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admin/logistica can insert supplier_evaluations"
ON public.supplier_evaluations FOR INSERT
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

CREATE POLICY "Company admin/logistica can delete supplier_evaluations"
ON public.supplier_evaluations FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

CREATE POLICY "Super admin full access supplier_evaluations"
ON public.supplier_evaluations FOR ALL
USING (is_super_admin(auth.uid()));
