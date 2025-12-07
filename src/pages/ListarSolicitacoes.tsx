import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ClipboardList, RefreshCw, Filter, PackageCheck } from 'lucide-react';
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
  const [delivering, setDelivering] = useState<string | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const fetchSolicitacoes = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const response = await api.listarSolicitacoes(user.email);
      if (response.solicitacoes) {
        setSolicitacoes(response.solicitacoes);
      } else if (Array.isArray(response)) {
        setSolicitacoes(response);
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

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // Try different date formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/,   // YYYY-MM-DD
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
        } else {
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
      }
    }
    
    return new Date(dateStr);
  };

  const filteredSolicitacoes = solicitacoes.filter(sol => {
    if (!dataInicial && !dataFinal) return true;
    
    const solDate = parseDate(sol.data);
    if (!solDate || isNaN(solDate.getTime())) return true;
    
    const startDate = dataInicial ? new Date(dataInicial) : null;
    const endDate = dataFinal ? new Date(dataFinal) : null;
    
    if (startDate && endDate) {
      endDate.setHours(23, 59, 59, 999);
      return solDate >= startDate && solDate <= endDate;
    } else if (startDate) {
      return solDate >= startDate;
    } else if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      return solDate <= endDate;
    }
    
    return true;
  });

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

  const clearFilters = () => {
    setDataInicial('');
    setDataFinal('');
  };

  const handleDeliver = async (sol: Solicitacao) => {
    if (!user?.email) return;
    
    const confirmDeliver = window.confirm(`Confirma a entrega de ${sol.quantidade} unidade(s) de ${sol.material}? Isso dará baixa no estoque.`);
    if (!confirmDeliver) return;
    
    setDelivering(sol.id);
    try {
      const response = await api.movimentarEstoque(user.email, 'saida', [{
        codigo: sol.codigo,
        quantidade: String(sol.quantidade),
        obs: `Entrega solicitação #${sol.id} - ${sol.setor}`
      }]);
      
      if (response.ok) {
        toast({
          title: 'Sucesso!',
          description: 'Material entregue e baixa realizada no estoque.',
        });
        fetchSolicitacoes();
      } else {
        toast({
          title: 'Erro',
          description: response.msg || 'Erro ao registrar entrega.',
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
      setDelivering(null);
    }
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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/50 rounded-lg">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-xs">Data Inicial</Label>
              <Input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Final</Label>
              <Input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {(dataInicial || dataFinal) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredSolicitacoes.length === 0 ? (
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
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSolicitacoes.map((sol, index) => (
                    <TableRow key={sol.id || index}>
                      <TableCell className="font-mono">{sol.id}</TableCell>
                      <TableCell>{sol.data}</TableCell>
                      <TableCell>{sol.email_usuario}</TableCell>
                      <TableCell>{sol.setor}</TableCell>
                      <TableCell>{sol.codigo}</TableCell>
                      <TableCell>{sol.material}</TableCell>
                      <TableCell>{sol.quantidade}</TableCell>
                      <TableCell>{getStatusBadge(sol.status)}</TableCell>
                      <TableCell>{sol.obs || '-'}</TableCell>
                      <TableCell>
                        {sol.status.toLowerCase().includes('pendente') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeliver(sol)}
                            disabled={delivering === sol.id}
                            className="gap-1"
                          >
                            <PackageCheck className="w-4 h-4" />
                            {delivering === sol.id ? 'Entregando...' : 'Entregar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredSolicitacoes.length} de {solicitacoes.length} solicitações
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ListarSolicitacoes;
