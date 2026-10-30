// ============= Full file contents =============

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import invexLogo from '@/assets/invex-logo.png';
import rotinaPromo from '@/assets/rotina-promo.jpg';
import { PublicCommerceFooter } from '@/components/PublicCommerceFooter';

type AuthMethods = { email: boolean; google: boolean; microsoft: boolean };
const DEFAULT_METHODS: AuthMethods = { email: true, google: false, microsoft: false };

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | 'google' | 'microsoft'>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [methods, setMethods] = useState<AuthMethods>(DEFAULT_METHODS);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data } = await supabase.rpc('check_setup_needed');
        setNeedsSetup(data === true);
      } catch { setNeedsSetup(false); }
      setCheckingSetup(false);
    };
    checkSetup();
  }, []);


  // When the user types an email, look up which auth methods that email's company allows.
  // If no match, show default (email only) so we never leak whether email exists.
  const lookupMethods = useCallback(async (value: string) => {
    const clean = value.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setMethods(DEFAULT_METHODS);
      return;
    }
    try {
      const { data } = await supabase.rpc('get_auth_methods_for_email', { _email: clean });
      if (data && typeof data === 'object') {
        setMethods({ ...DEFAULT_METHODS, ...(data as AuthMethods) });
      } else {
        setMethods(DEFAULT_METHODS);
      }
    } catch {
      setMethods(DEFAULT_METHODS);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) { toast.error('Informe e-mail e senha.'); return; }
    if (!methods.email) { toast.error('Sua empresa desativou login por e-mail e senha.'); return; }
    setLoading(true);
    const result = await login(email.trim(), senha);
    setLoading(false);
    if (result.success) { toast.success(result.message); navigate('/'); }
    else toast.error(result.message);
  };

  const handleOAuth = async (provider: 'google' | 'microsoft') => {
    setOauthLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || `Falha ao autenticar com ${provider}.`);
        setOauthLoading(null);
        return;
      }
      if (result.redirected) return;
      navigate('/');
    } catch (err: any) {
      toast.error(err?.message || `Falha ao autenticar com ${provider}.`);
      setOauthLoading(null);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Configuração inicial pendente</h1>
          <p className="text-sm text-muted-foreground">
            O sistema ainda não possui uma empresa cadastrada. Peça ao operador para criar o administrador inicial manualmente no painel do backend.
          </p>
        </div>
      </div>
    );
  }


  const showOAuth = methods.google || methods.microsoft;
  const providerCount = (methods.google ? 1 : 0) + (methods.microsoft ? 1 : 0);

  return (
    <div className="login-scene relative min-h-[100dvh] overflow-hidden flex flex-col items-center justify-center px-5 py-10 safe-area-inset">
      {/* Fundo claro: manchas suaves de verde e contornos */}
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <div className="login-blob login-blob-3" aria-hidden="true" />
      <div className="login-ring login-ring-1" aria-hidden="true" />
      <div className="login-ring login-ring-2" aria-hidden="true" />
      <div className="login-ring login-ring-3" aria-hidden="true" />
      {/* Seta ascendente sutil, ecoando a logo */}
      <svg
        className="absolute bottom-[13%] right-[11%] w-40 h-40 text-primary opacity-[0.10] pointer-events-none hidden sm:block"
        viewBox="0 0 100 100" fill="none" aria-hidden="true"
      >
        <path d="M15 85 L55 45 M55 45 L35 43 M55 45 L53 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 45 L85 15 M85 15 L68 14 M85 15 L84 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Cartão de login */}
      <div className="login-glass relative z-10 w-full max-w-xl rounded-3xl px-6 sm:px-10 py-7 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
          <img src={invexLogo} alt="Invex Gestor Soluções" className="h-12 sm:h-14 w-auto shrink-0" />
          <div className="text-center sm:text-left sm:border-l sm:border-border sm:pl-5">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">Bem-vindo de volta</h2>
            <p className="mt-1 text-muted-foreground text-xs sm:text-sm">Faça login para acessar sua conta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-muted-foreground text-xs sm:text-sm">E-mail ou usuário</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email" type="text" placeholder="seu@email.com ou usuário" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => lookupMethods(e.target.value)}
                className="login-input pl-10 h-11 sm:h-12 rounded-xl text-base"
                disabled={loading} autoComplete="username" autoCapitalize="none" autoCorrect="off"
              />
            </div>
          </div>

          {methods.email && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-muted-foreground text-xs sm:text-sm">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80 transition-colors py-1"
                  onClick={async () => {
                    if (!email.trim()) { toast.error('Informe seu email para recuperar a senha.'); return; }
                    try {
                      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      toast.success('Se o email estiver cadastrado, você receberá um link de recuperação.');
                    } catch {
                      toast.success('Se o email estiver cadastrado, você receberá um link de recuperação.');
                    }
                  }}
                >Esqueci minha senha</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="senha" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="login-input pl-10 pr-10 h-11 sm:h-12 rounded-xl text-base"
                  disabled={loading} autoComplete="current-password" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {methods.email && (
            <Button
              type="submit"
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 hover:brightness-105 transition-all duration-300 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4" /></div>
              )}
            </Button>
          )}
        </form>

        {showOAuth && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="login-line h-px flex-1" />
              <span className="text-xs text-muted-foreground">ou continue com</span>
              <div className="login-line h-px flex-1" />
            </div>

            <div className={providerCount > 1 ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
              {methods.google && (
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={!!oauthLoading}
                  className="login-ghost-btn flex items-center justify-center gap-3 w-full h-11 sm:h-12 rounded-xl transition-all text-sm font-medium active:scale-[0.98]"
                >
                  <GoogleIcon />
                  {oauthLoading === 'google' ? 'Conectando...' : 'Entrar com Google'}
                </button>
              )}
              {methods.microsoft && (
                <button
                  type="button"
                  onClick={() => handleOAuth('microsoft')}
                  disabled={!!oauthLoading}
                  className="login-ghost-btn flex items-center justify-center gap-3 w-full h-11 sm:h-12 rounded-xl transition-all text-sm font-medium active:scale-[0.98]"
                >
                  <MicrosoftIcon />
                  {oauthLoading === 'microsoft' ? 'Conectando...' : 'Entrar com Microsoft'}
                </button>
              )}
            </div>
          </>
        )}

        <div className="my-5 flex items-center gap-3">
          <div className="login-line h-px flex-1" />
          <span className="text-xs text-muted-foreground">Não tem uma conta?</span>
          <div className="login-line h-px flex-1" />
        </div>

        <a
          href="https://wa.me/5531973442958?text=Olá,%20quero%20criar%20uma%20conta%20no%20Invex"
          target="_blank" rel="noopener noreferrer"
          className="login-ghost-btn flex items-center justify-center gap-2 w-full h-11 sm:h-12 rounded-xl transition-all duration-300 text-sm font-medium active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4 text-primary" />
          Criar conta via WhatsApp
        </a>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          O acesso é liberado manualmente pelo administrador.
        </p>
      </div>

      <a
        href="/rotina/entrar"
        onClick={(e) => { e.preventDefault(); navigate('/rotina/entrar'); }}
        className="group relative z-10 mt-5 w-full max-w-xl flex items-center gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur px-3 py-2 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
        aria-label="Experimente o Invex Rotina"
      >
        <img src={rotinaPromo} alt="Invex Rotina" loading="lazy" width={992} height={672} className="h-12 w-[72px] shrink-0 rounded-lg object-cover bg-background" />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-foreground leading-tight">Conheça o Invex Rotina</p>
          <p className="text-xs text-muted-foreground truncate">Organize tarefas, hábitos e metas. Comece grátis.</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[hsl(24_95%_53%)] px-3 py-1.5 text-xs font-medium text-primary-foreground">
          Experimentar <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      </a>

      <p className="login-footer relative z-10 mt-6 text-center text-[10px] tracking-wide">
        Invex Gestor Soluções - IGS®
      </p>
      <PublicCommerceFooter />
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.8l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.9 0 19.5-7.9 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-3.5 5.4-6 9.6-6 2.9 0 5.6 1.1 7.6 2.8l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5c-7.4 0-13.8 4.2-17.7 10.2z"/>
    <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-4.9c-1.9 1.3-4.3 2.1-7 2.1-5.2 0-9.6-3.1-11.3-7.5l-6.6 5.1C9.9 39.4 16.4 43.5 24 43.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6 4.9c-.4.4 6.5-4.7 6.5-14.4 0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#f25022" d="M1 1h10v10H1z"/>
    <path fill="#7fba00" d="M12 1h10v10H12z"/>
    <path fill="#00a4ef" d="M1 12h10v10H1z"/>
    <path fill="#ffb900" d="M12 12h10v10H12z"/>
  </svg>
);

export default Login;
