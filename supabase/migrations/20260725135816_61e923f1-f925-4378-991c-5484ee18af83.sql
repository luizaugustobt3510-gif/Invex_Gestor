CREATE TABLE IF NOT EXISTS public.prescription_quick_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_quick_items TO authenticated;
GRANT ALL ON public.prescription_quick_items TO service_role;

ALTER TABLE public.prescription_quick_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_quick_items_select" ON public.prescription_quick_items
  FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "prescription_quick_items_insert" ON public.prescription_quick_items
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "prescription_quick_items_update" ON public.prescription_quick_items
  FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id))
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "prescription_quick_items_delete" ON public.prescription_quick_items
  FOR DELETE TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE INDEX IF NOT EXISTS idx_prescription_quick_items_company ON public.prescription_quick_items(company_id);

CREATE TRIGGER trg_prescription_quick_items_updated_at
  BEFORE UPDATE ON public.prescription_quick_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();