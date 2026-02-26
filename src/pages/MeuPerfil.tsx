import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Lock, Save } from 'lucide-react';

const MeuPerfil = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    if (!email.trim()) { toast.error('Email é obrigatório.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { toast.error('Email inválido.'); return; }

    setSavingProfile(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Não autenticado');

      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: nome.trim() })
        .eq('user_id', authUser.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email.trim().toLowerCase() !== authUser.email?.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim().toLowerCase(),
        });
        if (emailError) throw emailError;
        toast.success('Perfil atualizado! Verifique seu novo email para confirmar a mudança.');
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual.trim()) { toast.error('Informe a senha atual.'); return; }
    if (!novaSenha.trim()) { toast.error('Informe a nova senha.'); return; }
    if (novaSenha.length < 6) { toast.error('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (novaSenha !== confirmarSenha) { toast.error('As senhas não coincidem.'); return; }

    setSavingPassword(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) throw new Error('Não autenticado');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: senhaAtual,
      });

      if (signInError) {
        toast.error('Senha atual incorreta.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="pl-10" placeholder="Seu nome" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="seu@email.com" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Perfil: <span className="capitalize font-medium">{user?.role}</span>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={savingProfile}>
                <Save className="w-4 h-4" />
                {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <Input id="senhaAtual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••••" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input id="novaSenha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={savingPassword}>
                <Lock className="w-4 h-4" />
                {savingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default MeuPerfil;
