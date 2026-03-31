export interface Insight {
  module: 'logistica' | 'financeiro' | 'vendas' | 'rh';
  type: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  suggestion?: string;
}

export const MODULE_LABELS: Record<string, string> = {
  logistica: 'Logística',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  rh: 'Gestão de Pessoas',
};
