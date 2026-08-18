ALTER TABLE public.employee_certificates
  ADD COLUMN IF NOT EXISTS cid TEXT,
  ADD COLUMN IF NOT EXISTS data_retorno DATE;

UPDATE public.employee_certificates
  SET data_retorno = (data_fim + INTERVAL '1 day')::date
  WHERE data_retorno IS NULL;

CREATE TABLE IF NOT EXISTS public.certificate_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_reasons TO authenticated;
GRANT ALL ON public.certificate_reasons TO service_role;

ALTER TABLE public.certificate_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access cert_reasons"
  ON public.certificate_reasons FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Members can view cert_reasons"
  ON public.certificate_reasons FOR SELECT TO authenticated
  USING (
    is_default = true
    OR company_id IS NULL
    OR public.is_company_member(auth.uid(), company_id)
  );

CREATE POLICY "Module write cert_reasons insert"
  ON public.certificate_reasons FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_module(auth.uid(), company_id, 'rh'));

CREATE POLICY "Module write cert_reasons update"
  ON public.certificate_reasons FOR UPDATE TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'rh'))
  WITH CHECK (public.user_can_write_module(auth.uid(), company_id, 'rh'));

CREATE POLICY "Module write cert_reasons delete"
  ON public.certificate_reasons FOR DELETE TO authenticated
  USING (public.user_can_write_module(auth.uid(), company_id, 'rh'));

CREATE TRIGGER trg_certificate_reasons_updated_at
  BEFORE UPDATE ON public.certificate_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();