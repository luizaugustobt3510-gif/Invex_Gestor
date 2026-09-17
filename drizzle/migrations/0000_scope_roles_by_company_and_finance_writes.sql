-- 1) Papéis validados dentro da própria empresa (has_role_in_company já existe e cobre super_admin)
DROP POLICY IF EXISTS "Company RH/admin can view dev plans" ON public.development_plans;
CREATE POLICY "Company RH/admin can view dev plans" ON public.development_plans FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view asos" ON public.employee_asos;
CREATE POLICY "Company RH/admin can view asos" ON public.employee_asos FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view certificates" ON public.employee_certificates;
CREATE POLICY "Company RH/admin can view certificates" ON public.employee_certificates FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view occurrences" ON public.employee_occurrences;
CREATE POLICY "Company RH/admin can view occurrences" ON public.employee_occurrences FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view terminations" ON public.employee_terminations;
CREATE POLICY "Company RH/admin can view terminations" ON public.employee_terminations FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view employee_trainings" ON public.employee_trainings;
CREATE POLICY "Company RH/admin can view employee_trainings" ON public.employee_trainings FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view vacations" ON public.employee_vacations;
CREATE POLICY "Company RH/admin can view vacations" ON public.employee_vacations FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view employees" ON public.employees;
CREATE POLICY "Company RH/admin can view employees" ON public.employees FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view evaluations" ON public.performance_evaluations;
CREATE POLICY "Company RH/admin can view evaluations" ON public.performance_evaluations FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view time_records" ON public.time_records;
CREATE POLICY "Company RH/admin can view time_records" ON public.time_records FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company RH/admin can view trainings" ON public.trainings;
CREATE POLICY "Company RH/admin can view trainings" ON public.trainings FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id));

DROP POLICY IF EXISTS "Company logistics/admin can view temp records" ON public.temperature_records;
CREATE POLICY "Company logistics/admin can view temp records" ON public.temperature_records FOR SELECT
USING (is_company_admin(auth.uid(), company_id)
   OR has_role_in_company(auth.uid(), 'logistica'::app_role, company_id)
   OR has_role_in_company(auth.uid(), 'usuario_almox'::app_role, company_id));

DROP POLICY IF EXISTS "Admin/RH/Fin view payroll_config" ON public.payroll_config;
CREATE POLICY "Admin/RH/Fin view payroll_config" ON public.payroll_config FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));
DROP POLICY IF EXISTS "Admin/RH/Fin manage payroll_config" ON public.payroll_config;
CREATE POLICY "Admin/RH/Fin manage payroll_config" ON public.payroll_config FOR ALL
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));

DROP POLICY IF EXISTS "Admin/RH/Fin view payroll_events" ON public.payroll_events;
CREATE POLICY "Admin/RH/Fin view payroll_events" ON public.payroll_events FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));
DROP POLICY IF EXISTS "Admin/RH/Fin manage payroll_events" ON public.payroll_events;
CREATE POLICY "Admin/RH/Fin manage payroll_events" ON public.payroll_events FOR ALL
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));

DROP POLICY IF EXISTS "Admin/RH/Fin view payroll_forecast" ON public.payroll_forecast;
CREATE POLICY "Admin/RH/Fin view payroll_forecast" ON public.payroll_forecast FOR SELECT
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));
DROP POLICY IF EXISTS "Admin/RH/Fin manage payroll_forecast" ON public.payroll_forecast;
CREATE POLICY "Admin/RH/Fin manage payroll_forecast" ON public.payroll_forecast FOR ALL
USING (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR has_role_in_company(auth.uid(), 'rh'::app_role, company_id) OR has_role_in_company(auth.uid(), 'financeiro'::app_role, company_id));

-- 2) Bancos / centros de custo / orçamentos: leitura ampla, escrita restrita a admin ou financeiro
DROP POLICY IF EXISTS bank_accounts_company_access ON public.bank_accounts;
CREATE POLICY bank_accounts_select ON public.bank_accounts FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));
CREATE POLICY bank_accounts_write ON public.bank_accounts FOR ALL TO authenticated
USING (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'));

DROP POLICY IF EXISTS bank_transactions_company_access ON public.bank_transactions;
CREATE POLICY bank_transactions_select ON public.bank_transactions FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));
CREATE POLICY bank_transactions_write ON public.bank_transactions FOR ALL TO authenticated
USING (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'));

DROP POLICY IF EXISTS cost_centers_company_access ON public.cost_centers;
CREATE POLICY cost_centers_select ON public.cost_centers FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));
CREATE POLICY cost_centers_write ON public.cost_centers FOR ALL TO authenticated
USING (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'));

DROP POLICY IF EXISTS financial_budgets_company_access ON public.financial_budgets;
CREATE POLICY financial_budgets_select ON public.financial_budgets FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));
CREATE POLICY financial_budgets_write ON public.financial_budgets FOR ALL TO authenticated
USING (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'))
WITH CHECK (is_company_admin(auth.uid(), company_id) OR user_can_write_module(auth.uid(), company_id, 'financeiro'));

-- 3) Lançamentos financeiros: leitura restrita a admin/financeiro/logística
DROP POLICY IF EXISTS "Company members can view financial_entries" ON public.financial_entries;
CREATE POLICY "Finance roles can view financial_entries" ON public.financial_entries FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR is_company_admin(auth.uid(), company_id)
  OR user_can_write_module(auth.uid(), company_id, 'financeiro')
  OR user_can_write_module(auth.uid(), company_id, 'logistica')
);