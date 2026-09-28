CREATE OR REPLACE FUNCTION public.company_is_not_blocked(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT subscription_status <> 'bloqueada' FROM public.companies WHERE id = _company_id), true)
$$;

CREATE POLICY "Blocked companies cannot read materials"
ON public.materials AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.company_is_not_blocked(company_id));