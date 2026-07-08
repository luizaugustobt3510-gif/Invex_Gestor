
-- 1) Modelos de anamnese
CREATE TABLE public.anamnese_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamnese_templates TO authenticated;
GRANT ALL ON public.anamnese_templates TO service_role;

ALTER TABLE public.anamnese_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anamnese_templates select company"
  ON public.anamnese_templates FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "anamnese_templates write admin/clinica"
  ON public.anamnese_templates FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  );

CREATE POLICY "anamnese_templates update admin/clinica"
  ON public.anamnese_templates FOR UPDATE TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  )
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  );

CREATE POLICY "anamnese_templates delete admin"
  ON public.anamnese_templates FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_anamnese_templates_updated
  BEFORE UPDATE ON public.anamnese_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Anamneses realizadas
CREATE TABLE public.anamneses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.anamnese_templates(id) ON DELETE SET NULL,
  template_name TEXT,
  exam_type TEXT NOT NULL,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations TEXT,
  created_by UUID,
  created_by_name TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamneses TO authenticated;
GRANT ALL ON public.anamneses TO service_role;

ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anamneses select company"
  ON public.anamneses FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "anamneses insert admin/clinica"
  ON public.anamneses FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  );

CREATE POLICY "anamneses update admin/clinica"
  ON public.anamneses FOR UPDATE TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  )
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.is_company_admin(auth.uid(), company_id)
      OR public.has_role_in_company(auth.uid(), 'clinica'::app_role, company_id)
    )
  );

CREATE POLICY "anamneses delete admin"
  ON public.anamneses FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_anamneses_updated
  BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_anamneses_patient ON public.anamneses(patient_id);
CREATE INDEX idx_anamneses_company ON public.anamneses(company_id);
CREATE INDEX idx_anamnese_templates_company ON public.anamnese_templates(company_id);

-- 3) Módulo inicia DESATIVADO para TODAS as empresas.
--    Somente Super Admin ativa (via GestaoModulos). Somente clínicas devem ativar.
INSERT INTO public.company_modules (company_id, module_key, is_active)
SELECT id, 'anamnese', false FROM public.companies
ON CONFLICT (company_id, module_key) DO NOTHING;

-- 4) Storage RLS para bucket anamnese-pdfs (isolamento por empresa via prefixo)
CREATE POLICY "anamnese-pdfs read company"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'anamnese-pdfs'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "anamnese-pdfs insert company"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'anamnese-pdfs'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "anamnese-pdfs delete admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'anamnese-pdfs'
    AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
