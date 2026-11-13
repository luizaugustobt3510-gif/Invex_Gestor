/**
 * Unidades de medida usadas em estoque, produção e vendas.
 * Unidades "de medida" (kg, t, L, m…) aceitam quantidade fracionada (1,5 kg).
 * Unidades "de contagem" (un, pacote, caixa…) só aceitam números inteiros.
 * A mesma regra é aplicada no servidor (public.unit_is_fractional).
 */
export interface UnitOption { value: string; label: string; short: string; fractional: boolean }

export const UNIT_OPTIONS: UnitOption[] = [
  { value: 'UN', label: 'Unidade (un)', short: 'un', fractional: false },
  { value: 'KG', label: 'Quilo (kg)', short: 'kg', fractional: true },
  { value: 'G', label: 'Grama (g)', short: 'g', fractional: true },
  { value: 'T', label: 'Tonelada (t)', short: 't', fractional: true },
  { value: 'L', label: 'Litro (L)', short: 'L', fractional: true },
  { value: 'ML', label: 'Mililitro (mL)', short: 'mL', fractional: true },
  { value: 'PCT', label: 'Pacote (pct)', short: 'pct', fractional: false },
  { value: 'CX', label: 'Caixa (cx)', short: 'cx', fractional: false },
  { value: 'DZ', label: 'Dúzia (dz)', short: 'dz', fractional: false },
  { value: 'FD', label: 'Fardo (fd)', short: 'fd', fractional: false },
  { value: 'SC', label: 'Saco (sc)', short: 'sc', fractional: false },
  { value: 'PAR', label: 'Par', short: 'par', fractional: false },
  { value: 'M', label: 'Metro (m)', short: 'm', fractional: true },
];

const FRACTIONAL = new Set([
  'KG', 'KGS', 'KILO', 'KILOS', 'QUILO', 'QUILOS', 'G', 'GR', 'GRAMA', 'GRAMAS', 'MG',
  'T', 'TON', 'TONELADA', 'TONELADAS', 'L', 'LT', 'LTS', 'LITRO', 'LITROS', 'ML',
  'M', 'MT', 'METRO', 'METROS', 'CM', 'M2', 'M²', 'M3', 'M³', 'ARROBA', '@',
]);

const SHORT: Record<string, string> = {
  UN: 'un', UND: 'un', UNID: 'un', UNIDADE: 'un', UNIDADES: 'un',
  KG: 'kg', KGS: 'kg', KILO: 'kg', KILOS: 'kg', QUILO: 'kg', QUILOS: 'kg',
  G: 'g', GR: 'g', GRAMA: 'g', GRAMAS: 'g', MG: 'mg',
  T: 't', TON: 't', TONELADA: 't', TONELADAS: 't',
  L: 'L', LT: 'L', LTS: 'L', LITRO: 'L', LITROS: 'L', ML: 'mL',
  PCT: 'pct', PACOTE: 'pct', CX: 'cx', CAIXA: 'cx', DZ: 'dz', DUZIA: 'dz', 'DÚZIA': 'dz',
  FD: 'fd', FARDO: 'fd', SC: 'sc', SACO: 'sc', PAR: 'par', M: 'm', MT: 'm', METRO: 'm', METROS: 'm',
};

const norm = (u?: string | null) => (u ?? '').trim().toUpperCase();

export const isFractionalUnit = (u?: string | null) => FRACTIONAL.has(norm(u));

/** Rótulo curto para mostrar ao lado de números: "kg", "un", "pct"… */
export const unitShort = (u?: string | null) => SHORT[norm(u)] ?? ((u ?? '').trim().toLowerCase() || 'un');

/** "1,5 kg", "3 un" */
export function formatQty(n: number, u?: string | null): string {
  const dec = isFractionalUnit(u) ? 3 : 0;
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: dec })} ${unitShort(u)}`;
}

/** Converte o texto digitado (aceita vírgula) e valida pela unidade. */
export function parseQty(text: string, u?: string | null): { value: number | null; error?: string } {
  const t = (text ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return { value: null, error: 'Informe a quantidade' };
  const v = Number(t);
  if (!Number.isFinite(v)) return { value: null, error: 'Quantidade inválida' };
  if (v <= 0) return { value: null, error: 'A quantidade deve ser maior que zero' };
  if (!isFractionalUnit(u) && !Number.isInteger(v)) {
    return { value: null, error: `Em ${unitShort(u)} só dá para usar números inteiros` };
  }
  return { value: Math.round(v * 1000) / 1000 };
}

/** Passo dos botões + e −: 1 para tudo; frações são digitadas. */
export const unitStep = (_u?: string | null) => 1;

/** Valor salvo para a unidade escolhida numa lista (mantém a unidade antiga se não for da lista). */
export const unitOptionFor = (u?: string | null): UnitOption | undefined => {
  const n = norm(u);
  return UNIT_OPTIONS.find((o) => o.value === n) ?? UNIT_OPTIONS.find((o) => SHORT[n] && o.short === SHORT[n]);
};
