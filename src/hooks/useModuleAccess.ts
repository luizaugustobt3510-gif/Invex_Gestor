import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ModuleAccessState {
  companyModules: Record<string, boolean>;
  userModules: Record<string, boolean>;
  loading: boolean;
}

// Sidebar module keys mirror the MODULES_CATALOG keys 1:1 (see src/config/modules.ts).
// company_modules.module_key stores the same value written by ModulosEmpresa,
// so we use identity mapping and keep this object only for legacy aliases.
const MODULE_KEY_MAP: Record<string, string> = {};

export function useModuleAccess() {
  const { user } = useAuth();
  const [state, setState] = useState<ModuleAccessState>({
    companyModules: {},
    userModules: {},
    loading: true,
  });

  const fetchModuleAccess = useCallback(async () => {
    if (!user?.companyId) {
      setState({ companyModules: {}, userModules: {}, loading: false });
      return;
    }

    // SuperAdmin sees everything
    if (user.role === "superadm") {
      setState({ companyModules: {}, userModules: {}, loading: false });
      return;
    }

    try {
      // Get current auth user id
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const userId = authUser?.id || "";

      const [companyRes, userRes] = await Promise.all([
        supabase.from("company_modules").select("module_key, is_active").eq("company_id", user.companyId),
        supabase
          .from("user_module_permissions")
          .select("module_key, is_active")
          .eq("company_id", user.companyId)
          .eq("user_id", userId),
      ]);

      const companyModules: Record<string, boolean> = {};
      (companyRes.data || []).forEach((m) => {
        companyModules[m.module_key] = m.is_active;
      });

      const userModules: Record<string, boolean> = {};
      (userRes.data || []).forEach((m) => {
        userModules[m.module_key] = m.is_active;
      });

      setState({ companyModules, userModules, loading: false });
    } catch {
      setState({ companyModules: {}, userModules: {}, loading: false });
    }
  }, [user?.companyId, user?.role]);

  useEffect(() => {
    fetchModuleAccess();
  }, [fetchModuleAccess]);

  /**
   * Check if a module (or submodule) is accessible.
   * Supports composite keys like "logistica.estoque" — checks parent module first,
   * then the submodule key.
   */
  const canAccessModule = useCallback(
    (moduleKey: string): boolean => {
      if (user?.role === "superadm") return true;

      // Handle composite submodule keys (e.g., "logistica.estoque")
      if (moduleKey.includes(".")) {
        const [parentKey] = moduleKey.split(".");
        // First check parent module
        if (!canAccessModule(parentKey)) return false;
        // Then check the submodule itself
        const companyActive = state.companyModules[moduleKey] ?? true;
        if (!companyActive) return false;
        const userActive = state.userModules[moduleKey] ?? true;
        return userActive;
      }

      const dbKey = MODULE_KEY_MAP[moduleKey] || moduleKey;

      // Company level: if there's a record, use it; otherwise default to true
      const companyActive = state.companyModules[dbKey] ?? true;
      if (!companyActive) return false;

      // User level: if there's a record, use it; otherwise default to true
      const userActive = state.userModules[dbKey] ?? true;
      return userActive;
    },
    [user?.role, state.companyModules, state.userModules],
  );

  return { canAccessModule, loading: state.loading, refetch: fetchModuleAccess };
}
