
CREATE TABLE public.curva_abc_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  raw_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.curva_abc_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company curva_abc_data"
  ON public.curva_abc_data FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Logistica and almox can manage curva_abc_data"
  ON public.curva_abc_data FOR ALL TO authenticated
  USING (
    public.is_company_member(company_id, auth.uid())
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_company_admin(company_id, auth.uid())
      OR public.get_user_role(company_id, auth.uid()) IN ('logistica', 'usuario_almox')
    )
  )
  WITH CHECK (
    public.is_company_member(company_id, auth.uid())
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_company_admin(company_id, auth.uid())
      OR public.get_user_role(company_id, auth.uid()) IN ('logistica', 'usuario_almox')
    )
  );
