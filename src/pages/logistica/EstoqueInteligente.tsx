import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useInventoryData } from '@/hooks/useInventoryData';
import { useCurvaABCData } from '@/hooks/useCurvaABCData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Target, Search, Save, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuggestRow {
  id: string;
  codigo: string;
  material: string;
  classe: string;
  consumoMensal: number;
  estoqueAtual: number;
  minimoAtual: number;
  maximoAtual: number;
  minimoSugerido: number;
  maximoSugerido: number;
}

const classeBadge = (c: string) => ({
  A: 'bg-red-100 text-red-800 border-red-300',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  C: 'bg-green-100 text-green-800 border-green-300',
}[c] || 'bg-muted');

// Cobertura em dias por curva (mín = lead time; máx = mín + buffer)
const coverageByClass = (classe: string) => {
  switch (classe) {
    case 'A': return { minDays: 20, maxDays: 60 };  // alto valor → estoque maior
    case 'B': return { minDays: 15, maxDays: 45 };
    case 'C': return { minDays: 10, maxDays: 30 };
    default:  return { minDays: 15, maxDays: 45 };
  }
};

const EstoqueInteligente = () => {
  const navigate = useNavigate();
  const { data: inventory, loading, refetch } = useInventoryData();
  const { results: abcResults } = useCurvaABCData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const abcMap = useMemo(() => {
    const m = new Map<string, { classe: string; consumoMensal: number }>();
    abcResults.forEach(r => m.set(String(r.material).toUpperCase().trim(), { classe: r.classe, consumoMensal: r.consumoMensal }));
    return m;
  }, [abcResults]);

  const rows: SuggestRow[] = useMemo(() => {
    return inventory.map(it => {
      const abc = abcMap.get(String(it.material).toUpperCase().trim());
      const classe = abc?.classe || it.curva || 'C';
      const consumoMensal = abc?.consumoMensal || 0;
      const cov = coverageByClass(classe);
      const consumoDiario = consumoMensal / 30;
      const minimoSugerido = Math.max(0, Math.ceil(consumoDiario * cov.minDays));
      const maximoSugerido = Math.max(minimoSugerido, Math.ceil(consumoDiario * cov.maxDays));
      return {
        id: it.id,
        codigo: it.codigo,
        material: it.material,
        classe,
        consumoMensal,
        estoqueAtual: it.quantidade,
        minimoAtual: it.minimo || 0,
        maximoAtual: it.maximo || 0,
        minimoSugerido,
        maximoSugerido,
      };
    });
  }, [inventory, abcMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      r.material.toLowerCase().includes(q) || String(r.codigo).toLowerCase().includes(q)
    );
  }, [rows, search]);

  const itemsWithSuggestion = filtered.filter(r => r.consumoMensal > 0);
  const allSelectedIds = itemsWithSuggestion.map(r => r.id);
  const selectedIds = allSelectedIds.filter(id => selected[id]);
  const allChecked = allSelectedIds.length > 0 && selectedIds.length === allSelectedIds.length;

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) allSelectedIds.forEach(id => { next[id] = true; });
    setSelected(next);
  };

  const apply = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.error('Selecione ao menos um material com consumo registrado.');
      return;
    }
    setSaving(true);
    try {
      const targets = rows.filter(r => ids.includes(r.id) && r.consumoMensal > 0);
      let ok = 0;
      for (const r of targets) {
        const { error } = await supabase
          .from('materials')
          .update({ minimo: r.minimoSugerido, maximo: r.maximoSugerido })
          .eq('id', r.id);
        if (!error) ok++;
      }
      toast.success(`${ok} material(is) atualizado(s) com mín/máx inteligente.`);
      setSelected({});
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao aplicar mín/máx.');
    } finally {
      setSaving(false);
    }
  };

  const noAbc = abcResults.length === 0;

  return (
    <MainLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Estoque Mín/Máx Inteligente
            </CardTitle>
            <CardDescription>
              Calcula estoque mínimo e máximo automaticamente com base no consumo médio mensal e na classificação da Curva ABC.
              Curva A → maior cobertura, C → menor cobertura.
            </CardDescription>
          </CardHeader>
        </Card>

        {noAbc && (
          <Alert className="border-warning/40 bg-warning/5 cursor-pointer" onClick={() => navigate('/curva-abc')}>
            <TrendingUp className="w-4 h-4" />
            <AlertTitle>Curva ABC não configurada</AlertTitle>
            <AlertDescription>
              Configure a Curva ABC Inteligente para que as sugestões de mín/máx sejam calculadas automaticamente.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <CardTitle className="text-base">Sugestões ({itemsWithSuggestion.length} com consumo)</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
              <Button size="sm" onClick={() => apply(selectedIds)} disabled={saving || selectedIds.length === 0}>
                <Save className="w-4 h-4 mr-1" />
                Aplicar selecionados ({selectedIds.length})
              </Button>
              <Button size="sm" variant="default" onClick={() => apply(allSelectedIds)} disabled={saving || allSelectedIds.length === 0}>
                Aplicar a todos ({allSelectedIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por código ou material..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Nenhum material encontrado.</div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} />
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-center">Curva</TableHead>
                      <TableHead className="text-right">Consumo/Mês</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Mín Atual</TableHead>
                      <TableHead className="text-right">Máx Atual</TableHead>
                      <TableHead className="text-right text-primary">Mín Sugerido</TableHead>
                      <TableHead className="text-right text-primary">Máx Sugerido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const noConsumption = r.consumoMensal <= 0;
                      return (
                        <TableRow key={r.id} className={noConsumption ? 'opacity-60' : ''}>
                          <TableCell>
                            <Checkbox
                              disabled={noConsumption}
                              checked={!!selected[r.id]}
                              onCheckedChange={(v) => setSelected(s => ({ ...s, [r.id]: !!v }))}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                          <TableCell className="font-medium max-w-[240px] truncate" title={r.material}>{r.material}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={classeBadge(r.classe)}>{r.classe}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.consumoMensal.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">{r.estoqueAtual}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{r.minimoAtual}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{r.maximoAtual}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {noConsumption ? <span className="text-muted-foreground">—</span> : r.minimoSugerido}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {noConsumption ? <span className="text-muted-foreground">—</span> : r.maximoSugerido}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-xs text-muted-foreground flex items-start gap-2 pt-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
              Itens sem consumo registrado na Curva ABC não recebem sugestão automática.
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default EstoqueInteligente;
