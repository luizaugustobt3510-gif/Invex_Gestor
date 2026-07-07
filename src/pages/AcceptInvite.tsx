import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Supabase places the invite tokens in the URL hash (#access_token=... type=invite)
    (async () => {
      const hash = window.location.hash?.slice(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            toast.error('Link de convite inválido ou expirado.');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast.error('Convite inválido. Solicite um novo ao administrador.');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
        return;
      }
      setEmail(data.user.email ?? null);
      setReady(true);
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');
    if (senha !== senha2) return toast.error('As senhas não conferem.');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from('profiles')
        .update({
          accepted_invite_at: new Date().toISOString(),
          email_verified: true,
          invite_token: null,
          invite_expires_at: null,
        })
        .eq('user_id', userData.user.id);
    }
    setLoading(false);
    toast.success('Conta ativada! Redirecionando...');
    setTimeout(() => navigate('/', { replace: true }), 800);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bem-vindo ao Invex</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {email ? `Você foi convidado como ${email}.` : 'Defina sua senha para ativar sua conta.'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                className="pl-10 h-12 rounded-xl text-base" placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)}
                className="pl-10 h-12 rounded-xl text-base" placeholder="Repita a senha" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold">
            {loading ? 'Ativando...' : 'Ativar minha conta'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;
