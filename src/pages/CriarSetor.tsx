import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Building2, Save, RefreshCw } from 'lucide-react';

interface Setor {
  id: string;
  nome: string;
  descricao: string;
}

const CriarSetor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setores, setSetores] = useState<Setor[]>([]);

  const fetchSetores = async () => {
    if (!user?.email) return;
    
    setLoadingSetores(true);
    try {
      const response = await api.listarSetores(user.email);
      console.log('Resposta listar setores:', response);
      if (response.setores && Array.isArray(response.setores)) {
        setSetores(response.setores);
      } else if (Array.isArray(response)) {
        setSetores(response);
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar setores.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSetores(false);
    }
  };

  useEffect(() => {
    fetchSetores();
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome do setor.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.email) return;

    setLoading(true);
    try {
      const response = await api.criarSetor(user.email, nome.trim(), descricao.trim());

      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: response.msg || 'Setor criado com sucesso.',
        });
        setNome('');
        setDescricao('');
        fetchSetores();
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao criar setor.',
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Criar Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Setor *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Almoxarifado Central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do setor (opcional)"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Criando...' : 'Criar Setor'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Setores Cadastrados</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchSetores} disabled={loadingSetores}>
              <RefreshCw className={`w-4 h-4 ${loadingSetores ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSetores ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : setores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum setor cadastrado.</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setores.map((setor, index) => (
                      <TableRow key={setor.id || index}>
                        <TableCell className="font-mono">{setor.id || index + 1}</TableCell>
                        <TableCell className="font-medium">{setor.nome}</TableCell>
                        <TableCell>{setor.descricao || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CriarSetor;
