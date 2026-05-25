import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Save } from 'lucide-react';

const CriarUsuario = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadm';
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    autenticacao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = formData.email?.trim().toLowerCase() || '';
    const senha = formData.senha?.trim() || '';
    const nome = formData.nome?.trim() || '';
    const autenticacao = formData.autenticacao || '';

    if (!nome) { toast({ title: 'Campo obrigatório', description: 'Informe o nome.', variant: 'destructive' }); return; }
    if (!email) { toast({ title: 'Campo obrigatório', description: 'Informe o e-mail.', variant: 'destructive' }); return; }
    if (!senha) { toast({ title: 'Campo obrigatório', description: 'Informe a senha.', variant: 'destructive' }); return; }
    if (!autenticacao) { toast({ title: 'Campo obrigatório', description: 'Selecione o perfil.', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      // Map UI role to DB role
      const roleMap: Record<string, string> = {
        'admin': 'admin_empresa',
        'logistica': 'logistica',
        'usuario almox': 'usuario_almox',
        'solicitante': 'solicitante',
        'visualizador': 'visualizador',
        'rh': 'rh',
        'financeiro': 'financeiro',
        'fitness': 'fitness_user',
        // SuperAdmin only
        'superadm': 'super_admin',
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            password: senha,
            nome,
            role: roleMap[autenticacao] || 'solicitante',
          }),
        }
      );

      const result = await response.json();

      if (result.ok || result.success) {
        toast({ title: 'Sucesso!', description: result.msg || 'Usuário criado com sucesso.' });
        setFormData({ email: '', senha: '', nome: '', autenticacao: '' });
      } else {
        toast({ title: 'Erro', description: result.error || result.msg || 'Erro ao criar usuário.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao conectar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Criar Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha *</Label>
              <Input id="senha" type="password" value={formData.senha} onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))} placeholder="Senha de acesso" />
            </div>
            <div className="space-y-2">
              <Label>Perfil do Usuário *</Label>
              <Select value={formData.autenticacao} onValueChange={(v) => setFormData(prev => ({ ...prev, autenticacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <SelectItem value="superadm">Super Administrador</SelectItem>
                  )}
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="usuario almox">Almoxarifado</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                  <SelectItem value="visualizador">Convidado (somente leitura)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Save className="w-4 h-4" />
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default CriarUsuario;
