export type AppFilter = 'todos' | 'rotina' | 'fitness' | 'financas';

export interface PersonalAccount {
  user_id: string; nome: string | null; email: string | null;
  created_at: string; last_sign_in_at: string | null;
  login_google: boolean; email_confirmado: boolean; tem_empresa: boolean; empresa: string | null;
  usa_rotina: boolean; usa_fitness: boolean; usa_financas: boolean;
  rotina_premium: boolean; fitness_premium: boolean; financas_premium: boolean;
  telefone: string | null; cidade: string | null; uf: string | null;
}

/** Filtra contas pelo app usado e por texto (nome, e-mail ou telefone). */
export function filterPersonalAccounts(rows: PersonalAccount[], app: AppFilter, q: string): PersonalAccount[] {
  const term = q.trim().toLowerCase();
  const digits = term.replace(/\D/g, '');
  return rows.filter(r => {
    if (app === 'rotina' && !r.usa_rotina) return false;
    if (app === 'fitness' && !r.usa_fitness) return false;
    if (app === 'financas' && !r.usa_financas) return false;
    if (!term) return true;
    if (`${r.nome ?? ''} ${r.email ?? ''}`.toLowerCase().includes(term)) return true;
    return digits.length > 0 && (r.telefone ?? '').replace(/\D/g, '').includes(digits);
  });
}
