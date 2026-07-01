
-- 1) Enum: novo perfil 'clinica'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinica';

-- 2) patients
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  gender TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patients_company_idx ON public.patients(company_id);
CREATE INDEX IF NOT EXISTS patients_nome_idx ON public.patients(company_id, nome);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_company" ON public.patients FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "patients_insert_company" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "patients_update_company" ON public.patients FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "patients_delete_company" ON public.patients FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) medical_records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_time TIME NOT NULL DEFAULT CURRENT_TIME,
  professional_name TEXT,
  professional_user_id UUID,
  attendance_type TEXT,
  clinical_evolution TEXT,
  observations TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS medical_records_patient_idx ON public.medical_records(patient_id, record_date DESC);
CREATE INDEX IF NOT EXISTS medical_records_company_idx ON public.medical_records(company_id, record_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medrec_select_company" ON public.medical_records FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "medrec_insert_company" ON public.medical_records FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "medrec_update_company" ON public.medical_records FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "medrec_delete_company" ON public.medical_records FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER medrec_set_updated_at BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) medical_record_attachments
CREATE TABLE IF NOT EXISTS public.medical_record_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS medrec_att_record_idx ON public.medical_record_attachments(record_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_record_attachments TO authenticated;
GRANT ALL ON public.medical_record_attachments TO service_role;
ALTER TABLE public.medical_record_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medrec_att_select_company" ON public.medical_record_attachments FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "medrec_att_insert_company" ON public.medical_record_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "medrec_att_delete_company" ON public.medical_record_attachments FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

-- 5) clinic_appointments (Agenda mínima)
CREATE TABLE IF NOT EXISTS public.clinic_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_name TEXT,
  professional_user_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'agendado',
  attendance_type TEXT,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinic_appointments_company_idx ON public.clinic_appointments(company_id, scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_appointments TO authenticated;
GRANT ALL ON public.clinic_appointments TO service_role;
ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_appt_select_company" ON public.clinic_appointments FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "clinic_appt_insert_company" ON public.clinic_appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "clinic_appt_update_company" ON public.clinic_appointments FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "clinic_appt_delete_company" ON public.clinic_appointments FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER clinic_appt_set_updated_at BEFORE UPDATE ON public.clinic_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
