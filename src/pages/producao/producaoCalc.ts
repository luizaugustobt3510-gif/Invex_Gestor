export function rendimento(consumido: number, produzido: number) {
  if (!(consumido > 0)) return { rendimento: 0, perda: 0, perdaPct: 0 };
  const perda = Math.max(0, Math.round((consumido - produzido) * 1000) / 1000);
  return { rendimento: (produzido / consumido) * 100, perda, perdaPct: (perda / consumido) * 100 };
}

export type StockStatus = 'OK' | 'Abaixo do Mínimo' | 'Zerado';

/** Situação do estoque: zerado (ou negativo) é crítico; abaixo do mínimo é alerta. */
export function stockStatus(quantidade: number, minimo: number): StockStatus {
  if (!(quantidade > 0)) return 'Zerado';
  if (quantidade < minimo) return 'Abaixo do Mínimo';
  return 'OK';
}

/** Custo proporcional da matéria-prima consumida de um lote. */
export function custoConsumo(custoLote: number, quantidadeLote: number, consumido: number) {
  if (!(quantidadeLote > 0) || !(consumido > 0)) return 0;
  return Math.round((custoLote / quantidadeLote) * consumido * 100) / 100;
}

/** Custo por unidade produzida. */
export function custoUnitario(custo: number, produzido: number) {
  if (!(produzido > 0)) return 0;
  return Math.round((custo / produzido) * 100) / 100;
}

/** Diferença entre o rendimento real e o esperado na ficha técnica (pontos percentuais). */
export function desvioFicha(rendimentoReal: number, esperado: number) {
  return Math.round((rendimentoReal - esperado) * 10) / 10;
}

/** Produção esperada pela ficha para uma quantidade consumida. */
export function producaoEsperada(consumido: number, rendimentoEsperado: number) {
  if (!(consumido > 0) || !(rendimentoEsperado > 0)) return 0;
  return Math.round(consumido * rendimentoEsperado * 10) / 1000;
}

export const TIPO_LABEL: Record<string, string> = {
  comum: 'Material',
  materia_prima: 'Matéria-prima',
  produto_final: 'Produto final',
};
