import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ListarSetores = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [setores, setSetores] = useState<Array<{ id_setor: number; nome_setor: string; descricao: string }>>([]);

  const fetchSetores = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const response = await api.listarSetores(user.email);
      if (response.setores) {
        setSetores(response.setores);
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar setores.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetores();
  }, [user?.email]);

  return (
    <MainLayout>
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Setores Cadastrados
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSetores} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                  {setores.map((setor) => (
                    <TableRow key={setor.id_setor}>
                      <TableCell className="font-mono">{setor.id_setor}</TableCell>
                      <TableCell className="font-medium">{setor.nome_setor}</TableCell>
                      <TableCell>{setor.descricao || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ListarSetores;
