import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

type AuthMethods = { email: boolean; google: boolean; microsoft: boolean };
const DEFAULT_METHODS: AuthMethods = { email: true, google: false, microsoft: false };

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
        <div className="relative z-10 px-16 max-w-lg">
          <div className="mb-8">
            <h1 className="text-5xl font-bold tracking-tight text-primary">Invex</h1>
            <div className="mt-2 h-1 w-16 bg-primary rounded-full" />
          </div>
          <p className="text-2xl font-light text-foreground leading-relaxed">
            Controle inteligente de estoque e operações
          </p>
          <p className="mt-6 text-muted-foreground text-sm leading-relaxed">
            Gerencie seu inventário, monitore movimentações e tome decisões estratégicas com dados em tempo real.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {['Estoque', 'Logística', 'Financeiro', 'Gestão de Pessoas', 'Vendas'].map((item) => (
              <span key={item} className="px-4 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground bg-muted/50">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-12 safe-area-inset">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">Invex</h1>
            <p className="mt-1.5 text-muted-foreground text-xs sm:text-sm">Controle inteligente de estoque e operações</p>
          </div>

          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Bem-vindo de volta</h2>
            <p className="mt-1 text-muted-foreground text-xs sm:text-sm">Faça login para acessar sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-muted-foreground text-xs sm:text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email" type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => lookupMethods(e.target.value)}
                  className="pl-10 h-11 sm:h-12 rounded-xl text-base"
                  disabled={loading} autoComplete="email" inputMode="email"
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
                  <Input id="senha" type="password" placeholder="••••••••" value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 h-11 sm:h-12 rounded-xl text-base"
                    disabled={loading} autoComplete="current-password" />
                </div>
              </div>
            )}

            {methods.email && (
              <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]" disabled={loading}>
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
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-background text-muted-foreground">ou continue com</span>
                </div>
              </div>

              <div className="space-y-3">
                {methods.google && (
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={!!oauthLoading}
                    className="flex items-center justify-center gap-3 w-full h-11 sm:h-12 rounded-xl border border-border bg-background hover:bg-muted/60 active:bg-muted/80 transition-all text-sm font-medium active:scale-[0.98]"
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
                    className="flex items-center justify-center gap-3 w-full h-11 sm:h-12 rounded-xl border border-border bg-background hover:bg-muted/60 active:bg-muted/80 transition-all text-sm font-medium active:scale-[0.98]"
                  >
                    <MicrosoftIcon />
                    {oauthLoading === 'microsoft' ? 'Conectando...' : 'Entrar com Microsoft'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="relative my-6 sm:my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">Não tem uma conta?</span>
            </div>
          </div>

          <a
            href="https://wa.me/5531973442958?text=Olá,%20quero%20criar%20uma%20conta%20no%20Invex"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 sm:h-12 rounded-xl border border-border bg-muted/30 text-foreground hover:bg-muted/60 active:bg-muted/80 hover:border-primary/30 transition-all duration-300 text-sm font-medium active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4 text-primary" />
            Criar conta via WhatsApp
          </a>

          <p className="mt-4 sm:mt-6 text-center text-xs text-muted-foreground">
            O acesso é liberado manualmente pelo administrador.
          </p>
        </div>
      </div>
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
