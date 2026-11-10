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
] as const;

export const FINANCAS_FREE_FEATURES = [
  'Lançamentos de receitas e despesas',
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
