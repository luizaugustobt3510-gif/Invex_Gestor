-- Allow logistica role (and almox/admin) to manage sectors
DROP POLICY IF EXISTS "Logistica can insert sectors" ON public.sectors;
DROP POLICY IF EXISTS "Logistica can update sectors" ON public.sectors;
DROP POLICY IF EXISTS "Logistica can delete sectors" ON public.sectors;

CREATE POLICY "Logistica can insert sectors"
ON public.sectors FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND (
    has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'usuario_almox'::app_role)
  ))
);

CREATE POLICY "Logistica can update sectors"
ON public.sectors FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND (
    has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'usuario_almox'::app_role)
  ))
);

CREATE POLICY "Logistica can delete sectors"
ON public.sectors FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND (
    has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'usuario_almox'::app_role)
  ))
);