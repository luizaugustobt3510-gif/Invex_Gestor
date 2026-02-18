import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { InvexLogo } from '@/components/InvexLogo';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupData, setSetupData] = useState({ nome: '', companyName: '', companyCnpj: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { count } = await supabase.from('companies').select('id', { count: 'exact', head: true });
        setSetupMode(!count || count === 0);
      } catch {
        // If RLS blocks, assume setup not done
        setSetupMode(true);
      }
      setCheckingSetup(false);
    };
    checkSetup();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim() || !setupData.nome.trim() || !setupData.companyName.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: senha,
            nome: setupData.nome.trim(),
            company_name: setupData.companyName.trim(),
            company_cnpj: setupData.companyCnpj.trim() || undefined,
          }),
        }
      );
      const result = await response.json();
      if (result.ok) {
        toast.success(result.msg);
        setSetupMode(false);
        // Auto-login
        const loginResult = await login(email.trim(), senha);
        if (loginResult.success) {
          navigate('/');
        }
      } else {
        toast.error(result.error || 'Erro no setup.');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <InvexLogo size="lg" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {setupMode ? 'Configuração Inicial' : 'Bem-vindo ao Invex'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {setupMode ? 'Crie sua empresa e o administrador principal' : 'Sistema de Controle de Estoque'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={setupMode ? handleSetup : handleSubmit} className="space-y-4">
            {setupMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="companyName" placeholder="Razão Social" value={setupData.companyName} onChange={(e) => setSetupData(p => ({ ...p, companyName: e.target.value }))} className="pl-10" disabled={loading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCnpj">CNPJ</Label>
                  <Input id="companyCnpj" placeholder="00.000.000/0001-00 (opcional)" value={setupData.companyCnpj} onChange={(e) => setSetupData(p => ({ ...p, companyCnpj: e.target.value }))} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Seu Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="nome" placeholder="Nome completo" value={setupData.nome} onChange={(e) => setSetupData(p => ({ ...p, nome: e.target.value }))} className="pl-10" disabled={loading} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={loading} autoComplete="email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="senha" type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-10" disabled={loading} autoComplete={setupMode ? 'new-password' : 'current-password'} />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? 'Processando...' : setupMode ? 'Criar Empresa e Entrar' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
