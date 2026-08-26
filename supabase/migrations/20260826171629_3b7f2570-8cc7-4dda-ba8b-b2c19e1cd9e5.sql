CREATE TABLE public.material_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_groups TO authenticated;
GRANT ALL ON public.material_groups TO service_role;

ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view material groups"
ON public.material_groups FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Logistics can insert material groups"
ON public.material_groups FOR INSERT TO authenticated
WITH CHECK (public.is_company_member(auth.uid(), company_id)
  AND (public.is_company_admin(auth.uid(), company_id) OR public.user_can_write_module(auth.uid(), company_id, 'logistica')));

CREATE POLICY "Logistics can update material groups"
ON public.material_groups FOR UPDATE TO authenticated
USING (public.is_company_member(auth.uid(), company_id)
  AND (public.is_company_admin(auth.uid(), company_id) OR public.user_can_write_module(auth.uid(), company_id, 'logistica')))
WITH CHECK (public.is_company_member(auth.uid(), company_id)
  AND (public.is_company_admin(auth.uid(), company_id) OR public.user_can_write_module(auth.uid(), company_id, 'logistica')));

CREATE POLICY "Logistics can delete material groups"
ON public.material_groups FOR DELETE TO authenticated
USING (public.is_company_member(auth.uid(), company_id)
  AND (public.is_company_admin(auth.uid(), company_id) OR public.user_can_write_module(auth.uid(), company_id, 'logistica')));

CREATE TRIGGER update_material_groups_updated_at
BEFORE UPDATE ON public.material_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.materials
  ADD COLUMN group_id uuid REFERENCES public.material_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_materials_group_id ON public.materials(group_id);
CREATE INDEX idx_materials_validade ON public.materials(company_id, validade);

CREATE TABLE public.anamnese_quick_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamnese_quick_answers TO authenticated;
GRANT ALL ON public.anamnese_quick_answers TO service_role;

ALTER TABLE public.anamnese_quick_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view anamnese quick answers"
ON public.anamnese_quick_answers FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Clinical staff can insert anamnese quick answers"
ON public.anamnese_quick_answers FOR INSERT TO authenticated
WITH CHECK (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "Clinical staff can update anamnese quick answers"
ON public.anamnese_quick_answers FOR UPDATE TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id))
WITH CHECK (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "Clinical staff can delete anamnese quick answers"
ON public.anamnese_quick_answers FOR DELETE TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE TRIGGER update_anamnese_quick_answers_updated_at
BEFORE UPDATE ON public.anamnese_quick_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();