
-- =========================================================
-- 1) NEW HELPER: user_can_write_module
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_can_write_module(
  _user_id uuid,
  _company_id uuid,
  _module_key text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Super admin always
    is_super_admin(_user_id)
    OR (
      -- Must be a member of the company
      is_company_member(_user_id, _company_id)
      AND (
        -- Role-based access (primary role matches the module)
        (
          _module_key = 'logistica' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id
              AND company_id = _company_id
              AND role IN ('logistica','usuario_almox','solicitante')
          )
        )
        OR (
          _module_key = 'rh' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id
              AND company_id = _company_id
              AND role = 'rh'
          )
        )
        OR (
          _module_key = 'financeiro' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id
              AND company_id = _company_id
              AND role = 'financeiro'
          )
        )
        OR (
          _module_key = 'manutencao' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id
              AND company_id = _company_id
              AND role IN ('manutencao','logistica','usuario_almox')
          )
        )
        OR (
          -- Module granted explicitly via user_module_permissions
          EXISTS (
            SELECT 1 FROM public.user_module_permissions ump
            WHERE ump.user_id = _user_id
              AND ump.company_id = _company_id
              AND ump.module_key = _module_key
              AND ump.is_active = true
          )
        )
      )
    )
$$;

-- =========================================================
-- 2) RH / GESTÃO DE PESSOAS
-- =========================================================
-- employees
DROP POLICY IF EXISTS "Company RH/admin can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Company RH/admin can update employees" ON public.employees;
DROP POLICY IF EXISTS "Company RH/admin can delete employees" ON public.employees;
CREATE POLICY "Module write employees insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write employees update" ON public.employees FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write employees delete" ON public.employees FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_asos
DROP POLICY IF EXISTS "Company RH/admin can insert asos" ON public.employee_asos;
DROP POLICY IF EXISTS "Company RH/admin can update asos" ON public.employee_asos;
DROP POLICY IF EXISTS "Company RH/admin can delete asos" ON public.employee_asos;
CREATE POLICY "Module write asos insert" ON public.employee_asos FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write asos update" ON public.employee_asos FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write asos delete" ON public.employee_asos FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_certificates
DROP POLICY IF EXISTS "Company RH/admin can insert certificates" ON public.employee_certificates;
DROP POLICY IF EXISTS "Company RH/admin can update certificates" ON public.employee_certificates;
DROP POLICY IF EXISTS "Company RH/admin can delete certificates" ON public.employee_certificates;
CREATE POLICY "Module write certificates insert" ON public.employee_certificates FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write certificates update" ON public.employee_certificates FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write certificates delete" ON public.employee_certificates FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_occurrences
DROP POLICY IF EXISTS "Company RH/admin can insert occurrences" ON public.employee_occurrences;
DROP POLICY IF EXISTS "Company RH/admin can update occurrences" ON public.employee_occurrences;
DROP POLICY IF EXISTS "Company RH/admin can delete occurrences" ON public.employee_occurrences;
CREATE POLICY "Module write occurrences insert" ON public.employee_occurrences FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write occurrences update" ON public.employee_occurrences FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write occurrences delete" ON public.employee_occurrences FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_terminations
DROP POLICY IF EXISTS "Company RH/admin can insert terminations" ON public.employee_terminations;
DROP POLICY IF EXISTS "Company RH/admin can update terminations" ON public.employee_terminations;
DROP POLICY IF EXISTS "Company RH/admin can delete terminations" ON public.employee_terminations;
CREATE POLICY "Module write terminations insert" ON public.employee_terminations FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write terminations update" ON public.employee_terminations FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write terminations delete" ON public.employee_terminations FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_trainings
DROP POLICY IF EXISTS "Company RH/admin can insert employee_trainings" ON public.employee_trainings;
DROP POLICY IF EXISTS "Company RH/admin can update employee_trainings" ON public.employee_trainings;
DROP POLICY IF EXISTS "Company RH/admin can delete employee_trainings" ON public.employee_trainings;
CREATE POLICY "Module write emp_trainings insert" ON public.employee_trainings FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write emp_trainings update" ON public.employee_trainings FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write emp_trainings delete" ON public.employee_trainings FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_vacations
DROP POLICY IF EXISTS "Company RH/admin can insert vacations" ON public.employee_vacations;
DROP POLICY IF EXISTS "Company RH/admin can update vacations" ON public.employee_vacations;
DROP POLICY IF EXISTS "Company RH/admin can delete vacations" ON public.employee_vacations;
CREATE POLICY "Module write vacations insert" ON public.employee_vacations FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write vacations update" ON public.employee_vacations FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write vacations delete" ON public.employee_vacations FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- benefits
DROP POLICY IF EXISTS "RH/admin insert benefits" ON public.benefits;
DROP POLICY IF EXISTS "RH/admin update benefits" ON public.benefits;
DROP POLICY IF EXISTS "RH/admin delete benefits" ON public.benefits;
CREATE POLICY "Module write benefits insert" ON public.benefits FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write benefits update" ON public.benefits FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write benefits delete" ON public.benefits FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- benefits_monthly
DROP POLICY IF EXISTS "RH/admin insert ben_monthly" ON public.benefits_monthly;
DROP POLICY IF EXISTS "RH/admin update ben_monthly" ON public.benefits_monthly;
DROP POLICY IF EXISTS "RH/admin delete ben_monthly" ON public.benefits_monthly;
CREATE POLICY "Module write ben_monthly insert" ON public.benefits_monthly FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write ben_monthly update" ON public.benefits_monthly FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write ben_monthly delete" ON public.benefits_monthly FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- employee_benefits
DROP POLICY IF EXISTS "RH/admin insert emp_benefits" ON public.employee_benefits;
DROP POLICY IF EXISTS "RH/admin update emp_benefits" ON public.employee_benefits;
DROP POLICY IF EXISTS "RH/admin delete emp_benefits" ON public.employee_benefits;
CREATE POLICY "Module write emp_benefits insert" ON public.employee_benefits FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write emp_benefits update" ON public.employee_benefits FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write emp_benefits delete" ON public.employee_benefits FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- development_plans
DROP POLICY IF EXISTS "Company RH/admin can insert dev plans" ON public.development_plans;
DROP POLICY IF EXISTS "Company RH/admin can update dev plans" ON public.development_plans;
DROP POLICY IF EXISTS "Company RH/admin can delete dev plans" ON public.development_plans;
CREATE POLICY "Module write dev_plans insert" ON public.development_plans FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write dev_plans update" ON public.development_plans FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write dev_plans delete" ON public.development_plans FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- performance_evaluations
DROP POLICY IF EXISTS "Company RH/admin can insert evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Company RH/admin can update evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Company RH/admin can delete evaluations" ON public.performance_evaluations;
CREATE POLICY "Module write evaluations insert" ON public.performance_evaluations FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write evaluations update" ON public.performance_evaluations FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write evaluations delete" ON public.performance_evaluations FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- time_records
DROP POLICY IF EXISTS "Company RH/admin can insert time_records" ON public.time_records;
DROP POLICY IF EXISTS "Company RH/admin can update time_records" ON public.time_records;
DROP POLICY IF EXISTS "Company RH/admin can delete time_records" ON public.time_records;
CREATE POLICY "Module write time_records insert" ON public.time_records FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write time_records update" ON public.time_records FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write time_records delete" ON public.time_records FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- termination_reasons
DROP POLICY IF EXISTS "Company admin can insert reasons" ON public.termination_reasons;
DROP POLICY IF EXISTS "Company admin can delete reasons" ON public.termination_reasons;
CREATE POLICY "Module write term_reasons insert" ON public.termination_reasons FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write term_reasons delete" ON public.termination_reasons FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- trainings (catalog)
DROP POLICY IF EXISTS "Company RH/admin can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Company RH/admin can update trainings" ON public.trainings;
DROP POLICY IF EXISTS "Company RH/admin can delete trainings" ON public.trainings;
CREATE POLICY "Module write trainings insert" ON public.trainings FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write trainings update" ON public.trainings FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));
CREATE POLICY "Module write trainings delete" ON public.trainings FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'rh'));

-- =========================================================
-- 3) FINANCEIRO
-- =========================================================
DROP POLICY IF EXISTS "Company admin/financeiro can insert financial_entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Company admin/financeiro can update financial_entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Company admin/financeiro can delete financial_entries" ON public.financial_entries;
-- keep logistica auto-write for PO/integration via the new function (logistica role won't pass 'financeiro' check; we keep cross-module by also allowing logistica role)
CREATE POLICY "Module write fin_entries insert" ON public.financial_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_can_write_module(auth.uid(), company_id, 'financeiro')
    OR user_can_write_module(auth.uid(), company_id, 'logistica')
  );
CREATE POLICY "Module write fin_entries update" ON public.financial_entries FOR UPDATE TO authenticated
  USING (
    user_can_write_module(auth.uid(), company_id, 'financeiro')
    OR user_can_write_module(auth.uid(), company_id, 'logistica')
  );
CREATE POLICY "Module write fin_entries delete" ON public.financial_entries FOR DELETE TO authenticated
  USING (user_can_write_module(auth.uid(), company_id, 'financeiro'));

DROP POLICY IF EXISTS "Company admin/financeiro can insert financial_categories" ON public.financial_categories;
DROP POLICY IF EXISTS "Company admin/financeiro can update financial_categories" ON public.financial_categories;
DROP POLICY IF EXISTS "Company admin/financeiro can delete financial_categories" ON public.financial_categories;
CREATE POLICY "Module write fin_cats insert" ON public.financial_categories FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'financeiro'));
CREATE POLICY "Module write fin_cats update" ON public.financial_categories FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'financeiro'));
CREATE POLICY "Module write fin_cats delete" ON public.financial_categories FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'financeiro'));

-- =========================================================
-- 4) LOGÍSTICA
-- =========================================================
-- materials
DROP POLICY IF EXISTS "Company logistics can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Company logistics can update materials" ON public.materials;
DROP POLICY IF EXISTS "Company logistics can delete materials" ON public.materials;
CREATE POLICY "Module write materials insert" ON public.materials FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write materials update" ON public.materials FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write materials delete" ON public.materials FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- stock_movements
DROP POLICY IF EXISTS "Company logistics can insert movements" ON public.stock_movements;
CREATE POLICY "Module write stock_movements insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- sectors (logistics + admin)
DROP POLICY IF EXISTS "Company admins can manage sectors" ON public.sectors;
DROP POLICY IF EXISTS "Company admins can update sectors" ON public.sectors;
DROP POLICY IF EXISTS "Company admins can delete sectors" ON public.sectors;
DROP POLICY IF EXISTS "Logistica can insert sectors" ON public.sectors;
DROP POLICY IF EXISTS "Logistica can update sectors" ON public.sectors;
DROP POLICY IF EXISTS "Logistica can delete sectors" ON public.sectors;
CREATE POLICY "Module write sectors insert" ON public.sectors FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write sectors update" ON public.sectors FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write sectors delete" ON public.sectors FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- suppliers
DROP POLICY IF EXISTS "Company admin/logistica can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Company admin/logistica can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Company admin/logistica can delete suppliers" ON public.suppliers;
CREATE POLICY "Module write suppliers insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write suppliers update" ON public.suppliers FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write suppliers delete" ON public.suppliers FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- supplier_evaluations
DROP POLICY IF EXISTS "Company admin/logistica can insert supplier_evaluations" ON public.supplier_evaluations;
DROP POLICY IF EXISTS "Company admin/logistica can delete supplier_evaluations" ON public.supplier_evaluations;
CREATE POLICY "Module write supp_eval insert" ON public.supplier_evaluations FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write supp_eval delete" ON public.supplier_evaluations FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- purchase_orders
DROP POLICY IF EXISTS "Company admins can manage orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Company admins can update orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Company admins can delete orders" ON public.purchase_orders;
CREATE POLICY "Module write po insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write po update" ON public.purchase_orders FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write po delete" ON public.purchase_orders FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- purchase_order_items
DROP POLICY IF EXISTS "Company admins can manage order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Company admins can update order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Company admins can delete order items" ON public.purchase_order_items;
CREATE POLICY "Module write po_items insert" ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
      AND user_can_write_module(auth.uid(), po.company_id, 'logistica')
  ));
CREATE POLICY "Module write po_items update" ON public.purchase_order_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
      AND user_can_write_module(auth.uid(), po.company_id, 'logistica')
  ));
CREATE POLICY "Module write po_items delete" ON public.purchase_order_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
      AND user_can_write_module(auth.uid(), po.company_id, 'logistica')
  ));

-- material_requests
DROP POLICY IF EXISTS "Company members can create requests" ON public.material_requests;
DROP POLICY IF EXISTS "Company admins can update requests" ON public.material_requests;
DROP POLICY IF EXISTS "Company admins can delete requests" ON public.material_requests;
CREATE POLICY "Module write reqs insert" ON public.material_requests FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Module write reqs update" ON public.material_requests FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write reqs delete" ON public.material_requests FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- conciliacao_log
DROP POLICY IF EXISTS "Company logistics can insert conciliacao" ON public.conciliacao_log;
CREATE POLICY "Module write conciliacao insert" ON public.conciliacao_log FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- contagem_fisica (any member can count, leave as is)
-- (no change)

-- movimentacoes_importadas
DROP POLICY IF EXISTS "Company logistics can insert imported movements" ON public.movimentacoes_importadas;
DROP POLICY IF EXISTS "Company admins can delete imported movements" ON public.movimentacoes_importadas;
CREATE POLICY "Module write mov_imp insert" ON public.movimentacoes_importadas FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write mov_imp delete" ON public.movimentacoes_importadas FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- saldo_sistema_importado
DROP POLICY IF EXISTS "Company logistics can insert system balances" ON public.saldo_sistema_importado;
DROP POLICY IF EXISTS "Company admins can delete system balances" ON public.saldo_sistema_importado;
CREATE POLICY "Module write saldo_imp insert" ON public.saldo_sistema_importado FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write saldo_imp delete" ON public.saldo_sistema_importado FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- temperature_records
DROP POLICY IF EXISTS "Company logistics/admin can insert temp records" ON public.temperature_records;
CREATE POLICY "Module write temp_records insert" ON public.temperature_records FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- curva_abc_data: keep existing ALL policy but rewrite to use the function (avoid admin_empresa privilege)
DROP POLICY IF EXISTS "Logistica and almox can manage curva_abc_data" ON public.curva_abc_data;
CREATE POLICY "Module write curva_abc all" ON public.curva_abc_data FOR ALL TO authenticated
  USING (user_can_write_module(auth.uid(), company_id, 'logistica'))
  WITH CHECK (user_can_write_module(auth.uid(), company_id, 'logistica'));

-- =========================================================
-- 5) MANUTENÇÃO
-- =========================================================
DROP POLICY IF EXISTS "Manutencao/admin can insert maintenance_records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Manutencao/admin can update maintenance_records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Manutencao/admin can delete maintenance_records" ON public.maintenance_records;
CREATE POLICY "Module write maint_rec insert" ON public.maintenance_records FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'manutencao'));
CREATE POLICY "Module write maint_rec update" ON public.maintenance_records FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'manutencao'));
CREATE POLICY "Module write maint_rec delete" ON public.maintenance_records FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'manutencao'));

DROP POLICY IF EXISTS "Manutencao/admin can insert maintenance_attachments" ON public.maintenance_attachments;
DROP POLICY IF EXISTS "Manutencao/admin can delete maintenance_attachments" ON public.maintenance_attachments;
CREATE POLICY "Module write maint_att insert" ON public.maintenance_attachments FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'manutencao'));
CREATE POLICY "Module write maint_att delete" ON public.maintenance_attachments FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'manutencao'));

DROP POLICY IF EXISTS "Manutencao/admin can insert maintenance_history" ON public.maintenance_history;
CREATE POLICY "Module write maint_hist insert" ON public.maintenance_history FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'manutencao'));

DROP POLICY IF EXISTS "Members can insert maintenance_service_orders" ON public.maintenance_service_orders;
DROP POLICY IF EXISTS "Manutencao/admin can update maintenance_service_orders" ON public.maintenance_service_orders;
DROP POLICY IF EXISTS "Manutencao/admin can delete maintenance_service_orders" ON public.maintenance_service_orders;
-- Any member can request OS; only manutencao/admin can update/delete
CREATE POLICY "Module write maint_os insert" ON public.maintenance_service_orders FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Module write maint_os update" ON public.maintenance_service_orders FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'manutencao'));
CREATE POLICY "Module write maint_os delete" ON public.maintenance_service_orders FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'manutencao'));

-- =========================================================
-- 6) ACADEMIA
-- =========================================================
DROP POLICY IF EXISTS "Company admin can insert academy_students" ON public.academy_students;
DROP POLICY IF EXISTS "Company admin can update academy_students" ON public.academy_students;
DROP POLICY IF EXISTS "Company admin can delete academy_students" ON public.academy_students;
CREATE POLICY "Module write acad_stud insert" ON public.academy_students FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'academia'));
CREATE POLICY "Module write acad_stud update" ON public.academy_students FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'academia'));
CREATE POLICY "Module write acad_stud delete" ON public.academy_students FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'academia'));

DROP POLICY IF EXISTS "Company admin can insert academy_payments" ON public.academy_payments;
DROP POLICY IF EXISTS "Company admin can update academy_payments" ON public.academy_payments;
DROP POLICY IF EXISTS "Company admin can delete academy_payments" ON public.academy_payments;
CREATE POLICY "Module write acad_pay insert" ON public.academy_payments FOR INSERT TO authenticated WITH CHECK (user_can_write_module(auth.uid(), company_id, 'academia'));
CREATE POLICY "Module write acad_pay update" ON public.academy_payments FOR UPDATE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'academia'));
CREATE POLICY "Module write acad_pay delete" ON public.academy_payments FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'academia'));

-- =========================================================
-- 7) VENDAS
-- =========================================================
DROP POLICY IF EXISTS "Company admin/logistica can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Company admin/logistica can update sales" ON public.sales;
DROP POLICY IF EXISTS "Company admin can delete sales" ON public.sales;
CREATE POLICY "Module write sales insert" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (user_can_write_module(auth.uid(), company_id, 'vendas') OR user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write sales update" ON public.sales FOR UPDATE TO authenticated
  USING (user_can_write_module(auth.uid(), company_id, 'vendas') OR user_can_write_module(auth.uid(), company_id, 'logistica'));
CREATE POLICY "Module write sales delete" ON public.sales FOR DELETE TO authenticated USING (user_can_write_module(auth.uid(), company_id, 'vendas'));

DROP POLICY IF EXISTS "Company admin/logistica can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Company admin/logistica can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Company admin can delete sale_items" ON public.sale_items;
CREATE POLICY "Module write sale_items insert" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND (user_can_write_module(auth.uid(), s.company_id, 'vendas') OR user_can_write_module(auth.uid(), s.company_id, 'logistica'))
  ));
CREATE POLICY "Module write sale_items update" ON public.sale_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND (user_can_write_module(auth.uid(), s.company_id, 'vendas') OR user_can_write_module(auth.uid(), s.company_id, 'logistica'))
  ));
CREATE POLICY "Module write sale_items delete" ON public.sale_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
      AND user_can_write_module(auth.uid(), s.company_id, 'vendas')
  ));
