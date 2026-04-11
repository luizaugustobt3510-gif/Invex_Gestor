
-- Drop existing restrictive policies on materials for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Company admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Company admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Company admins can delete materials" ON public.materials;

-- Recreate with logistics roles included
CREATE POLICY "Company logistics can insert materials" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
);

CREATE POLICY "Company logistics can update materials" ON public.materials
FOR UPDATE TO authenticated
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
);

CREATE POLICY "Company logistics can delete materials" ON public.materials
FOR DELETE TO authenticated
USING (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

-- Fix stock_movements: allow logistics roles to insert
DROP POLICY IF EXISTS "Company members can insert movements" ON public.stock_movements;
CREATE POLICY "Company logistics can insert movements" ON public.stock_movements
FOR INSERT TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'usuario_almox'::app_role))
);

-- Fix conciliacao_log: allow logistics roles to insert
DROP POLICY IF EXISTS "Company admins can insert conciliacao" ON public.conciliacao_log;
CREATE POLICY "Company logistics can insert conciliacao" ON public.conciliacao_log
FOR INSERT TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

-- Fix saldo_sistema_importado: allow logistics roles to insert
DROP POLICY IF EXISTS "Company admins can insert system balances" ON public.saldo_sistema_importado;
CREATE POLICY "Company logistics can insert system balances" ON public.saldo_sistema_importado
FOR INSERT TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);

-- Fix movimentacoes_importadas: allow logistics roles to insert
DROP POLICY IF EXISTS "Company admins can insert imported movements" ON public.movimentacoes_importadas;
CREATE POLICY "Company logistics can insert imported movements" ON public.movimentacoes_importadas
FOR INSERT TO authenticated
WITH CHECK (
  is_company_admin(auth.uid(), company_id)
  OR (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'logistica'::app_role))
);
