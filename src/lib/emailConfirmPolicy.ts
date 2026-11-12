// Regra da confirmação de e-mail das contas pessoais (Rotina, Finanças, Fitness):
// a conta funciona na hora; um aviso pede a confirmação e, depois do prazo, o acesso
// fica bloqueado até confirmar.
export const EMAIL_CONFIRM_GRACE_DAYS = 7;

export type EmailConfirmState = 'ok' | 'aviso' | 'bloqueado';

export function emailConfirmState(verified: boolean, createdAt: string | Date, now: Date = new Date()): EmailConfirmState {
  if (verified) return 'ok';
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 'aviso';
  const deadline = created + EMAIL_CONFIRM_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() >= deadline ? 'bloqueado' : 'aviso';
}

export function daysLeft(createdAt: string | Date, now: Date = new Date()): number {
  const deadline = new Date(createdAt).getTime() + EMAIL_CONFIRM_GRACE_DAYS * 86400000;
  return Math.max(0, Math.ceil((deadline - now.getTime()) / 86400000));
}
