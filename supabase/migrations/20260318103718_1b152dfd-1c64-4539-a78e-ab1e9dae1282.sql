-- Allow RH users to perform hard deletes on RH-managed records
DROP POLICY IF EXISTS "Company RH/admin can delete employees" ON public.employees;
CREATE POLICY "Company RH/admin can delete employees"
ON public.employees
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

DROP POLICY IF EXISTS "Company RH/admin can delete vacations" ON public.employee_vacations;
CREATE POLICY "Company RH/admin can delete vacations"
ON public.employee_vacations
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

DROP POLICY IF EXISTS "Company RH/admin can delete employee_trainings" ON public.employee_trainings;
CREATE POLICY "Company RH/admin can delete employee_trainings"
ON public.employee_trainings
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

DROP POLICY IF EXISTS "Company RH/admin can delete asos" ON public.employee_asos;
CREATE POLICY "Company RH/admin can delete asos"
ON public.employee_asos
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

DROP POLICY IF EXISTS "Company RH/admin can delete certificates" ON public.employee_certificates;
CREATE POLICY "Company RH/admin can delete certificates"
ON public.employee_certificates
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

DROP POLICY IF EXISTS "Company RH/admin can delete terminations" ON public.employee_terminations;
CREATE POLICY "Company RH/admin can delete terminations"
ON public.employee_terminations
FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'rh'::app_role))
);

-- Ensure employee hard delete cascades through all RH child records
ALTER TABLE public.employee_asos
DROP CONSTRAINT IF EXISTS employee_asos_employee_id_fkey,
ADD CONSTRAINT employee_asos_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.employee_terminations
DROP CONSTRAINT IF EXISTS employee_terminations_employee_id_fkey,
ADD CONSTRAINT employee_terminations_employee_id_fkey
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;