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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto" />
          <p className="text-sm text-zinc-400">
            {needsSetup ? 'Configurando o sistema...' : 'Verificando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] text-zinc-100">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-[#0a0a0f] to-blue-600/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 px-16 max-w-lg">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Invex
              </span>
            </h1>
            <div className="mt-2 h-1 w-16 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" />
          </div>

          <p className="text-2xl font-light text-zinc-300 leading-relaxed">
            Controle inteligente de estoque e operações
          </p>

          <p className="mt-6 text-zinc-500 text-sm leading-relaxed">
            Gerencie seu inventário, monitore movimentações e tome decisões estratégicas com dados em tempo real.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-3">
            {['Estoque', 'Logística', 'Financeiro', 'RH', 'Vendas'].map((item) => (
              <span
                key={item}
                className="px-4 py-1.5 rounded-full text-xs font-medium border border-zinc-800 text-zinc-400 bg-zinc-900/50"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Invex
              </span>
            </h1>
            <p className="mt-2 text-zinc-500 text-sm">Controle inteligente de estoque e operações</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100">Bem-vindo de volta</h2>
            <p className="mt-1 text-zinc-500 text-sm">Faça login para acessar sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-zinc-400 text-sm">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-11 h-12 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-xl focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-600/20 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#0a0a0f] text-zinc-600">Não tem uma conta?</span>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/5531973442958?text=Olá,%20quero%20criar%20uma%20conta%20no%20Invex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 hover:border-zinc-700 transition-all duration-300 text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4 text-green-400" />
            Criar conta via WhatsApp
          </a>

          <p className="mt-6 text-center text-xs text-zinc-600">
            O acesso é liberado manualmente pelo administrador.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
