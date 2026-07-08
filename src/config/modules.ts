/**
 * Catálogo central de módulos do Invex.
 *
 * Fonte única da verdade para:
 *  - Ativação/desativação por empresa (GestaoModulos, ModulosEmpresa)
 *  - Templates por tipo de empresa (companyTypeTemplates)
 *  - Referências futuras em Dashboard/Sidebar
 *
 * Regra: adicionar módulos aqui NÃO ativa nada automaticamente.
 * A ativação real ocorre em `company_modules` (por empresa)
 * e `user_module_permissions` (por usuário).
 *
 * Desativar um módulo APENAS oculta menus e bloqueia acesso.
 * Nenhum dado é apagado — reativar restaura tudo.
 */

export interface SubmoduleDef {
  key: string; // composite: "<module>.<sub>"
  label: string;
}

export interface ModuleDef {
  /** DB module_key gravado em company_modules */
  key: string;
  label: string;
  description: string;
  /** Rota principal do módulo (para atalhos/dashboard) */
  route?: string;
  submodules: SubmoduleDef[];
  /** Se true, é um módulo "core" que não deve aparecer no toggle
   *  (ex.: Dashboard/Perfil, sempre disponíveis) */
  core?: boolean;
}

export const MODULES_CATALOG: ModuleDef[] = [
  {
    key: 'logistica',
    label: 'Logística / Estoque',
    description: 'Estoque, conferência, ordens de compra, importações, scanner QR.',
    route: '/logistica/dashboard',
    submodules: [
      { key: 'logistica.dashboard', label: 'Dashboard' },
      { key: 'logistica.estoque', label: 'Estoque' },
      { key: 'logistica.ordem_compra', label: 'Ordens de Compra' },
      { key: 'logistica.conciliacao_estoque', label: 'Conciliação de Estoque' },
      { key: 'logistica.solicitacoes', label: 'Solicitações' },
      { key: 'logistica.fornecedores', label: 'Fornecedores' },
      { key: 'logistica.curva_abc', label: 'Curva ABC' },
      { key: 'logistica.conferencia', label: 'Conferência de Temperatura' },
    ],
  },
  {
    key: 'rh',
    label: 'Gestão de Pessoas',
    description: 'Gestão de pessoas, férias, ASO, treinamentos, ocorrências.',
    route: '/rh',
    submodules: [
      { key: 'rh.dashboard', label: 'Dashboard' },
      { key: 'rh.desligamentos', label: 'Desligamentos' },
      { key: 'rh.turnover', label: 'Turnover' },
      { key: 'rh.ferias', label: 'Férias' },
      { key: 'rh.atestados', label: 'Atestados' },
      { key: 'rh.aso', label: 'ASO' },
      { key: 'rh.treinamentos', label: 'Treinamentos' },
      { key: 'rh.avaliacoes', label: 'Avaliações' },
      { key: 'rh.ocorrencias', label: 'Ocorrências' },
      { key: 'rh.beneficios', label: 'Benefícios' },
      { key: 'rh.analises_indicadores', label: 'Análises e Indicadores' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    description: 'Controle financeiro, fluxo de caixa e relatórios.',
    route: '/financeiro',
    submodules: [
      { key: 'financeiro.dashboard', label: 'Dashboard' },
      { key: 'financeiro.lancamentos', label: 'Lançamentos' },
      { key: 'financeiro.fluxo_caixa', label: 'Fluxo de Caixa' },
      { key: 'financeiro.relatorios', label: 'Relatórios' },
    ],
  },
  {
    key: 'vendas',
    label: 'Comercial / Vendas',
    description: 'PDV, histórico de vendas, relatórios de vendas.',
    route: '/vendas',
    submodules: [],
  },
  {
    key: 'manutencao',
    label: 'Manutenção',
    description: 'Cadastro, listagem e ordens de serviço de manutenção.',
    route: '/manutencao',
    submodules: [
      { key: 'manutencao.dashboard', label: 'Dashboard' },
      { key: 'manutencao.cadastro', label: 'Cadastro' },
      { key: 'manutencao.listagem', label: 'Listagem' },
      { key: 'manutencao.os', label: 'Ordens de Serviço' },
    ],
  },
  {
    key: 'academia',
    label: 'Academia',
    description: 'Alunos, mensalidades e controle de pagamentos.',
    submodules: [],
  },
  // Slots para expansão futura — não têm telas ainda,
  // mas já podem ser ativados/desativados por empresa.
  {
    key: 'agenda',
    label: 'Agenda',
    description: 'Agendamentos de atendimentos para pacientes e profissionais.',
    route: '/clinica/agenda',
    submodules: [],
  },
  {
    key: 'prontuario',
    label: 'Prontuário',
    description: 'Histórico clínico dos pacientes: evoluções, anexos e atendimentos.',
    route: '/clinica/pacientes',
    submodules: [
      { key: 'prontuario.pacientes', label: 'Pacientes' },
      { key: 'prontuario.registros', label: 'Registros de Prontuário' },
    ],
  },
  {
    key: 'anamnese',
    label: 'Anamnese Digital',
    description: 'Anamneses digitais, modelos personalizáveis e PDFs vinculados ao prontuário. Exclusivo para clínicas — ativado pelo Super Admin.',
    route: '/clinica/anamnese/nova',
    submodules: [],
  },
  {
    key: 'clinica',
    label: 'Clínica',
    description: 'Prontuários, atendimentos, prescrições (em desenvolvimento).',
    submodules: [],
  },
  {
    key: 'ordem_servico',
    label: 'Ordem de Serviço',
    description: 'Abertura, execução e faturamento de OS (em desenvolvimento).',
    submodules: [],
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    description: 'Relatórios consolidados entre módulos (em desenvolvimento).',
    submodules: [],
  },
];

export const getModuleByKey = (key: string): ModuleDef | undefined =>
  MODULES_CATALOG.find((m) => m.key === key);
