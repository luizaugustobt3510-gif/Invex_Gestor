import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ModuleAccessState {
  companyModules: Record<string, boolean>;
  userModules: Record<string, boolean>;
  roleModules: Record<string, boolean>;
  loading: boolean;
}

// Sidebar module keys mirror the MODULES_CATALOG keys 1:1.
const MODULE_KEY_MAP: Record<string, string> = {};

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
};

export function useModuleAccess() {
  const { user } = useAuth();
  const [state, setState] = useState<ModuleAccessState>({
    companyModules: {},
    userModules: {},
    roleModules: {},
    loading: true,
  });

  const fetchModuleAccess = useCallback(async () => {
    if (!user?.companyId) {
      setState({ companyModules: {}, userModules: {}, roleModules: {}, loading: false });
      return;
    }

    // SuperAdmin and admin da empresa não têm restrição pela matriz
    if (user.role === "superadm" || user.role === "admin") {
      setState({ companyModules: {}, userModules: {}, roleModules: {}, loading: false });
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
  }, [user?.companyId, user?.role]);

  useEffect(() => {
    fetchModuleAccess();
  }, [fetchModuleAccess]);

  const canAccessModule = useCallback(
    (moduleKey: string): boolean => {
      if (user?.role === "superadm" || user?.role === "admin") return true;

      // Composite submodule keys (e.g., "logistica.estoque")
      if (moduleKey.includes(".")) {
        const [parentKey] = moduleKey.split(".");
        if (!canAccessModule(parentKey)) return false;
        const companyActive = state.companyModules[moduleKey] ?? true;
        if (!companyActive) return false;
        const userActive = state.userModules[moduleKey] ?? true;
        return userActive;
      }

      const dbKey = MODULE_KEY_MAP[moduleKey] || moduleKey;

      const companyActive = state.companyModules[dbKey] ?? true;
      if (!companyActive) return false;

      // Role matrix: default true if no row (backwards compat).
      const roleActive = state.roleModules[dbKey] ?? true;
      const userActive = state.userModules[dbKey] ?? true;
      // User-level override wins over role.
      return roleActive ? userActive : userActive === true && state.userModules[dbKey] === true;
    },
    [user?.role, state.companyModules, state.userModules, state.roleModules],
  );

  return { canAccessModule, loading: state.loading, refetch: fetchModuleAccess };
}
