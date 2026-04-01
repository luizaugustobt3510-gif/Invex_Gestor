CREATE OR REPLACE FUNCTION public.user_has_domain_access(_user_id uuid, _company_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH role_access AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND (ur.company_id = _company_id OR ur.role = 'super_admin')
        AND (
          ur.role = 'super_admin'
          OR ur.role = 'admin_empresa'
          OR (_module_key = 'logistica' AND ur.role IN ('logistica', 'usuario_almox', 'solicitante'))
          OR (_module_key = 'rh' AND ur.role IN ('rh', 'visualizador'))
          OR (_module_key = 'financeiro' AND ur.role = 'financeiro')
        )
    ) AS allowed
  ),
  company_access AS (
    SELECT COALESCE(
      (
        SELECT cm.is_active
        FROM public.company_modules cm
        WHERE cm.company_id = _company_id
          AND cm.module_key = _module_key
        ORDER BY cm.updated_at DESC
        LIMIT 1
      ),
      true
    ) AS allowed
  ),
  user_access AS (
    SELECT COALESCE(
      (
        SELECT ump.is_active
        FROM public.user_module_permissions ump
        WHERE ump.user_id = _user_id
          AND ump.company_id = _company_id
          AND ump.module_key = _module_key
        ORDER BY ump.created_at DESC
        LIMIT 1
      ),
      true
    ) AS allowed
  )
  SELECT
    (SELECT allowed FROM role_access)
    AND (SELECT allowed FROM company_access)
    AND (SELECT allowed FROM user_access);
$$;

DROP POLICY IF EXISTS "Restrict logistics materials by domain" ON public.materials;
CREATE POLICY "Restrict logistics materials by domain"
ON public.materials
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics stock movements by domain" ON public.stock_movements;
CREATE POLICY "Restrict logistics stock movements by domain"
ON public.stock_movements
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics conciliacao by domain" ON public.conciliacao_log;
CREATE POLICY "Restrict logistics conciliacao by domain"
ON public.conciliacao_log
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics saldo sistema by domain" ON public.saldo_sistema_importado;
CREATE POLICY "Restrict logistics saldo sistema by domain"
ON public.saldo_sistema_importado
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics contagem by domain" ON public.contagem_fisica;
CREATE POLICY "Restrict logistics contagem by domain"
ON public.contagem_fisica
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics requests by domain" ON public.material_requests;
CREATE POLICY "Restrict logistics requests by domain"
ON public.material_requests
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics purchase orders by domain" ON public.purchase_orders;
CREATE POLICY "Restrict logistics purchase orders by domain"
ON public.purchase_orders
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics imported movements by domain" ON public.movimentacoes_importadas;
CREATE POLICY "Restrict logistics imported movements by domain"
ON public.movimentacoes_importadas
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict logistics temperature by domain" ON public.temperature_records;
CREATE POLICY "Restrict logistics temperature by domain"
ON public.temperature_records
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'logistica'));

DROP POLICY IF EXISTS "Restrict RH employees by domain" ON public.employees;
CREATE POLICY "Restrict RH employees by domain"
ON public.employees
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH vacations by domain" ON public.employee_vacations;
CREATE POLICY "Restrict RH vacations by domain"
ON public.employee_vacations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH certificates by domain" ON public.employee_certificates;
CREATE POLICY "Restrict RH certificates by domain"
ON public.employee_certificates
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH trainings by domain" ON public.employee_trainings;
CREATE POLICY "Restrict RH trainings by domain"
ON public.employee_trainings
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH ASO by domain" ON public.employee_asos;
CREATE POLICY "Restrict RH ASO by domain"
ON public.employee_asos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH occurrences by domain" ON public.employee_occurrences;
CREATE POLICY "Restrict RH occurrences by domain"
ON public.employee_occurrences
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH terminations by domain" ON public.employee_terminations;
CREATE POLICY "Restrict RH terminations by domain"
ON public.employee_terminations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH evaluations by domain" ON public.performance_evaluations;
CREATE POLICY "Restrict RH evaluations by domain"
ON public.performance_evaluations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH development plans by domain" ON public.development_plans;
CREATE POLICY "Restrict RH development plans by domain"
ON public.development_plans
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH time records by domain" ON public.time_records;
CREATE POLICY "Restrict RH time records by domain"
ON public.time_records
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH training catalog by domain" ON public.trainings;
CREATE POLICY "Restrict RH training catalog by domain"
ON public.trainings
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), company_id, 'rh'));

DROP POLICY IF EXISTS "Restrict RH termination reasons by domain" ON public.termination_reasons;
CREATE POLICY "Restrict RH termination reasons by domain"
ON public.termination_reasons
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.user_has_domain_access(auth.uid(), COALESCE(company_id, public.get_user_company_id(auth.uid())), 'rh'));