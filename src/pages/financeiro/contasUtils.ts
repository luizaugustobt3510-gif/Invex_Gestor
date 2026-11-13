export type OrigemFiltro = 'todas' | 'vendas' | 'producao' | 'outras';

/** Rótulo curto mostrado ao lado de cada conta, conforme de onde ela veio. */
export const origemLabel = (origem?: string | null): string => {
  switch (origem) {
    case 'vendas': return 'Venda';
    case 'producao': return 'Matéria-prima';
    case 'importacao': return 'Importado';
    default: return 'Manual';
  }
};

export const matchesOrigem = (origem: string | null | undefined, filtro: OrigemFiltro): boolean => {
  if (filtro === 'todas') return true;
  if (filtro === 'outras') return origem !== 'vendas' && origem !== 'producao';
  return origem === filtro;
};

/**
 * Situação inicial da lista: tudo (abertas + quitadas), para que vendas já
 * recebidas no PDV apareçam em Contas a Receber.
 */
export const DEFAULT_STATUS_FILTER = 'tudo' as const;
