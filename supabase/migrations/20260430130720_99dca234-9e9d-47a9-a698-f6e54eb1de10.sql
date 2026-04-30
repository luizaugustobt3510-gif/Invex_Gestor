
CREATE TABLE public.hr_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_evento DATE NOT NULL,
  hora_evento TIME,
  notificar BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_appointments_company_date ON public.hr_appointments(company_id, data_evento);

ALTER TABLE public.hr_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view appointments"
ON public.hr_appointments FOR SELECT
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert appointments"
ON public.hr_appointments FOR INSERT
WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update appointments"
ON public.hr_appointments FOR UPDATE
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can delete appointments"
ON public.hr_appointments FOR DELETE
USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_hr_appointments_updated_at
BEFORE UPDATE ON public.hr_appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
