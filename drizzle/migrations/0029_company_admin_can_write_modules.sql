CREATE OR REPLACE FUNCTION public.user_can_write_module(_user_id uuid, _company_id uuid, _module_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Super admin always
    is_super_admin(_user_id)
    OR (
      -- Must be a member of the company
      is_company_member(_user_id, _company_id)
      AND (
        -- Company admin can operate every module of its own company
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = _user_id
            AND company_id = _company_id
            AND role = 'admin_empresa'
        )
        OR (
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
$function$;