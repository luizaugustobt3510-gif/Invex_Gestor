
-- Table for physical stock counts
CREATE TABLE public.contagem_fisica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  data_contagem TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  quantidade_contada NUMERIC NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL,
  obs TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contagem_fisica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view counts" ON public.contagem_fisica FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company members can insert counts" ON public.contagem_fisica FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Super admin full access counts" ON public.contagem_fisica FOR ALL USING (is_super_admin(auth.uid()));

-- Table for imported movements (from external systems)
CREATE TABLE public.movimentacoes_importadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade NUMERIC NOT NULL DEFAULT 0,
  origem TEXT DEFAULT 'sistema_clinica',
  lote_importacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_importadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view imported movements" ON public.movimentacoes_importadas FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admins can insert imported movements" ON public.movimentacoes_importadas FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Company admins can delete imported movements" ON public.movimentacoes_importadas FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access imported" ON public.movimentacoes_importadas FOR ALL USING (is_super_admin(auth.uid()));

-- Table for reconciliation audit log
CREATE TABLE public.conciliacao_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  saldo_fisico NUMERIC NOT NULL,
  saldo_teorico NUMERIC NOT NULL,
  divergencia NUMERIC NOT NULL,
  tipo_ajuste TEXT,
  motivo TEXT,
  usuario_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conciliacao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view conciliacao" ON public.conciliacao_log FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admins can insert conciliacao" ON public.conciliacao_log FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admin full access conciliacao" ON public.conciliacao_log FOR ALL USING (is_super_admin(auth.uid()));
