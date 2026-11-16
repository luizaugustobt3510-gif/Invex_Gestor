import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveModuleAccess } from "@/lib/moduleAccess";

interface ModuleAccessState {
  companyModules: Record<string, boolean>;
  userModules: Record<string, boolean>;
  roleModules: Record<string, boolean>;
  loading: boolean;
}

// UI role → DB role (mirrors AuthContext).
const uiToDbRole: Record<string, string> = {
  superadm: "super_admin",
  admin: "admin_empresa",
  "usuario almox": "usuario_almox",
  solicitante: "solicitante",
  logistica: "logistica",
  rh: "rh",
  financeiro: "financeiro",
  visualizador: "visualizador",
  manutencao: "manutencao",
  fitness: "fitness_user",
  clinica: "clinica",
  enfermagem: "enfermagem",
  enfermeiro: "enfermeiro",
  recepcionista: "recepcionista",
};

// Último resultado em memória: evita que o menu lateral volte ao "carregando"
// (e perca a rolagem) a cada troca de página. Sempre revalidado em seguida.
let cachedAccess: { key: string; state: ModuleAccessState } | null = null;

export function useModuleAccess() {
  const { user } = useAuth();
  const cacheKey = `${user?.email ?? ""}|${user?.companyId ?? ""}|${user?.role ?? ""}`;
  const [state, setStateRaw] = useState<ModuleAccessState>(() =>
    cachedAccess && cachedAccess.key === cacheKey
      ? cachedAccess.state
      : { companyModules: {}, userModules: {}, roleModules: {}, loading: true },
  );
  const setState = useCallback(
    (next: ModuleAccessState) => {
      if (!next.loading) cachedAccess = { key: cacheKey, state: next };
      setStateRaw(next);
    },
    [cacheKey],
  );

  const fetchModuleAccess = useCallback(async () => {
    if (!user?.companyId) {
      setState({ companyModules: {}, userModules: {}, roleModules: {}, loading: false });
      return;
    }

    // Super Admin só precisa do que está ligado na empresa.
    if (user.role === "superadm") {
      try {
        const { data } = await supabase
          .from("company_modules")
          .select("module_key, is_active")
          .eq("company_id", user.companyId);
        const companyModules: Record<string, boolean> = {};
        (data || []).forEach((m) => { companyModules[m.module_key] = m.is_active; });
        setState({ companyModules, userModules: {}, roleModules: {}, loading: false });
      } catch {
        setState({ companyModules: {}, userModules: {}, roleModules: {}, loading: false });
      }
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id || "";
      const dbRole = uiToDbRole[user.role] || user.role;

      const [companyRes, userRes, roleRes] = await Promise.all([
        supabase.from("company_modules").select("module_key, is_active").eq("company_id", user.companyId),
        supabase
          .from("user_module_permissions")
          .select("module_key, is_active")
          .eq("company_id", user.companyId)
          .eq("user_id", userId),
        supabase
          .from("role_module_permissions")
          .select("module_key, is_active")
          .eq("company_id", user.companyId)
          .eq("role", dbRole as any),
      ]);

      const companyModules: Record<string, boolean> = {};
      (companyRes.data || []).forEach((m) => {
        companyModules[m.module_key] = m.is_active;
      });

      const userModules: Record<string, boolean> = {};
      (userRes.data || []).forEach((m) => {
        userModules[m.module_key] = m.is_active;
      });

      const roleModules: Record<string, boolean> = {};
      (roleRes.data || []).forEach((m) => {
        roleModules[m.module_key] = m.is_active;
      });

      setState({ companyModules, userModules, roleModules, loading: false });
    } catch {
      setState({ companyModules: {}, userModules: {}, roleModules: {}, loading: false });
    }
  }, [user?.companyId, user?.role, setState]);

  useEffect(() => {
    fetchModuleAccess();
  }, [fetchModuleAccess]);

  // Regra única (empresa → usuário → perfil), também válida para o admin da empresa.
  const canAccessModule = useCallback(
    (moduleKey: string): boolean =>
      resolveModuleAccess(
        {
          role: user?.role || "",
          dbRole: uiToDbRole[user?.role || ""] || user?.role || "",
          companyModules: state.companyModules,
          userModules: state.userModules,
          roleModules: state.roleModules,
        },
        moduleKey,
      ),
    [user?.role, state.companyModules, state.userModules, state.roleModules],
  );

  return { canAccessModule, loading: state.loading, refetch: fetchModuleAccess };
}
