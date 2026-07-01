CREATE POLICY "Company admin can update own company type"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_company_admin(auth.uid(), id))
WITH CHECK (public.is_company_admin(auth.uid(), id));