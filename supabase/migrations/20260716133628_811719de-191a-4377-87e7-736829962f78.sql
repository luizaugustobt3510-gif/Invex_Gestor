
-- ============ USER SIGNATURES ============
CREATE TABLE public.user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  credencial TEXT,
  image_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_signatures TO authenticated;
GRANT ALL ON public.user_signatures TO service_role;
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own signatures"
ON public.user_signatures FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins view signatures"
ON public.user_signatures FOR SELECT
USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_user_signatures_updated_at
BEFORE UPDATE ON public.user_signatures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_signatures_user ON public.user_signatures(user_id, company_id);

-- ============ MATERIAL DISPENSATIONS ============
CREATE TABLE public.material_dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  material_codigo TEXT,
  material_nome TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_dispensations TO authenticated;
GRANT ALL ON public.material_dispensations TO service_role;
ALTER TABLE public.material_dispensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view dispensations"
ON public.material_dispensations FOR SELECT
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Users create own dispensations"
ON public.material_dispensations FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Users update own dispensations"
ON public.material_dispensations FOR UPDATE
USING (auth.uid() = user_id OR public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins delete dispensations"
ON public.material_dispensations FOR DELETE
USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_material_dispensations_updated_at
BEFORE UPDATE ON public.material_dispensations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dispensations_company_date ON public.material_dispensations(company_id, created_at DESC);
CREATE INDEX idx_dispensations_patient ON public.material_dispensations(patient_id);

-- ============ CUSTOM ROLES ============
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view custom roles"
ON public.custom_roles FOR SELECT
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins manage custom roles"
ON public.custom_roles FOR ALL
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
