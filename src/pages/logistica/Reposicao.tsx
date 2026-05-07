import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventoryData } from '@/hooks/useInventoryData';
import { useCurvaABCData } from '@/hooks/useCurvaABCData';
import { Search, ShoppingCart, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type FilterStatus = 'todos' | 'criticos' | 'sugeridos';
type FilterCurva = 'todas' | 'A' | 'B' | 'C';

const classeBadge = (c: string) => {
  if (c === 'A') return 'bg-red-100 text-red-800 border-red-300';
  if (c === 'B') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (c === 'C') return 'bg-green-100 text-green-800 border-green-300';
  return '';
};

export default function Reposicao() {
  const navigate = useNavigate();
  const { data: inventory, loading, refetch } = useInventoryData();
  const { results: abcResults } = useCurvaABCData();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [filterCurva, setFilterCurva] = useState<FilterCurva>('todas');
  const [selected, setSelected] = useState<Record<string, { qtd: number; checked: boolean }>>({});

  const abcMap = useMemo(() => {
    const m = new Map<string, { compraSugerida: number; classe: string; consumoMensal: number }>();
    abcResults.forEach((r: any) => m.set(String(r.material).toUpperCase().trim(), {
      compraSugerida: Number(r.compraSugerida) || 0,
      classe: r.classe,
      consumoMensal: Number(r.consumoMensal) || 0,
    }));
    return m;
  }, [abcResults]);

  const items = useMemo(() => {
    return inventory.map(i => {
      const abc = abcMap.get(i.material.toUpperCase().trim());
      const sugerido = abc?.compraSugerida || Math.max((i.minimo || 0) * 2 - i.quantidade, 0);
      return {
        ...i,
        sugerido: Math.max(0, Math.ceil(sugerido)),
        classe: abc?.classe || i.curva || '-',
        consumoMensal: abc?.consumoMensal || 0,
      };
    });
  }, [inventory, abcMap]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (filterStatus === 'criticos' && it.status !== 'Zerado' && it.status !== 'Abaixo do Mínimo') return false;
      if (filterStatus === 'sugeridos' && it.sugerido <= 0) return false;
      if (filterCurva !== 'todas' && it.classe !== filterCurva) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!String(it.codigo).toLowerCase().includes(s) && !String(it.material).toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterCurva, search]);

  const allSelected = filtered.length > 0 && filtered.every(it => selected[it.codigo]?.checked);

  const toggleAll = (checked: boolean) => {
    setSelected(prev => {
      const next = { ...prev };
      filtered.forEach(it => {
        next[it.codigo] = { qtd: prev[it.codigo]?.qtd ?? it.sugerido, checked };
      });
      return next;
    });
  };

  const toggleOne = (codigo: string, sugerido: number, checked: boolean) => {
    setSelected(prev => ({ ...prev, [codigo]: { qtd: prev[codigo]?.qtd ?? sugerido, checked } }));
  };

  const updateQtd = (codigo: string, qtd: number, sugerido: number) => {
    setSelected(prev => ({ ...prev, [codigo]: { qtd, checked: prev[codigo]?.checked ?? false } }));
  };

  const generateOC = () => {
    const chosen = filtered
      .filter(it => selected[it.codigo]?.checked)
      .map(it => ({
        codigo: String(it.codigo),
        material: String(it.material),
        unidade: String(it.unidade || ''),
        quantidade: String(selected[it.codigo].qtd || it.sugerido),
        preco: String(it.preco || 0),
      }));
    if (chosen.length === 0) {
      toast.error('Selecione ao menos um item');
      return;
    }
    navigate('/gerar-oc', { state: { prefilledItems: chosen } });
  };

  const totalSelecionados = filtered.filter(it => selected[it.codigo]?.checked).length;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" /> Reposição de Estoque
            </h1>
            <p className="text-sm text-muted-foreground">
              Sugestões de compra com base na Curva ABC e nos níveis de estoque.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button onClick={generateOC} className="gap-2" disabled={totalSelecionados === 0}>
              <ShoppingCart className="w-4 h-4" /> Gerar OC ({totalSelecionados})
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou material..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os itens</SelectItem>
                  <SelectItem value="criticos">Apenas críticos</SelectItem>
                  <SelectItem value="sugeridos">Com sugestão de compra</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCurva} onValueChange={(v) => setFilterCurva(v as FilterCurva)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as curvas</SelectItem>
                  <SelectItem value="A">Curva A</SelectItem>
                  <SelectItem value="B">Curva B</SelectItem>
                  <SelectItem value="C">Curva C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Curva</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mín</TableHead>
                    <TableHead className="text-right">Consumo/mês</TableHead>
                    <TableHead className="text-right">Sugerido</TableHead>
                    <TableHead className="text-right">Qtd a Comprar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
                  ) : filtered.map(it => {
                    const sel = selected[it.codigo];
                    return (
                      <TableRow key={it.codigo}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={!!sel?.checked}
                            onChange={(e) => toggleOne(it.codigo, it.sugerido, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                        <TableCell>{it.material}</TableCell>
                        <TableCell><Badge variant="outline" className={classeBadge(it.classe)}>{it.classe}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={it.status === 'Zerado' ? 'destructive' : it.status === 'Abaixo do Mínimo' ? 'outline' : 'secondary'}>
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{it.quantidade}</TableCell>
                        <TableCell className="text-right">{it.minimo}</TableCell>
                        <TableCell className="text-right">{it.consumoMensal || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{it.sugerido}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={sel?.qtd ?? it.sugerido}
                            onChange={(e) => updateQtd(it.codigo, Number(e.target.value) || 0, it.sugerido)}
                            className="w-20 ml-auto h-8"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
