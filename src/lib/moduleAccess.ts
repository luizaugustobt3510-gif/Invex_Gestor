import { isModuleOnForCompany } from "@/config/modules";
import { presetAllows } from "@/config/rolePresets";

/**
 * Regra única de acesso a módulos/submódulos no Gestor.
 *
 * Ordem (a primeira que bloquear vence):
 *  1. Desligado na empresa (Gestão de Módulos) → ninguém acessa, nem o admin.
 *     Submódulos da Clínica seguem a Clínica desligada.
 *  2. Super Admin → acessa o que estiver ligado na empresa.
 *  3. Desligado para o usuário (Usuários × Módulos) → bloqueado, inclusive admin.
 *  4. Admin da empresa → acessa tudo que sobrou ligado.
 *  5. Demais perfis → liberação do usuário, senão Perfis × Módulos, senão o padrão do perfil.
 */
export interface ModuleAccessInput {
  /** Papel da interface (ex.: "admin", "superadm", "logistica"). */
  role: string;
  /** Papel do banco (ex.: "admin_empresa", "logistica"). */
  dbRole: string;
  companyModules: Record<string, boolean>;
  userModules: Record<string, boolean>;
  roleModules: Record<string, boolean>;
}

export function resolveModuleAccess(input: ModuleAccessInput, moduleKey: string): boolean {
  const { role, dbRole, companyModules, userModules, roleModules } = input;

  if (!isModuleOnForCompany(companyModules, moduleKey)) return false;
  if (role === "superadm") return true;

  if (moduleKey.includes(".")) {
    const [baseKey] = moduleKey.split(".");
    if (!resolveModuleAccess(input, baseKey)) return false;
    return userModules[moduleKey] ?? true;
  }

  const userOverride = userModules[moduleKey];
  if (role === "admin") return userOverride !== false;
  if (userOverride !== undefined) return userOverride;
  return roleModules[moduleKey] ?? presetAllows(dbRole, moduleKey);
}
