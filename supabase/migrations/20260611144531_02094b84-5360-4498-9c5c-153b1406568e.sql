DROP POLICY IF EXISTS "Company members can view profiles" ON public.profiles;
CREATE POLICY "Company admins can view company profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_company_admin(auth.uid(), company_id));