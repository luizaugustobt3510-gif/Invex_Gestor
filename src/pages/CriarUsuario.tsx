import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { UserPlus, Save } from 'lucide-react';

const CriarUsuario = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    autenticacao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = formData.email?.trim() || '';
    const senha = formData.senha?.trim() || '';
    const nome = formData.nome?.trim() || '';
    const autenticacao = formData.autenticacao || '';


    // Validate all fields
    if (!nome || nome.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome do usuário.',
        variant: 'destructive',
      });
      return;
    }

    if (!email || email.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o e-mail do usuário.',
        variant: 'destructive',
      });
      return;
    }

    if (!senha || senha.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a senha do usuário.',
        variant: 'destructive',
      });
      return;
    }

    if (!autenticacao || autenticacao.length === 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o nível de acesso.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: 'Erro',
        description: 'Usuário administrador não autenticado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.criarUsuario(
        user.email,
        email,
        senha,
        nome,
        autenticacao
      );

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Usuário criado com sucesso.',
        });
        setFormData({ email: '', senha: '', nome: '', autenticacao: '' });
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao criar usuário.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
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
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha *</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Senha de acesso"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso *</Label>
              <Select 
                value={formData.autenticacao} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, autenticacao: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadm">Super Administrador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="usuario almox">Usuário Almoxarifado</SelectItem>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
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
