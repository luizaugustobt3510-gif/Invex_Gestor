
-- Fix INSERT policies to require module write permission
DROP POLICY IF EXISTS "Module write maint_os insert" ON public.maintenance_service_orders;
CREATE POLICY "Module write maint_os insert" ON public.maintenance_service_orders
  FOR INSERT WITH CHECK (user_can_write_module(auth.uid(), company_id, 'manutencao'));

DROP POLICY IF EXISTS "Module write reqs insert" ON public.material_requests;
CREATE POLICY "Module write reqs insert" ON public.material_requests
  FOR INSERT WITH CHECK (
    user_can_write_module(auth.uid(), company_id, 'logistica')
    AND user_has_domain_access(auth.uid(), company_id, 'logistica')
  );

-- Tighten dispensations UPDATE WITH CHECK to match USING
DROP POLICY IF EXISTS "Users update own dispensations" ON public.material_dispensations;
CREATE POLICY "Users update own dispensations" ON public.material_dispensations
  FOR UPDATE
  USING ((auth.uid() = user_id) OR is_company_admin(auth.uid(), company_id))
  WITH CHECK ((auth.uid() = user_id) OR is_company_admin(auth.uid(), company_id));

-- Harden signatures storage policy: enforce <uid>/<company_id>/... where user is member of that company
DROP POLICY IF EXISTS "Users manage own signature files" ON storage.objects;
CREATE POLICY "Users manage own signature files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND is_company_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND is_company_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );
