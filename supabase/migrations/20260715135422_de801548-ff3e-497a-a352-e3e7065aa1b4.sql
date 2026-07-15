
-- 1) Add height/weight to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(6,2);

-- 2) Prevent duplicate CPF within same company
CREATE UNIQUE INDEX IF NOT EXISTS patients_company_cpf_unique
  ON public.patients (company_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

-- 3) Clinical evolutions
CREATE TABLE IF NOT EXISTS public.clinical_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content text NOT NULL,
  patient_signature text,
  professional_signature text,
  professional_name text,
  signature_type text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_evolutions TO authenticated;
GRANT ALL ON public.clinical_evolutions TO service_role;

ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_evolutions_select" ON public.clinical_evolutions
  FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "clinical_evolutions_insert" ON public.clinical_evolutions
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "clinical_evolutions_update" ON public.clinical_evolutions
  FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id))
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "clinical_evolutions_delete" ON public.clinical_evolutions
  FOR DELETE TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE TRIGGER trg_clinical_evolutions_updated_at
  BEFORE UPDATE ON public.clinical_evolutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_patient ON public.clinical_evolutions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_company ON public.clinical_evolutions(company_id);

-- 4) Quick messages
CREATE TABLE IF NOT EXISTS public.evolution_quick_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_quick_messages TO authenticated;
GRANT ALL ON public.evolution_quick_messages TO service_role;

ALTER TABLE public.evolution_quick_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evolution_quick_messages_select" ON public.evolution_quick_messages
  FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "evolution_quick_messages_insert" ON public.evolution_quick_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "evolution_quick_messages_update" ON public.evolution_quick_messages
  FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id))
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "evolution_quick_messages_delete" ON public.evolution_quick_messages
  FOR DELETE TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE TRIGGER trg_evolution_quick_messages_updated_at
  BEFORE UPDATE ON public.evolution_quick_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
