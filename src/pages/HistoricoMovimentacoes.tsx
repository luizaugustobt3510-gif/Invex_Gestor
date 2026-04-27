import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, RefreshCw, Filter, QrCode, Printer } from 'lucide-react';
import { printList } from '@/lib/printUtils';

interface Movement {
  id: string;
  created_at: string;
  tipo: string;
  quantidade: number;
  obs: string | null;
  material_id: string;
  user_id?: string | null;
  material_codigo?: string;
  material_nome?: string;
  user_nome?: string;
}

const isQrMovement = (m: Movement) => (m.obs || '').toLowerCase().includes('qr code');

const HistoricoMovimentacoes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .not('company_id', 'is', null)
        .limit(1)
        .single();

      if (!roleData?.company_id) return;

      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('company_id', roleData.company_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const materialIds = [...new Set((data || []).map(m => m.material_id))];
      const userIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean) as string[])];

      const [{ data: materials }, { data: profiles }] = await Promise.all([
        supabase.from('materials').select('id, codigo, material').in('id', materialIds),
        userIds.length
          ? supabase.from('profiles').select('user_id, nome, email').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const matMap = new Map((materials || []).map(m => [m.id, m]));
      const userMap = new Map((profiles || []).map((p: any) => [p.user_id, p.nome || p.email]));

      const enriched: Movement[] = (data || []).map(m => ({
        ...m,
        material_codigo: matMap.get(m.material_id)?.codigo || '?',
        material_nome: matMap.get(m.material_id)?.material || '?',
        user_nome: m.user_id ? (userMap.get(m.user_id) || '—') : '—',
      }));

      setMovements(enriched);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar histórico.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMovements(); }, []);

  const applyFilters = (list: Movement[]) => list.filter(m => {
    if (tipoFilter !== 'todos' && m.tipo !== tipoFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!m.material_codigo?.toLowerCase().includes(s) && !m.material_nome?.toLowerCase().includes(s)) return false;
    }
    if (dataInicial && new Date(m.created_at) < new Date(dataInicial)) return false;
    if (dataFinal && new Date(m.created_at) > new Date(dataFinal + 'T23:59:59')) return false;
    return true;
  });

  const filteredAll = useMemo(() => applyFilters(movements), [movements, tipoFilter, searchTerm, dataInicial, dataFinal]);
  const filteredQr = useMemo(() => filteredAll.filter(isQrMovement), [filteredAll]);

  const renderTable = (rows: Movement[], showUser: boolean) => {
    if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
    if (rows.length === 0) return <div className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada.</div>;
    return (
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Qtd</TableHead>
              {showUser && <TableHead>Usuário</TableHead>}
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-sm">{new Date(m.created_at).toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge variant={m.tipo === 'entrada' ? 'default' : 'destructive'}>
                    {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{m.material_codigo}</TableCell>
                <TableCell>{m.material_nome}</TableCell>
                <TableCell className="font-semibold">{m.quantidade}</TableCell>
                {showUser && <TableCell className="text-sm">{m.user_nome}</TableCell>}
                <TableCell className="max-w-[200px] truncate">{m.obs || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <MainLayout>
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Movimentações
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMovements} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/50 rounded-lg">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-xs">Buscar</Label>
              <Input placeholder="Código ou material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-[180px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="w-[150px]" />
            </div>
          </div>

          <Tabs defaultValue="todas" className="w-full">
            <TabsList>
              <TabsTrigger value="todas" className="gap-2">
                <History className="w-4 h-4" /> Todas ({filteredAll.length})
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="w-4 h-4" /> Itens Escaneados ({filteredQr.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="space-y-2">
              {renderTable(filteredAll, false)}
              <div className="text-sm text-muted-foreground">
                Exibindo {filteredAll.length} de {movements.length} movimentações
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-2">
              {renderTable(filteredQr, true)}
              <div className="text-sm text-muted-foreground">
                Exibindo {filteredQr.length} alterações via QR Code
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default HistoricoMovimentacoes;
