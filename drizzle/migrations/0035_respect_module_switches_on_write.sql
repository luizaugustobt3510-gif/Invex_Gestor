CREATE OR REPLACE FUNCTION public.module_is_switched_off(_user_id uuid, _company_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.company_modules cm
      WHERE cm.company_id = _company_id AND cm.module_key = _module_key AND cm.is_active = false
    )
    OR (
      _module_key IN ('agenda','prontuario','anamnese','evolucao','receituario','dispensacao','faturamento')
      AND EXISTS (
        SELECT 1 FROM public.company_modules cm
        WHERE cm.company_id = _company_id AND cm.module_key = 'clinica' AND cm.is_active = false
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions ump
      WHERE ump.user_id = _user_id AND ump.company_id = _company_id
        AND ump.module_key = _module_key AND ump.is_active = false
    )
$$;

REVOKE ALL ON FUNCTION public.module_is_switched_off(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.module_is_switched_off(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_can_write_module(_user_id uuid, _company_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    is_super_admin(_user_id)
    OR (
      is_company_member(_user_id, _company_id)
      -- Module switched off for the company or for this user blocks everyone, admin included
      AND NOT public.module_is_switched_off(_user_id, _company_id, _module_key)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin_empresa'
        )
        OR (
          _module_key = 'logistica' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id AND company_id = _company_id
              AND role IN ('logistica','usuario_almox','solicitante')
          )
        )
        OR (
          _module_key = 'rh' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id AND company_id = _company_id AND role = 'rh'
          )
        )
        OR (
          _module_key = 'financeiro' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id AND company_id = _company_id AND role = 'financeiro'
          )
        )
        OR (
          _module_key = 'manutencao' AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id AND company_id = _company_id
              AND role IN ('manutencao','logistica','usuario_almox')
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.user_module_permissions ump
          WHERE ump.user_id = _user_id AND ump.company_id = _company_id
            AND ump.module_key = _module_key AND ump.is_active = true
        )
      )
    )
$function$;