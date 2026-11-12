// Traduz erros de login/cadastro/senha para mensagens claras em português.
type AuthLikeError = { message?: string; code?: string; error_code?: string; status?: number } | null | undefined;

export function authErrorMessage(err: AuthLikeError | unknown, fallback = 'Não foi possível continuar. Tente de novo.'): string {
  const e = (err ?? {}) as { message?: string; code?: string; error_code?: string; status?: number };
  const code = String(e.code || e.error_code || '').toLowerCase();
  const m = String(e.message || '').toLowerCase();

  if (code === 'weak_password' || m.includes('weak') || m.includes('pwned') || m.includes('easy to guess'))
    return 'Essa senha é muito comum e fácil de adivinhar. Use uma senha diferente, misturando letras, números e símbolos.';
  if (code === 'same_password' || m.includes('should be different'))
    return 'A nova senha precisa ser diferente da atual.';
  if (code === 'invalid_credentials' || m.includes('invalid login'))
    return 'E-mail ou senha incorretos.';
  if (code === 'user_already_exists' || code === 'email_exists' || m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'Este e-mail já tem conta. Entre com ele.';
  if (code === 'email_not_confirmed' || m.includes('not confirmed'))
    return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (code === 'email_address_invalid' || (m.includes('email') && m.includes('invalid')))
    return 'Esse e-mail não é válido. Confira e tente de novo.';
  if (code.startsWith('over_') || code.includes('rate_limit') || e.status === 429 || m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
  if (code === 'signup_disabled' || m.includes('signups not allowed'))
    return 'O cadastro está temporariamente indisponível.';
  if (m.includes('password') && (m.includes('at least') || m.includes('characters')))
    return 'A senha é curta demais. Use pelo menos 8 caracteres.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com a internet. Verifique e tente de novo.';
  return fallback;
}
