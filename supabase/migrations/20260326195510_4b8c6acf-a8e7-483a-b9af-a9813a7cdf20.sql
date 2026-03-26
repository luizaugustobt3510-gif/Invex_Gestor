
-- Sales table
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  desconto_tipo text NOT NULL DEFAULT 'valor',
  forma_pagamento text NOT NULL DEFAULT 'dinheiro',
  status text NOT NULL DEFAULT 'finalizada',
  observacoes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  quantidade numeric NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Sales RLS policies
CREATE POLICY "Company members can view sales" ON public.sales FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admin/logistica can insert sales" ON public.sales FOR INSERT WITH CHECK (
  is_company_admin(auth.uid(), company_id) OR 
  (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);
CREATE POLICY "Company admin/logistica can update sales" ON public.sales FOR UPDATE USING (
  is_company_admin(auth.uid(), company_id) OR 
  (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);
CREATE POLICY "Company admin can delete sales" ON public.sales FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access sales" ON public.sales FOR ALL USING (is_super_admin(auth.uid()));

-- Sale items RLS policies
CREATE POLICY "Company members can view sale_items" ON public.sale_items FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admin/logistica can insert sale_items" ON public.sale_items FOR INSERT WITH CHECK (
  is_company_admin(auth.uid(), company_id) OR 
  (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);
CREATE POLICY "Company admin/logistica can update sale_items" ON public.sale_items FOR UPDATE USING (
  is_company_admin(auth.uid(), company_id) OR 
  (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);
CREATE POLICY "Company admin can delete sale_items" ON public.sale_items FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access sale_items" ON public.sale_items FOR ALL USING (is_super_admin(auth.uid()));
