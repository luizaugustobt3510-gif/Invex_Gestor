import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Solicitacao {
  id: string;
  data: string;
  email_usuario: string;
  setor: string;
  codigo: string;
  material: string;
  quantidade: number;
  status: string;
  obs: string;
}

const ListarSolicitacoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);

  const fetchSolicitacoes = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const response = await api.listarSolicitacoes(user.email);
      if (response.solicitacoes) {
        setSolicitacoes(response.solicitacoes);
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar solicitações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, [user?.email]);

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pendente')) {
      return <Badge variant="secondary">{status}</Badge>;
    }
    if (statusLower.includes('aprovad')) {
      return <Badge className="bg-green-500">{status}</Badge>;
    }
    if (statusLower.includes('rejeitad') || statusLower.includes('negad')) {
      return <Badge variant="destructive">{status}</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  return (
    <MainLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Solicitações de Material
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSolicitacoes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitacoes.map((sol) => (
                    <TableRow key={sol.id}>
                      <TableCell className="font-mono">{sol.id}</TableCell>
                      <TableCell>{sol.data}</TableCell>
                      <TableCell>{sol.email_usuario}</TableCell>
                      <TableCell>{sol.setor}</TableCell>
                      <TableCell>{sol.codigo}</TableCell>
                      <TableCell>{sol.material}</TableCell>
                      <TableCell>{sol.quantidade}</TableCell>
                      <TableCell>{getStatusBadge(sol.status)}</TableCell>
                      <TableCell>{sol.obs || '-'}</TableCell>
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

export default ListarSolicitacoes;
