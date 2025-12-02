import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { InvexLogo } from '@/components/InvexLogo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Por favor, informe o e-mail.');
      return;
    }

    if (!senha.trim()) {
      toast.error('Por favor, informe a senha.');
      return;
    }

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
              Bem-vindo ao Invex
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sistema de Controle de Estoque
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;