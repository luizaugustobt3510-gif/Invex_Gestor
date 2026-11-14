import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Star, Trophy, Edit2, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dbErrorMessage } from '@/lib/dbErrors';
import { useVendasCatalog, brl, fmtDate, type Customer } from './useVendasCatalog';
import { CustomerFormDialog } from './CustomerFormDialog';
import { customerScore, scoreLabel, CONSUMIDOR_NAO_IDENTIFICADO } from './vendasCalc';

interface Evaluation { id: string; customer_id: string; nota: number; pontualidade: number; comentario: string | null; created_at: string }
interface SaleRow { id: string; customer_id: string | null; cliente_nome: string; valor_total: number; created_at: string; forma_pagamento: string }

const scoreVariant = (s: number): 'default' | 'secondary' | 'outline' | 'destructive' =>
  s >= 0.85 ? 'default' : s >= 0.7 ? 'secondary' : s >= 0.5 ? 'outline' : 'destructive';

export default function Compradores() {
  const { companyId, customers, load } = useVendasCatalog();
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [aberto, setAberto] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [evalCustomer, setEvalCustomer] = useState<Customer | null>(null);
  const [evalNota, setEvalNota] = useState(8);
  const [evalPont, setEvalPont] = useState(8);
  const [evalComentario, setEvalComentario] = useState('');
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [pesos, setPesos] = useState({ faturamento: 0.4, frequencia: 0.3, avaliacao: 0.3 });
  const [segmento, setSegmento] = useState('all');

  const loadExtra = async () => {
    if (!companyId) return;
    const [e, s, f] = await Promise.all([
      supabase.from('customer_evaluations').select('id, customer_id, nota, pontualidade, comentario, created_at').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('sales').select('id, customer_id, cliente_nome, valor_total, created_at, forma_pagamento').eq('company_id', companyId).eq('status', 'finalizada'),
      // Em aberto a receber (só aparece para quem também vê o Financeiro)
      supabase.from('financial_entries').select('origem_id, valor').eq('company_id', companyId).eq('origem', 'vendas').eq('status', 'pendente'),
    ]);
    setEvals(((e.data ?? []) as Evaluation[]).map((x) => ({ ...x, nota: Number(x.nota), pontualidade: Number(x.pontualidade) })));
    const rows = ((s.data ?? []) as SaleRow[]).map((x) => ({ ...x, valor_total: Number(x.valor_total) }));
    setSales(rows);
    const saleCustomer = new Map(rows.map((r) => [r.id, r.customer_id]));
    const ab: Record<string, number> = {};
    (f.data ?? []).forEach((x: { origem_id: string | null; valor: number }) => {
      const cid = x.origem_id ? saleCustomer.get(x.origem_id) : null;
      if (cid) ab[cid] = (ab[cid] ?? 0) + Number(x.valor);
    });
    setAberto(ab);
  };
  useEffect(() => { loadExtra(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId]);

  const stats = useMemo(() => {
    const r: Record<string, { faturamento: number; compras: number; ultima: string | null; avaliacao: number; pontualidade: number; nAval: number }> = {};
    customers.forEach((c) => {
      const ev = evals.filter((e) => e.customer_id === c.id);
      const avg = (k: 'nota' | 'pontualidade') => (ev.length ? ev.reduce((s, x) => s + x[k], 0) / ev.length : c.nota);
      r[c.id] = { faturamento: 0, compras: 0, ultima: null, avaliacao: avg('nota'), pontualidade: avg('pontualidade'), nAval: ev.length };
    });
    sales.forEach((s) => {
      const st = s.customer_id ? r[s.customer_id] : null;
      if (!st) return;
      st.faturamento += s.valor_total; st.compras += 1;
      if (!st.ultima || s.created_at > st.ultima) st.ultima = s.created_at;
    });
    return r;
  }, [customers, evals, sales]);

  const naoIdentificado = useMemo(() => {
    const ss = sales.filter((s) => !s.customer_id && (!s.cliente_nome || s.cliente_nome === CONSUMIDOR_NAO_IDENTIFICADO));
    return { compras: ss.length, faturamento: ss.reduce((t, s) => t + s.valor_total, 0) };
  }, [sales]);

  const segmentos = useMemo(() => [...new Set(customers.map((c) => c.segmento).filter(Boolean))].sort(), [customers]);

  const lista = customers.filter((c) => {
    const t = busca.toLowerCase();
    return !t || c.nome.toLowerCase().includes(t) || (c.documento ?? '').includes(t) || (c.segmento ?? '').toLowerCase().includes(t);
  });

  const ranking = useMemo(() => {
    const base = customers.filter((c) => c.ativo && (segmento === 'all' || c.segmento === segmento));
    const max = {
      faturamento: Math.max(0, ...base.map((c) => stats[c.id]?.faturamento ?? 0)),
      compras: Math.max(0, ...base.map((c) => stats[c.id]?.compras ?? 0)),
    };
    return base
      .map((c) => ({ c, st: stats[c.id], score: customerScore(stats[c.id] ?? { faturamento: 0, compras: 0, avaliacao: 0, pontualidade: 0 }, max, pesos) }))
      .sort((a, b) => b.score - a.score);
  }, [customers, stats, pesos, segmento]);

  const addEval = async () => {
    if (!evalCustomer || !companyId) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('customer_evaluations').insert({
      company_id: companyId, customer_id: evalCustomer.id, nota: evalNota, pontualidade: evalPont,
      comentario: evalComentario.trim() || null, avaliador_id: auth.user?.id ?? null,
    });
    if (error) { toast.error(dbErrorMessage(error, 'Não foi possível registrar a avaliação')); return; }
    toast.success('Avaliação registrada');
    setEvalComentario(''); setEvalNota(8); setEvalPont(8);
    loadExtra();
  };

  const removeEval = async (id: string) => {
    const { error } = await supabase.from('customer_evaluations').delete().eq('id', id);
    if (error) { toast.error(dbErrorMessage(error, 'Não foi possível excluir')); return; }
    setEvals((p) => p.filter((e) => e.id !== id));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('customers').delete().eq('id', deleting.id);
    if (error) { toast.error(dbErrorMessage(error, 'Não foi possível excluir o comprador')); return; }
    toast.success('Comprador excluído. As vendas dele continuam no histórico.');
    setDeleting(null);
    load();
  };

  const setPeso = (k: keyof typeof pesos, v: number) => setPesos((p) => ({ ...p, [k]: v }));

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Compradores</h1>
          <p className="text-sm text-muted-foreground">Cadastro, avaliação e ranking de quem compra da empresa.</p>
        </div>

        <Tabs defaultValue="cadastro" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="analise">Análise de compradores</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="relative sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10 text-base md:text-sm" placeholder="Buscar por nome, documento ou tipo" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Novo comprador</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Prazo</TableHead>
                        <TableHead className="text-right">Comprado</TableHead>
                        <TableHead className="text-right">Em aberto</TableHead>
                        <TableHead className="text-center">Avaliação</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/40">
                        <TableCell className="font-medium">{CONSUMIDOR_NAO_IDENTIFICADO}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell><Badge variant="outline">Balcão</Badge></TableCell>
                        <TableCell className="text-right">à vista</TableCell>
                        <TableCell className="text-right">{brl(naoIdentificado.faturamento)}<span className="block text-xs text-muted-foreground">{naoIdentificado.compras} venda(s)</span></TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-center text-muted-foreground">—</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">Padrão do PDV</TableCell>
                      </TableRow>
                      {lista.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum comprador cadastrado</TableCell></TableRow>
                      ) : lista.map((c) => {
                        const st = stats[c.id];
                        return (
                          <TableRow key={c.id} className={c.ativo ? '' : 'opacity-60'}>
                            <TableCell className="font-medium">
                              {c.nome}
                              {!c.ativo && <Badge variant="outline" className="ml-2 text-[10px]">Inativo</Badge>}
                              {c.telefone && <span className="block text-xs text-muted-foreground">{c.telefone}</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{c.documento || '—'}</TableCell>
                            <TableCell>{c.segmento ? <Badge variant="outline">{c.segmento}</Badge> : '—'}</TableCell>
                            <TableCell className="text-right">{c.prazo_pagamento_dias ? `${c.prazo_pagamento_dias} dias` : 'à vista'}</TableCell>
                            <TableCell className="text-right">{brl(st?.faturamento ?? 0)}<span className="block text-xs text-muted-foreground">{st?.compras ?? 0} venda(s){st?.ultima ? ` · última ${fmtDate(st.ultima)}` : ''}</span></TableCell>
                            <TableCell className={`text-right ${aberto[c.id] ? 'text-destructive font-medium' : ''}`}>
                              {aberto[c.id] ? brl(aberto[c.id]) : '—'}
                              {c.limite_credito > 0 && <span className="block text-xs text-muted-foreground">limite {brl(c.limite_credito)}</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" onClick={() => setEvalCustomer(c)} aria-label={`Avaliações de ${c.nome}`}>
                                <Star className="w-3.5 h-3.5 mr-1 fill-primary text-primary" /> {(st?.avaliacao ?? c.nota).toFixed(1)}
                                <span className="text-xs text-muted-foreground ml-1">({st?.nAval ?? 0})</span>
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditing(c); setFormOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analise" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Filtrar por tipo de comprador</CardTitle></CardHeader>
                <CardContent>
                  <Select value={segmento} onValueChange={(v) => v && setSegmento(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {segmentos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pesos da análise</CardTitle>
                  <CardDescription className="text-xs">Quanto vale cada critério na pontuação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Valor comprado: {(pesos.faturamento * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[pesos.faturamento]} onValueChange={(v) => setPeso('faturamento', v[0])} /></div>
                  <div><Label className="text-xs">Frequência de compra: {(pesos.frequencia * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[pesos.frequencia]} onValueChange={(v) => setPeso('frequencia', v[0])} /></div>
                  <div><Label className="text-xs">Avaliação e pontualidade: {(pesos.avaliacao * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[pesos.avaliacao]} onValueChange={(v) => setPeso('avaliacao', v[0])} /></div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Ranking de compradores</CardTitle>
                <CardDescription>{ranking.length} comprador(es) ativo(s)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead className="text-right">Comprado</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Avaliação</TableHead>
                        <TableHead className="text-right">Pontualidade</TableHead>
                        <TableHead className="text-right">Pontuação</TableHead>
                        <TableHead className="text-center">Classificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ranking.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum comprador para analisar</TableCell></TableRow>
                      ) : ranking.map(({ c, st, score }, i) => (
                        <TableRow key={c.id} className={i === 0 ? 'bg-primary/5 border-l-4 border-l-primary' : ''}>
                          <TableCell className="text-center font-bold">{i === 0 ? <Trophy className="w-5 h-5 text-primary mx-auto" /> : i + 1}</TableCell>
                          <TableCell className="font-medium">{c.nome}{c.segmento && <span className="block text-xs text-muted-foreground">{c.segmento}</span>}</TableCell>
                          <TableCell className="text-right">{brl(st?.faturamento ?? 0)}</TableCell>
                          <TableCell className="text-right">{st?.compras ?? 0}</TableCell>
                          <TableCell className="text-right">{(st?.avaliacao ?? 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{(st?.pontualidade ?? 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right font-semibold">{(score * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-center"><Badge variant={scoreVariant(score)}>{scoreLabel(score)}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {companyId && (
        <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} companyId={companyId} customer={editing} onSaved={() => load()} />
      )}

      <Dialog open={!!evalCustomer} onOpenChange={(o) => !o && setEvalCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Avaliações — {evalCustomer?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nota geral (0-10): {evalNota}</Label>
              <Slider min={0} max={10} step={0.5} value={[evalNota]} onValueChange={(v) => setEvalNota(v[0])} />
              <Label>Pontualidade no pagamento (0-10): {evalPont}</Label>
              <Slider min={0} max={10} step={0.5} value={[evalPont]} onValueChange={(v) => setEvalPont(v[0])} />
              <Input className="text-base md:text-sm" value={evalComentario} onChange={(e) => setEvalComentario(e.target.value)} placeholder="Comentário (opcional)" />
              <Button size="sm" onClick={addEval}>Registrar avaliação</Button>
            </div>
            {evalCustomer && evals.some((e) => e.customer_id === evalCustomer.id) && (
              <div className="border-t pt-3 space-y-2 max-h-56 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground">Histórico</p>
                {evals.filter((e) => e.customer_id === evalCustomer.id).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm border-b pb-1">
                    <span className="flex items-center gap-1 w-24"><Star className="w-3 h-3 text-primary" /> {ev.nota.toFixed(1)} · {ev.pontualidade.toFixed(1)}</span>
                    <span className="flex-1 text-muted-foreground text-xs truncate">{ev.comentario || '—'}</span>
                    <span className="text-muted-foreground text-xs">{fmtDate(ev.created_at)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Excluir avaliação" onClick={() => removeEval(ev.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>O cadastro e as avaliações serão apagados de vez. As vendas já feitas continuam no histórico com o nome do comprador. Para só esconder do PDV, edite e desmarque "Ativo".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
