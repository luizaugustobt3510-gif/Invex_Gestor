import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { InvexLogo } from '@/components/InvexLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    } else {
      toast.error('Link de recuperação inválido.');
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSenha.trim()) { toast.error('Informe a nova senha.'); return; }
    if (novaSenha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <InvexLogo size="lg" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Redefinir Senha</CardTitle>
            <CardDescription className="text-base mt-2">Informe sua nova senha</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="novaSenha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="pl-10" placeholder="••••••••" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className="pl-10" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
