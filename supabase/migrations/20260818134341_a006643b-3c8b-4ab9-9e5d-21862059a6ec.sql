
-- 1) Restrictive clinical-role gate on sensitive health tables
CREATE POLICY "clinical access only - medical_records" ON public.medical_records
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "clinical access only - clinical_evolutions" ON public.clinical_evolutions
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "clinical access only - anamneses" ON public.anamneses
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "clinical access only - prescriptions" ON public.prescriptions
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "clinical access only - medical_record_attachments" ON public.medical_record_attachments
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

CREATE POLICY "clinical access only - clinic_appointments" ON public.clinic_appointments
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.has_clinical_access(auth.uid(), company_id));

-- patient_consumptions also feeds dispensação/faturamento operational screens
CREATE POLICY "clinical or dispensing access only - patient_consumptions" ON public.patient_consumptions
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.has_clinical_access(auth.uid(), company_id)
  OR public.user_can_write_module(auth.uid(), company_id, 'dispensacao')
  OR public.user_can_write_module(auth.uid(), company_id, 'faturamento')
);

-- 2) Storage: restrict clinical buckets to clinical roles
CREATE POLICY "clinical buckets restricted read" ON storage.objects
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  bucket_id NOT IN ('prontuario-anexos', 'anamnese-pdfs')
  OR public.has_clinical_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 3) Fix tautology in patient_consumptions INSERT policy
DROP POLICY IF EXISTS "Clinical roles insert patient_consumptions" ON public.patient_consumptions;
CREATE POLICY "Clinical roles insert patient_consumptions" ON public.patient_consumptions
FOR INSERT TO authenticated
WITH CHECK (
  is_company_member(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR user_can_write_module(auth.uid(), company_id, 'dispensacao')
    OR user_can_write_module(auth.uid(), company_id, 'clinica')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.company_id = patient_consumptions.company_id OR ur.role = 'super_admin'::app_role)
        AND ur.role = ANY (ARRAY['clinica','enfermagem','enfermeiro','recepcionista','admin_empresa','super_admin']::app_role[])
    )
  )
);
