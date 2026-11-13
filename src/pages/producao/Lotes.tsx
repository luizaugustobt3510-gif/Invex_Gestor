import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PackageSearch, Search, Factory, ArrowRight } from 'lucide-react';
import { rendimento, custoUnitario } from './producaoCalc';
import { useProducaoData, fmtDT, fmtD, brl, ProdEntry } from './useProducaoData';
import { getValidadeInfo } from '@/lib/validade';

type Filtro = 'todos' | 'saldo' | 'usados' | 'validade';

export default function Lotes() {
  const navigate = useNavigate();
  const { entries, orders, matById, entryById } = useProducaoData();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [trace, setTrace] = useState<ProdEntry | null>(null);

  const match = (s: string | null | undefined) => (s ?? '').toLowerCase().includes(q.trim().toLowerCase());

  const entriesF = useMemo(() => entries.filter((e) => {
    if (filtro === 'saldo' && !(e.quantidade_restante > 0)) return false;
    if (filtro === 'usados' && e.quantidade_restante > 0) return false;
    if (filtro === 'validade') {
      const st = getValidadeInfo(e.validade ?? '').status;
      if (!(e.quantidade_restante > 0) || !['vencido', 'critico', 'atencao'].includes(st)) return false;
    }
    if (!q.trim()) return true;
    const prods = orders.filter((o) => o.entry_id === e.id);
    return match(e.numero_controle) || match(e.lote) || match(e.procedencia) || match(matById[e.material_id]?.material)
      || prods.some((o) => match(o.lote_produto) || match(matById[o.produto_material_id]?.material));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [entries, orders, filtro, q, matById]);

  const ordersF = useMemo(() => orders.filter((o) => {
    if (!q.trim()) return true;
    const e = entryById[o.entry_id];
    return match(o.lote_produto) || match(matById[o.produto_material_id]?.material) || match(e?.numero_controle) || match(e?.lote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [orders, q, entryById, matById]);

  const verFoto = async (path: string) => {
    const { data, error } = await supabase.storage.from('producao-fotos').createSignedUrl(path, 300);
    if (error || !data) { toast.error('Não foi possível abrir a foto'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const traceOrders = trace ? orders.filter((o) => o.entry_id === trace.id) : [];

  return (
    <MainLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackageSearch className="w-6 h-6 text-primary" /> Lotes e rastreio</h1>
          <p className="text-muted-foreground text-sm">Busque por nº de controle, lote, procedência ou produto. Clique em um lote para ver tudo o que foi feito com ele.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: MP-20261113-001, lote 45, Fazenda Boa Vista..." className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-1">
            {([['todos', 'Todos'], ['saldo', 'Com saldo'], ['usados', 'Usados'], ['validade', 'Validade próxima']] as [Filtro, string][]).map(([k, l]) => (
              <Button key={k} size="sm" variant={filtro === k ? 'default' : 'outline'} onClick={() => setFiltro(k)}>{l}</Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Lotes de matéria-prima ({entriesF.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data/hora</TableHead><TableHead>Controle</TableHead><TableHead>Material</TableHead><TableHead>Lote</TableHead>
                <TableHead>Procedência</TableHead><TableHead>Temp.</TableHead><TableHead>Boletim</TableHead><TableHead>FOP</TableHead>
                <TableHead>Validade</TableHead><TableHead>Qtd / saldo</TableHead><TableHead>Custo</TableHead><TableHead>Foto</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entriesF.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setTrace(e)}>
                    <TableCell className="whitespace-nowrap">{fmtDT(e.created_at)}</TableCell>
                    <TableCell className="font-medium text-primary">{e.numero_controle}</TableCell>
                    <TableCell>{matById[e.material_id]?.material}</TableCell>
                    <TableCell>{e.lote || '-'}</TableCell>
                    <TableCell>{e.procedencia || '-'}</TableCell>
                    <TableCell>{e.temperatura != null ? `${e.temperatura} °C` : '-'}</TableCell>
                    <TableCell>{e.boletim ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>{e.fop || '-'}</TableCell>
                    <TableCell>{fmtD(e.validade)}</TableCell>
                    <TableCell>{e.quantidade} / {e.quantidade_restante}</TableCell>
                    <TableCell>{brl(e.custo_total)}</TableCell>
                    <TableCell>{e.foto_path ? <Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); verFoto(e.foto_path!); }}>Ver</Button> : '-'}</TableCell>
                  </TableRow>
                ))}
                {!entriesF.length && <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Nenhum lote encontrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Produções — lote do produto ({ordersF.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data/hora</TableHead><TableHead>Lote produto</TableHead><TableHead>Produto</TableHead>
                <TableHead>Origem (controle MP)</TableHead><TableHead>Consumido</TableHead><TableHead>Produzido</TableHead>
                <TableHead>Rendimento</TableHead><TableHead>Validade</TableHead><TableHead>Custo/un.</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ordersF.map((o) => {
                  const e = entryById[o.entry_id];
                  return (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => e && setTrace(e)}>
                      <TableCell className="whitespace-nowrap">{fmtDT(o.created_at)}</TableCell>
                      <TableCell className="font-medium">{o.lote_produto}</TableCell>
                      <TableCell>{matById[o.produto_material_id]?.material}</TableCell>
                      <TableCell>{e?.numero_controle} · {e ? matById[e.material_id]?.material : ''} · lote {e?.lote || '-'}</TableCell>
                      <TableCell>{o.quantidade_consumida}</TableCell>
                      <TableCell>{o.quantidade_produzida}</TableCell>
                      <TableCell>{rendimento(o.quantidade_consumida, o.quantidade_produzida).rendimento.toFixed(1)}%</TableCell>
                      <TableCell>{fmtD(o.validade)}</TableCell>
                      <TableCell>{brl(custoUnitario(o.custo_materia_prima, o.quantidade_produzida))}</TableCell>
                    </TableRow>
                  );
                })}
                {!ordersF.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhuma produção encontrada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!trace} onOpenChange={(o) => !o && setTrace(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Rastreio do lote {trace?.numero_controle}</DialogTitle></DialogHeader>
          {trace && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                <p><span className="text-muted-foreground">Matéria-prima:</span> {matById[trace.material_id]?.material}</p>
                <p><span className="text-muted-foreground">Entrada:</span> {fmtDT(trace.created_at)}</p>
                <p><span className="text-muted-foreground">Lote fornecedor:</span> {trace.lote || '-'}</p>
                <p><span className="text-muted-foreground">Procedência:</span> {trace.procedencia || '-'}</p>
                <p><span className="text-muted-foreground">Temperatura:</span> {trace.temperatura != null ? `${trace.temperatura} °C` : '-'}</p>
                <p><span className="text-muted-foreground">Boletim / FOP:</span> {trace.boletim ? 'Sim' : 'Não'} / {trace.fop || '-'}</p>
                <p><span className="text-muted-foreground">Quantidade:</span> {trace.quantidade} (saldo {trace.quantidade_restante})</p>
                <p><span className="text-muted-foreground">Custo:</span> {brl(trace.custo_total)}</p>
                {trace.observacoes && <p className="col-span-2"><span className="text-muted-foreground">Obs.:</span> {trace.observacoes}</p>}
              </div>
              <div>
                <p className="font-semibold mb-2">O que foi produzido com este lote</p>
                {traceOrders.length === 0 && <p className="text-muted-foreground">Ainda não foi usado na produção.</p>}
                <div className="space-y-2">
                  {traceOrders.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 rounded-md border p-2">
                      <Badge variant="outline">{o.quantidade_consumida}</Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{o.quantidade_produzida} {matById[o.produto_material_id]?.unidade} de {matById[o.produto_material_id]?.material}</span>
                      <span className="text-muted-foreground ml-auto">lote {o.lote_produto} · {fmtDT(o.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {trace.quantidade_restante > 0 && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => navigate(`/producao/processar?entry=${trace.id}`)}><Factory className="w-4 h-4 mr-1" /> Processar o saldo</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
