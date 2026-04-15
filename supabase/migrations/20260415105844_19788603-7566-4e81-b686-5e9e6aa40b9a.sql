
DROP POLICY IF EXISTS "Logistica and almox can manage curva_abc_data" ON public.curva_abc_data;
DROP POLICY IF EXISTS "Users can view their company curva_abc_data" ON public.curva_abc_data;

CREATE POLICY "Logistica and almox can manage curva_abc_data"
ON public.curva_abc_data FOR ALL
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    is_super_admin(auth.uid())
    OR is_company_admin(auth.uid(), company_id)
    OR get_user_role(auth.uid(), company_id) IN ('logistica', 'usuario_almox')
  )
)
WITH CHECK (
  is_company_member(auth.uid(), company_id)
  AND (
    is_super_admin(auth.uid())
    OR is_company_admin(auth.uid(), company_id)
    OR get_user_role(auth.uid(), company_id) IN ('logistica', 'usuario_almox')
  )
);

CREATE POLICY "Users can view their company curva_abc_data"
ON public.curva_abc_data FOR SELECT
TO authenticated
USING (is_company_member(auth.uid(), company_id));
