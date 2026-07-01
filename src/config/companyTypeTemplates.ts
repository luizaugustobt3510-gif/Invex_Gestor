/**
 * Templates de Tipo de Empresa.
 *
 * Cada tipo define uma sugestão INICIAL de módulos ativos.
 * Aplicado apenas quando o admin clica em "Aplicar template".
 * O admin pode editar tudo livremente depois em `GestaoModulos` / `ModulosEmpresa`.
 *
 * "Aplicar template" é ADITIVO: apenas ativa módulos ausentes;
 * nunca desativa módulos já configurados pelo usuário.
 */

export type CompanyType =
  | 'comercial'
  | 'clinica'
  | 'industria'
  | 'prestadora'
  | 'distribuidora'
  | 'personalizado';

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  comercial: 'Comercial',
  clinica: 'Clínica',
  industria: 'Indústria',
  prestadora: 'Prestadora de Serviços',
  distribuidora: 'Distribuidora',
  personalizado: 'Personalizado',
};

export const COMPANY_TYPES: CompanyType[] = [
  'comercial',
  'clinica',
  'industria',
  'prestadora',
  'distribuidora',
  'personalizado',
];

/** Módulos pré-ativos por tipo de empresa (module_key de MODULES_CATALOG). */
export const COMPANY_TYPE_TEMPLATES: Record<CompanyType, string[]> = {
  comercial: ['logistica', 'vendas', 'financeiro', 'rh', 'relatorios'],
  clinica: ['rh', 'agenda', 'prontuario', 'clinica', 'financeiro', 'relatorios'],
  industria: ['logistica', 'manutencao', 'rh', 'financeiro', 'relatorios'],
  prestadora: ['agenda', 'ordem_servico', 'financeiro', 'rh', 'relatorios'],
  distribuidora: ['logistica', 'vendas', 'financeiro', 'relatorios'],
  // Personalizado: nenhum default — admin ativa manualmente
  personalizado: [],
};
