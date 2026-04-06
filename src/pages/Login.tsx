import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data, error } = await supabase.rpc('check_setup_needed');
        if (error) {
          console.error('Erro ao verificar setup:', error);
          setNeedsSetup(false);
        } else {
          setNeedsSetup(data === true);
        }
      } catch {
        setNeedsSetup(false);
      }
      setCheckingSetup(false);
    };
    checkSetup();
  }, []);

  useEffect(() => {
    if (!needsSetup || checkingSetup) return;
    const runAutoSetup = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-user`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auto_setup_master' }),
          }
        );
        const result = await response.json();
        if (result.ok) {
          toast.success('Sistema configurado! Faça login com suas credenciais.');
          setNeedsSetup(false);
        } else {
          console.error('Auto setup:', result.error || result.msg);
          setNeedsSetup(false);
        }
      } catch (err) {
        console.error('Erro no auto setup:', err);
        setNeedsSetup(false);
      }
    };
    runAutoSetup();
  }, [needsSetup, checkingSetup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Por favor, informe o e-mail.'); return; }
    if (!senha.trim()) { toast.error('Por favor, informe a senha.'); return; }

    setLoading(true);
    const result = await login(email.trim(), senha);
    setLoading(false);

    if (result.success) {
      toast.success(result.message);
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  if (checkingSetup || needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {needsSetup ? 'Configurando o sistema...' : 'Verificando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground">
      {/* Left Panel - Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
        
        <div className="relative z-10 px-16 max-w-lg">
          <div className="mb-8">
            <h1 className="text-5xl font-bold tracking-tight text-primary">
              Invex
            </h1>
            <div className="mt-2 h-1 w-16 bg-primary rounded-full" />
          </div>

          <p className="text-2xl font-light text-foreground leading-relaxed">
            Controle inteligente de estoque e operações
          </p>

          <p className="mt-6 text-muted-foreground text-sm leading-relaxed">
            Gerencie seu inventário, monitore movimentações e tome decisões estratégicas com dados em tempo real.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {['Estoque', 'Logística', 'Financeiro', 'RH', 'Vendas'].map((item) => (
              <span
                key={item}
                className="px-4 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground bg-muted/50"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-12 safe-area-inset">
        <div className="w-full max-w-md">
          {/* Mobile header */}
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
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 sm:h-12 rounded-xl text-base"
                  disabled={loading}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-muted-foreground text-xs sm:text-sm">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80 active:text-primary/60 transition-colors py-1"
                  onClick={async () => {
                    if (!email.trim()) {
                      toast.error('Informe seu email para recuperar a senha.');
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast.success('Se o email estiver cadastrado, você receberá um link de recuperação.');
                    } catch {
                      toast.success('Se o email estiver cadastrado, você receberá um link de recuperação.');
                    }
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10 h-11 sm:h-12 rounded-xl text-base"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="relative my-6 sm:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">Não tem uma conta?</span>
            </div>
          </div>

          <a
            href="https://wa.me/5531973442958?text=Olá,%20quero%20criar%20uma%20conta%20no%20Invex"
            target="_blank"
            rel="noopener noreferrer"
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

export default Login;
