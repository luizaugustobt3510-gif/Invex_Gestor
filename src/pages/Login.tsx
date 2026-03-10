import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { InvexLogo } from '@/components/InvexLogo';
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

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-elevated">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <InvexLogo size="lg" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Sistema não configurado</CardTitle>
              <CardDescription className="text-base mt-2">
                Nenhuma empresa cadastrada. Entre em contato com o administrador do sistema para realizar a configuração inicial.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <InvexLogo size="lg" />
            </div>
          <div>
            <CardDescription className="text-base mt-2">Faça login para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={loading} autoComplete="email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="senha" type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-10" disabled={loading} autoComplete="current-password" />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-primary hover:underline mt-1"
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
          </form>

          <div className="mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/demo')}
            >
              Testar / Conhecer o Invex
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
