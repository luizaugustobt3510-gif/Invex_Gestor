/**
 * Módulos padrão de cada perfil (DB role).
 * Usado quando a empresa ainda não personalizou o perfil em "Perfis × Módulos".
 * Regra: tudo que não está na lista fica bloqueado.
 */
const CLINICAL = [
  'dashboard', 'clinica', 'agenda', 'prontuario', 'anamnese', 'evolucao',
  'receituario', 'assinaturas', 'dispensacao', 'faturamento', 'solicitacao_materiais',
];
const LOGISTICS = [
  'dashboard', 'logistica', 'setores', 'conferencia_temperatura',
  'solicitacao_materiais', 'ordem_servico', 'relatorios',
];

export const ROLE_MODULE_PRESETS: Record<string, string[]> = {
  enfermeiro: CLINICAL,
  enfermagem: CLINICAL,
  clinica: CLINICAL,
  recepcionista: ['dashboard', 'clinica', 'agenda', 'prontuario'],
  logistica: LOGISTICS,
  usuario_almox: LOGISTICS,
  solicitante: ['dashboard', 'solicitacao_materiais'],
  rh: ['dashboard', 'rh', 'relatorios'],
  financeiro: ['dashboard', 'financeiro', 'vendas', 'relatorios'],
  manutencao: ['dashboard', 'manutencao', 'ordem_servico'],
  visualizador: ['dashboard', 'logistica', 'rh', 'financeiro', 'relatorios'],
  fitness_user: ['academia'],
};

export function presetAllows(dbRole: string, moduleKey: string): boolean {
  return (ROLE_MODULE_PRESETS[dbRole] || []).includes(moduleKey);
}
