/** Regras do Invex Finanças que a tela usa (o banco decide o Premium de verdade). */
export const FINANCAS_MONTHLY_PRICE_ID = 'financas_premium_mensal';
export const FINANCAS_ANNUAL_PRICE_ID = 'financas_premium_anual';
export const FINANCAS_MONTHLY_CENTS = 2590;
export const FINANCAS_ANNUAL_CENTS = 25900;
export const FINANCAS_TRIAL_DAYS = 3;

export const FINANCAS_PREMIUM_FEATURES = [
  'Projeção dos próximos 6 meses',
  'Calendário de vencimentos com mapa de calor',
  'Divisão de gastos por pessoas',
  'Compartilhar a conta (somente leitura)',
  'DRE pessoal (resultado do mês e do ano)',
  'Lançamentos sem limite por mês',
] as const;

export const FINANCAS_FREE_FEATURES = [
  'Até 5 despesas, 5 receitas e 5 reservas por mês',
  'Marcar como pago com um toque',
  'Parcelado e recorrente',
  'Teto de gastos por categoria',
  'Categorias e subcategorias personalizadas, gráficos',
  'Fixar lançamentos e marcar contas por cor',
  'Calculadora com histórico e dicas financeiras',
] as const;

/** Tema natalino: ligado só de 1º a 31 de dezembro (horário de Brasília). */
export function isChristmasSeason(now: Date = new Date()): boolean {
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', month: 'numeric' }).format(now));
  return month === 12;
}

/** Intensidade do mapa de calor: 0 = sem contas, 1..4 = do mais leve ao mais pesado. */
export function heatLevel(total: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!total || total <= 0 || !max || max <= 0) return 0;
  const r = total / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

export function premiumErrorMessage(e: unknown): string | null {
  const m = String((e as { message?: string })?.message || '');
  return m.includes('PREMIUM_FINANCAS') ? 'Recurso do Invex Finanças Premium. Assine em Perfil → Plano.' : null;
}

/** Plano gratuito: quantos lançamentos de cada tipo cabem em um mês (o banco confere de verdade). */
export const FINANCAS_FREE_MONTHLY_LIMIT = 5;

export type FreeBucket = 'despesa' | 'receita' | 'reserva';
export const FREE_BUCKET_LABEL: Record<FreeBucket, string> = { despesa: 'despesas', receita: 'receitas', reserva: 'reservas' };

type TxLike = { type: string; subcategory?: string | null; description?: string | null; date: string; competencia?: string | null };

/** Reserva = receita na subcategoria "Outros" com "reserva" na descrição (mesma regra dos totais). */
export function txBucket(t: TxLike): FreeBucket {
  if (t.type === 'despesa') return 'despesa';
  if (t.subcategory === 'Outros' && String(t.description ?? '').toLowerCase().includes('reserva')) return 'reserva';
  return 'receita';
}

/** Mês que conta para o limite: competência quando informada, senão o mês do vencimento. */
export function txMonth(t: TxLike): string {
  return t.competencia || t.date.slice(0, 7);
}

export function monthlyUsage(all: TxLike[], month: string): Record<FreeBucket, number> {
  const out: Record<FreeBucket, number> = { despesa: 0, receita: 0, reserva: 0 };
  for (const t of all) if (txMonth(t) === month) out[txBucket(t)]++;
  return out;
}

/** Primeiro mês/tipo que passaria do limite gratuito se `rows` fossem lançados, ou null. */
export function freeLimitBlock(existing: TxLike[], rows: TxLike[]): { bucket: FreeBucket; month: string } | null {
  const counts = new Map<string, number>();
  for (const t of existing) {
    const k = `${txBucket(t)}|${txMonth(t)}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const r of rows) {
    const bucket = txBucket(r); const month = txMonth(r);
    const k = `${bucket}|${month}`;
    const n = (counts.get(k) ?? 0) + 1;
    if (n > FINANCAS_FREE_MONTHLY_LIMIT) return { bucket, month };
    counts.set(k, n);
  }
  return null;
}

export function freeLimitMessage(bucket: FreeBucket, month: string): string {
  const [y, m] = month.split('-');
  return `O plano gratuito permite ${FINANCAS_FREE_MONTHLY_LIMIT} ${FREE_BUCKET_LABEL[bucket]} por mês (${m}/${y}). Assine o Premium para lançar sem limite.`;
}

/** Mensagem amigável quando o banco recusa por limite do plano gratuito. */
export function limitErrorMessage(e: unknown): string | null {
  const m = String((e as { message?: string })?.message || '');
  const i = m.indexOf('LIMITE_FINANCAS:');
  if (i < 0) return null;
  const txt = m.slice(i + 'LIMITE_FINANCAS:'.length).trim();
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
