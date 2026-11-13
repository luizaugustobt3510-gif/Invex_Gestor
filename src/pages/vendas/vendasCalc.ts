/** Regras de lote e de comprador usadas no PDV e na análise de compradores. */

export interface SaleLot {
  id: string;
  tipo: 'produto' | 'materia_prima';
  material_id: string;
  lote: string;
  data_producao: string | null; // yyyy-mm-dd
  validade: string | null;
  restante: number;
  created_at: string;
}

export const CONSUMIDOR_NAO_IDENTIFICADO = 'Consumidor não identificado';

/** Mais antigo primeiro: data de produção e, no empate, ordem de entrada. */
export function sortOldestFirst<T extends Pick<SaleLot, 'data_producao' | 'created_at'>>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    const da = a.data_producao ?? a.created_at.slice(0, 10);
    const db = b.data_producao ?? b.created_at.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

/** Quanto sai de cada lote vendendo do mais antigo; o que faltar sai do saldo sem lote. */
export function planOldestFirst(lots: SaleLot[], qtd: number): { usados: { lot: SaleLot; qtd: number }[]; semLote: number } {
  let rest = qtd;
  const usados: { lot: SaleLot; qtd: number }[] = [];
  for (const lot of sortOldestFirst(lots.filter((l) => l.restante > 0))) {
    if (rest <= 0) break;
    const take = Math.min(rest, lot.restante);
    usados.push({ lot, qtd: round3(take) });
    rest = round3(rest - take);
  }
  return { usados, semLote: Math.max(0, round3(rest)) };
}

/** Estoque que não está em nenhum lote (ex.: empresas sem Produção). */
export const saldoSemLote = (estoque: number, lots: SaleLot[]) =>
  Math.max(0, round3(estoque - lots.reduce((s, l) => s + Math.max(0, l.restante), 0)));

export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Total da venda com desconto em R$ ou %, nunca negativo. */
export function saleTotals(itens: { quantidade: number; preco_unitario: number }[], desconto: number, tipo: 'valor' | 'percentual') {
  const subtotal = round2(itens.reduce((s, i) => s + round2(i.quantidade * i.preco_unitario), 0));
  const bruto = tipo === 'percentual' ? round2((subtotal * (desconto || 0)) / 100) : desconto || 0;
  const descontoValor = Math.max(0, Math.min(bruto, subtotal));
  return { subtotal, descontoValor, total: round2(subtotal - descontoValor) };
}
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CustomerStats { faturamento: number; compras: number; avaliacao: number; pontualidade: number }

/** Pontuação 0–1 do comprador: quanto compra, com que frequência e como é avaliado. */
export function customerScore(
  c: CustomerStats,
  max: { faturamento: number; compras: number },
  pesos: { faturamento: number; frequencia: number; avaliacao: number },
) {
  const nFat = max.faturamento > 0 ? c.faturamento / max.faturamento : 0;
  const nFreq = max.compras > 0 ? c.compras / max.compras : 0;
  const nAval = Math.max(0, Math.min(10, (c.avaliacao + c.pontualidade) / 2)) / 10;
  const soma = pesos.faturamento + pesos.frequencia + pesos.avaliacao || 1;
  return (pesos.faturamento * nFat + pesos.frequencia * nFreq + pesos.avaliacao * nAval) / soma;
}

export function scoreLabel(score: number) {
  if (score >= 0.85) return 'Ótimo';
  if (score >= 0.7) return 'Bom';
  if (score >= 0.5) return 'Regular';
  return 'Ruim';
}
