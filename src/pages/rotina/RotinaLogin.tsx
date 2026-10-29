import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarCheck } from 'lucide-react';

const RotinaLogin = () => {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/rotina', { replace: true }); });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8 && mode === 'criar') { toast.error('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      if (mode === 'criar') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password: senha,
          options: { emailRedirectTo: `${window.location.origin}/rotina`, data: { nome: nome.trim() } },
        });
        if (error) throw error;
        if (!data.session) setSent(true); else navigate('/rotina');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
        if (error) throw error;
        navigate('/rotina');
      }
    } catch (err: any) {
      const m = String(err?.message || '');
      toast.error(m.includes('Invalid login') ? 'E-mail ou senha incorretos.' : m.includes('already') ? 'Este e-mail já tem conta. Entre com ele.' : 'Não foi possível continuar.');
    } finally { setLoading(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/rotina/entrar` });
    if (r.error) { toast.error('Falha ao entrar com Google.'); return; }
    if (r.redirected) return;
    navigate('/rotina');
  };

  return (
    <div className="rotina-theme login-scene relative min-h-[100dvh] overflow-hidden flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <div className="login-blob login-blob-3 hidden md:block" aria-hidden="true" />
      <div className="login-ring login-ring-1 hidden sm:block" aria-hidden="true" />
      <div className="login-ring login-ring-2 hidden md:block" aria-hidden="true" />
      <div className="login-ring login-ring-3 hidden sm:block" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md md:max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 shadow-sm text-primary flex items-center justify-center mb-3">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Invex Rotina</h1>
          <p className="text-sm text-muted-foreground mt-1">Planeje, execute e revise sua semana.</p>
        </div>

        {sent ? (
          <div className="login-glass rounded-3xl p-6 sm:p-8 text-center space-y-2">
            <p className="font-medium text-foreground">Confira seu e-mail</p>
            <p className="text-sm text-muted-foreground">Enviamos um link para {email}. Clique nele para ativar sua conta gratuita.</p>
          </div>
        ) : (
          <div className="login-glass rounded-3xl p-6 sm:p-8 space-y-5">
            <Button type="button" variant="outline" className="login-ghost-btn w-full h-12" onClick={google}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.3-5.35 4.3-3.2 0-5.85-2.65-5.85-5.95S8.8 6.4 12 6.4c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 3.9 14.55 3 12 3 6.95 3 3 7.05 3 12s3.95 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.3-1.1z"/></svg>
              Continuar com Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="login-line h-px flex-1" />ou<div className="login-line h-px flex-1" /></div>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'criar' && (
                <div className="space-y-1.5"><Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required className="login-input h-12 text-base" /></div>
              )}
              <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required className="login-input h-12 text-base" /></div>
              <div className="space-y-1.5"><Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required className="login-input h-12 text-base" /></div>
              <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary-glow shadow-md hover:opacity-95" disabled={loading}>
                {loading ? 'Aguarde...' : mode === 'criar' ? 'Criar conta grátis' : 'Entrar'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'entrar' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" className="text-primary font-semibold py-2" onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}>
                {mode === 'entrar' ? 'Criar grátis' : 'Entrar'}
              </button>
            </p>
          </div>
        )}
        <p className="login-footer mt-6 text-center text-xs">Invex Gestor Soluções - IGS®</p>
      </div>
    </div>
  );
};

export default RotinaLogin;
