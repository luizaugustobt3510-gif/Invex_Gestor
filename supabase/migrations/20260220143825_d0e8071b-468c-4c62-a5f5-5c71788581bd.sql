
-- Allow company admins to delete material requests
CREATE POLICY "Company admins can delete requests"
ON public.material_requests
FOR DELETE
USING (is_company_admin(auth.uid(), company_id));
