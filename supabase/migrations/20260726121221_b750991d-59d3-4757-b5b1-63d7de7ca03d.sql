DROP POLICY IF EXISTS "Clinical roles insert patient_consumptions" ON public.patient_consumptions;

CREATE POLICY "Clinical roles insert patient_consumptions"
ON public.patient_consumptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member(auth.uid(), company_id)
  AND (
    public.is_company_admin(auth.uid(), company_id)
    OR public.user_can_write_module(auth.uid(), company_id, 'dispensacao')
    OR public.user_can_write_module(auth.uid(), company_id, 'clinica')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.company_id = company_id OR ur.role = 'super_admin')
        AND ur.role IN ('clinica','enfermagem','enfermeiro','recepcionista','admin_empresa','super_admin')
    )
  )
);

DROP POLICY IF EXISTS "Clinical roles update patient_consumptions" ON public.patient_consumptions;
