/** Traduz erros do banco para mensagens claras em português. */
export function dbErrorMessage(err: { code?: string; message?: string } | null | undefined, fallback = 'Não foi possível salvar.'): string {
  if (!err) return fallback;
  const msg = err.message || '';
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Seu usuário não tem permissão para esta ação. Peça ao administrador da empresa para liberar o módulo no seu perfil.';
  }
  if (err.code === '23505' || /duplicate key/i.test(msg)) {
    return 'Já existe um cadastro com esses dados.';
  }
  return msg || fallback;
}

/** Normaliza o nome de um grupo e verifica se já existe (sem diferenciar maiúsculas/acentos). */
export function normalizeGroupName(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

export function groupNameExists(nome: string, existing: { nome: string }[]): boolean {
  const key = (s: string) => normalizeGroupName(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const k = key(nome);
  return existing.some(g => key(g.nome) === k);
}
