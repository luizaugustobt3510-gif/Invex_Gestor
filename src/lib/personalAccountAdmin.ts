import type { PersonalAccount } from './personalAccounts';

export type PremiumApp = 'rotina' | 'fitness' | 'financas';

export const PREMIUM_APPS: { key: PremiumApp; label: string }[] = [
  { key: 'rotina', label: 'Invex Rotina' },
  { key: 'fitness', label: 'Invex Fitness' },
  { key: 'financas', label: 'Invex Finanças' },
];

export const PROTECTED_EMAILS = ['luiz@invex.com'];

/** Por que a conta não pode ser excluída nesta tela (null = pode). Mesmas regras da função do servidor. */
export function deleteBlockReason(a: Pick<PersonalAccount, 'user_id' | 'email' | 'tem_empresa'>, myId?: string | null): string | null {
  if (myId && a.user_id === myId) return 'Você não pode excluir a própria conta.';
  if (a.email && PROTECTED_EMAILS.includes(a.email.toLowerCase())) return 'Conta protegida.';
  if (a.tem_empresa) return 'Conta com acesso empresarial: remova pela Gestão de Usuários.';
  return null;
}

/** Premium manual vale até o fim do dia escolhido (vazio = sem prazo). */
export function manualPremiumActive(ativo: boolean, fim: string | null, today: string): boolean {
  return ativo && (!fim || fim >= today);
}
