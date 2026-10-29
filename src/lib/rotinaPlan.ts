export interface RotinaAccess {
  status: 'ativo' | 'suspenso' | 'revogado';
  plano: 'gratuito' | 'premium';
  premium_status: 'nenhum' | 'ativo' | 'suspenso' | 'expirado';
  premium_fim: string | null;
}

export const FREE_LIMITS = { habitos: 5, metas: 3 };

/** Espelha public.routine_is_premium (o banco é quem decide de verdade). */
export function isPremium(a: RotinaAccess | null, today: string): boolean {
  if (!a || a.status !== 'ativo' || a.plano !== 'premium' || a.premium_status !== 'ativo') return false;
  return !a.premium_fim || a.premium_fim >= today;
}
