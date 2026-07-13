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
  enfermagem: "enfermagem",
  enfermeiro: "enfermeiro",
  recepcionista: "recepcionista",
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

    // SuperAdmin and admin da empresa mostly bypass the matrix, but we still need
    // company_modules to enforce opt-in modules (e.g., 'anamnese').
    if (user.role === "superadm" || user.role === "admin") {
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
  }, [user?.companyId, user?.role]);

  useEffect(() => {
    fetchModuleAccess();
  }, [fetchModuleAccess]);

  const canAccessModule = useCallback(
    (moduleKey: string): boolean => {
      // 'anamnese' is opt-in — must be explicitly activated by Super Admin per company.
      // superadm bypasses this too? No: super_admin is the one who activates, they still see
      // the toggle in GestaoModulos regardless. Preview/access to the module UI requires activation.
      const OPT_IN = new Set(['anamnese']);
      const isOptIn = OPT_IN.has(moduleKey.split('.')[0]);

      if (user?.role === "superadm" && !isOptIn) return true;
      if (user?.role === "admin" && !isOptIn) return true;

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
      const defaultActive = isOptIn ? false : true;

      const companyActive = state.companyModules[dbKey] ?? defaultActive;
      if (!companyActive) return false;

      // For opt-in modules, superadm/admin can access once activated.
      if (isOptIn && (user?.role === "superadm" || user?.role === "admin")) return true;

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
