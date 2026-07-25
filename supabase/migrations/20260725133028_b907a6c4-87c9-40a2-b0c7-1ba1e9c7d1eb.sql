
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'simples',
  content TEXT NOT NULL,
  observacoes TEXT,
  professional_name TEXT,
  professional_signature TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_company ON public.prescriptions(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view prescriptions"
  ON public.prescriptions FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Clinical roles can insert prescriptions"
  ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Owner or admin can update prescriptions"
  ON public.prescriptions FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_company_admin(auth.uid(), company_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Owner or admin can delete prescriptions"
  ON public.prescriptions FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_company_admin(auth.uid(), company_id)
  );

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
