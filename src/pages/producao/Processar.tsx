import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Factory, ShoppingCart, PackagePlus, ClipboardList } from 'lucide-react';
import { rendimento, custoConsumo, custoUnitario, desvioFicha, producaoEsperada } from './producaoCalc';
import { useProducaoData, fmtDT, fmtD, brl, parseNum } from './useProducaoData';
import { dbErrorMessage } from '@/lib/dbErrors';

const addDays = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
};

export default function Processar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { mats, entries, orders, recipes, matById, entryById, load } = useProducaoData();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ prodId: string; nome: string } | null>(null);

  const [entryId, setEntryId] = useState('');
  const [prodId, setProdId] = useState('');
  const [consumo, setConsumo] = useState('');
  const [produzido, setProduzido] = useState('');
  const [loteProd, setLoteProd] = useState('');
  const [obsProd, setObsProd] = useState('');
  const [validade, setValidade] = useState('');

  const abertos = useMemo(() => entries.filter((e) => e.quantidade_restante > 0), [entries]);
  const selEntry = entryById[entryId];

  const preApplied = useRef(false);
  useEffect(() => {
    if (preApplied.current || abertos.length === 0) return;
    preApplied.current = true;
    const pre = params.get('entry');
    const preMat = params.get('material');
    if (pre && abertos.some((e) => e.id === pre)) setEntryId(pre);
    else if (preMat) {
      const first = abertos.find((e) => e.material_id === preMat);
      if (first) setEntryId(first.id);
    }
  }, [params, abertos]);

  const produtosFinais = useMemo(() => mats.filter((m) => m.tipo === 'produto_final' && m.id !== selEntry?.material_id), [mats, selEntry]);
  const outros = useMemo(() => mats.filter((m) => m.tipo !== 'produto_final' && m.id !== selEntry?.material_id), [mats, selEntry]);

  const ficha = useMemo(
    () => recipes.find((r) => r.produto_material_id === prodId && r.materia_prima_id === selEntry?.material_id),
    [recipes, prodId, selEntry],
  );

  useEffect(() => {
    if (ficha?.validade_dias && !validade) setValidade(addDays(ficha.validade_dias));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficha]);

  const nConsumo = parseNum(consumo) ?? 0;
  const nProduzido = parseNum(produzido) ?? 0;
  const rend = rendimento(nConsumo, nProduzido);
  const custo = selEntry ? custoConsumo(selEntry.custo_total, selEntry.quantidade, nConsumo) : 0;
  const esperado = ficha ? producaoEsperada(nConsumo, ficha.rendimento_esperado) : 0;

  const salvar = async () => {
    if (!entryId || !prodId || !(nConsumo > 0)) { toast.error('Escolha o lote, o produto e a quantidade consumida'); return; }
    if (selEntry && nConsumo > selEntry.quantidade_restante) { toast.error(`O lote só tem ${selEntry.quantidade_restante} disponível`); return; }
    setSaving(true);
    const { error } = await supabase.rpc('register_production', {
      _entry_id: entryId, _produto_material_id: prodId, _quantidade_consumida: nConsumo,
      _quantidade_produzida: nProduzido, _lote_produto: loteProd, _observacoes: obsProd,
      _validade: (validade || null) as string,
    });
    setSaving(false);
    if (error) { toast.error(dbErrorMessage(error, 'Erro ao registrar produção')); return; }
    toast.success('Produção registrada: matéria-prima baixada e produto no estoque');
    setDone({ prodId, nome: matById[prodId]?.material ?? '' });
    setConsumo(''); setProduzido(''); setLoteProd(''); setObsProd(''); setValidade(''); setEntryId('');
    load();
  };

  return (
    <MainLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Factory className="w-6 h-6 text-primary" /> Processar</h1>
            <p className="text-muted-foreground text-sm">Baixa do lote de matéria-prima e entrada do produto final no estoque, pronto para venda.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/logistica/entrada-materia-prima')}><PackagePlus className="w-4 h-4 mr-1" /> Nova entrada de matéria-prima</Button>
        </div>

        {done && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-sm font-medium">{done.nome} já está no estoque e disponível no PDV.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate(`/vendas/pdv?material=${done.prodId}`)}><ShoppingCart className="w-4 h-4 mr-1" /> Vender no PDV</Button>
                <Button size="sm" variant="outline" onClick={() => setDone(null)}>Fechar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transformar em produto final</CardTitle>
            <CardDescription>Escolha o lote, o produto e informe quanto foi usado e quanto rendeu.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Lote de matéria-prima *</Label>
              <Select value={entryId} onValueChange={(v) => { if (v) { setEntryId(v); setProdId(''); } }}>
                <SelectTrigger><SelectValue placeholder={abertos.length ? 'Selecione' : 'Nenhum lote com saldo'} /></SelectTrigger>
                <SelectContent>
                  {abertos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.numero_controle} · {matById[e.material_id]?.material} · lote {e.lote || '-'} (saldo {e.quantidade_restante})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selEntry && (
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo do lote: {selEntry.quantidade_restante} {matById[selEntry.material_id]?.unidade} · procedência {selEntry.procedencia || '-'} · validade {fmtD(selEntry.validade)}
                </p>
              )}
            </div>
            <div><Label>Produto final *</Label>
              <Select value={prodId} onValueChange={(v) => v && setProdId(v)} disabled={!selEntry}>
                <SelectTrigger><SelectValue placeholder={selEntry ? 'Selecione' : 'Escolha o lote primeiro'} /></SelectTrigger>
                <SelectContent>
                  {produtosFinais.length > 0 && (
                    <SelectGroup><SelectLabel>Produtos finais</SelectLabel>
                      {produtosFinais.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material} ({m.quantidade} {m.unidade})</SelectItem>)}
                    </SelectGroup>
                  )}
                  {outros.length > 0 && (
                    <SelectGroup><SelectLabel>Outros materiais (viram produto final)</SelectLabel>
                      {outros.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material} ({m.quantidade} {m.unidade})</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <button type="button" className="text-xs text-primary underline mt-1" onClick={() => navigate('/cadastrar-material?tipo=produto_final')}>Cadastrar novo produto final</button>
            </div>
            <div><Label>Quantidade consumida *</Label><Input inputMode="decimal" value={consumo} onChange={(e) => setConsumo(e.target.value)} /></div>
            <div><Label>Quantidade produzida *</Label><Input inputMode="decimal" value={produzido} onChange={(e) => setProduzido(e.target.value)} placeholder={esperado ? `Esperado pela ficha: ${esperado}` : ''} /></div>
            <div><Label>Lote do produto</Label><Input value={loteProd} onChange={(e) => setLoteProd(e.target.value)} placeholder="Automático se vazio" /></div>
            <div><Label>Validade do produto</Label><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Input value={obsProd} onChange={(e) => setObsProd(e.target.value)} /></div>
            {(nConsumo > 0 || ficha) && (
              <div className="md:col-span-2 flex flex-wrap gap-2 text-sm">
                {ficha && <Badge variant="outline"><ClipboardList className="w-3 h-3 mr-1" /> Ficha: rendimento esperado {ficha.rendimento_esperado}%</Badge>}
                {nConsumo > 0 && <Badge variant="secondary">Rendimento {rend.rendimento.toFixed(1)}%</Badge>}
                {nConsumo > 0 && <Badge variant={rend.perda > 0 ? 'destructive' : 'secondary'}>Perda {rend.perda} ({rend.perdaPct.toFixed(1)}%)</Badge>}
                {ficha && nConsumo > 0 && nProduzido > 0 && (
                  <Badge variant={desvioFicha(rend.rendimento, ficha.rendimento_esperado) < 0 ? 'destructive' : 'default'}>
                    {desvioFicha(rend.rendimento, ficha.rendimento_esperado) >= 0 ? '+' : ''}{desvioFicha(rend.rendimento, ficha.rendimento_esperado)} pontos vs ficha
                  </Badge>
                )}
                {custo > 0 && <Badge variant="outline">Custo matéria-prima {brl(custo)}</Badge>}
                {custo > 0 && nProduzido > 0 && <Badge variant="outline">Custo por unidade {brl(custoUnitario(custo, nProduzido))}</Badge>}
              </div>
            )}
            <div className="md:col-span-2 flex justify-end"><Button onClick={salvar} disabled={saving}>{saving ? 'Registrando...' : 'Registrar produção'}</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Últimas produções</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data/hora</TableHead><TableHead>Lote produto</TableHead><TableHead>Produto</TableHead>
                <TableHead>Origem</TableHead><TableHead>Consumido</TableHead><TableHead>Produzido</TableHead><TableHead>Rendimento</TableHead><TableHead>Custo/un.</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((o) => {
                  const e = entryById[o.entry_id];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-nowrap">{fmtDT(o.created_at)}</TableCell>
                      <TableCell>{o.lote_produto}</TableCell>
                      <TableCell>{matById[o.produto_material_id]?.material}</TableCell>
                      <TableCell>{e?.numero_controle} · {e ? matById[e.material_id]?.material : ''}</TableCell>
                      <TableCell>{o.quantidade_consumida}</TableCell>
                      <TableCell>{o.quantidade_produzida}</TableCell>
                      <TableCell>{rendimento(o.quantidade_consumida, o.quantidade_produzida).rendimento.toFixed(1)}%</TableCell>
                      <TableCell>{brl(custoUnitario(o.custo_materia_prima, o.quantidade_produzida))}</TableCell>
                    </TableRow>
                  );
                })}
                {!orders.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma produção ainda</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
