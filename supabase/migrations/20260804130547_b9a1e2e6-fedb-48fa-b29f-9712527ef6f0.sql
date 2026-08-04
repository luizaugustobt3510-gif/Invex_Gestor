ALTER TABLE public.material_dispensations
  ALTER CONSTRAINT material_dispensations_patient_consumption_id_fkey DEFERRABLE INITIALLY DEFERRED;

DROP POLICY IF EXISTS "Module write reqs delete" ON public.material_requests;
CREATE POLICY "Module write reqs delete" ON public.material_requests
FOR DELETE TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND user_can_write_module(auth.uid(), company_id, 'logistica')
);

DROP POLICY IF EXISTS "Module write reqs update" ON public.material_requests;
CREATE POLICY "Module write reqs update" ON public.material_requests
FOR UPDATE TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND user_can_write_module(auth.uid(), company_id, 'logistica')
)
WITH CHECK (
  is_company_member(auth.uid(), company_id)
  AND user_can_write_module(auth.uid(), company_id, 'logistica')
);