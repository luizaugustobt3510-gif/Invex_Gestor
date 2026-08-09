import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Search, AlertTriangle, CalendarClock } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

type Props = { tipo: 'despesa' | 'receita' };

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ContasPagarReceber = ({ tipo }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('aberto');
  const [tab, setTab] = useState('todas');

  const isPagar = tipo === 'despesa';
  const title = isPagar ? 'Contas a Pagar' : 'Contas a Receber';

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).eq('tipo', tipo).order('data_vencimento', { ascending: true, nullsFirst: false }).limit(1000),
      supabase.from('financial_categories').select('*').eq('company_id', user.companyId),
    ]);
    setEntries(e || []);
    setCategories(c || []);
  };

  useEffect(() => { load(); }, [user?.companyId, tipo]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);
  const today = format(new Date(), 'yyyy-MM-dd');

  const dueDateOf = (e: any) => e.data_vencimento || e.data;
  const daysLeft = (e: any) => differenceInCalendarDays(parseISO(dueDateOf(e)), parseISO(today));

  const base = useMemo(() => entries.filter(e => e.status !== 'cancelado'), [entries]);

  const buckets = useMemo(() => {
    const abertas = base.filter(e => e.status !== 'pago');
    return {
      vencidas: abertas.filter(e => daysLeft(e) < 0),
      hoje: abertas.filter(e => daysLeft(e) === 0),
      proximas: abertas.filter(e => daysLeft(e) > 0 && daysLeft(e) <= 7),
      futuras: abertas.filter(e => daysLeft(e) > 7),
      pagas: base.filter(e => e.status === 'pago'),
      abertas,
    };
  }, [base]);

  const listFor = (key: string) => {
    if (key === 'vencidas') return buckets.vencidas;
    if (key === 'hoje') return buckets.hoje;
    if (key === 'proximas') return buckets.proximas;
    if (key === 'pagas') return buckets.pagas;
    return statusFilter === 'aberto' ? buckets.abertas : statusFilter === 'pago' ? buckets.pagas : base;
  };

  const rows = listFor(tab).filter(e => e.descricao.toLowerCase().includes(search.toLowerCase()));

  const sum = (arr: any[]) => arr.reduce((s, e) => s + Number(e.valor), 0);

  const baixar = async (id: string) => {
    const { error } = await supabase.from('financial_entries').update({ status: 'pago', data_pagamento: today }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: isPagar ? 'Pagamento registrado!' : 'Recebimento registrado!' }); load(); }
  };

  const statusBadge = (e: any) => {
    if (e.status === 'pago') return <Badge className="bg-green-600 text-white">{isPagar ? 'Pago' : 'Recebido'}</Badge>;
    const d = daysLeft(e);
    if (d < 0) return <Badge variant="destructive">Vencida há {Math.abs(d)}d</Badge>;
    if (d === 0) return <Badge className="bg-orange-500 text-white">Vence hoje</Badge>;
    return <Badge variant="outline">Em {d}d</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencidas</p><p className="text-xl font-bold text-red-600">{fmt(sum(buckets.vencidas))}</p><p className="text-xs text-muted-foreground">{buckets.vencidas.length} conta(s)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencem hoje</p><p className="text-xl font-bold text-orange-600">{fmt(sum(buckets.hoje))}</p><p className="text-xs text-muted-foreground">{buckets.hoje.length} conta(s)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Próximos 7 dias</p><p className="text-xl font-bold text-blue-600">{fmt(sum(buckets.proximas))}</p><p className="text-xs text-muted-foreground">{buckets.proximas.length} conta(s)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total em aberto</p><p className="text-xl font-bold text-foreground">{fmt(sum(buckets.abertas))}</p><p className="text-xs text-muted-foreground">{buckets.abertas.length} conta(s)</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Controle de {isPagar ? 'pagamentos' : 'recebimentos'}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {tab === 'todas' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Em aberto</SelectItem>
                    <SelectItem value="pago">{isPagar ? 'Pagas' : 'Recebidas'}</SelectItem>
                    <SelectItem value="tudo">Todas</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="vencidas" className="gap-1"><AlertTriangle className="w-3 h-3" />Vencidas</TabsTrigger>
                <TabsTrigger value="hoje">Hoje</TabsTrigger>
                <TabsTrigger value="proximas">Próx. 7 dias</TabsTrigger>
                <TabsTrigger value="pagas">{isPagar ? 'Pagas' : 'Recebidas'}</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} />
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:hidden">
              {rows.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma conta</p>}
              {rows.map(e => (
                <div key={e.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.descricao}</p>
                      <p className="text-xs text-muted-foreground">Venc. {format(parseISO(dueDateOf(e)), 'dd/MM/yyyy')} · {catMap.get(e.categoria_id) || 'Sem categoria'}</p>
                    </div>
                    <p className={`font-bold whitespace-nowrap ${isPagar ? 'text-red-600' : 'text-green-600'}`}>{fmt(Number(e.valor))}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {statusBadge(e)}
                    {e.status !== 'pago' && <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => baixar(e.id)}><CheckCircle className="w-3 h-3" /> Baixar</Button>}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta</TableCell></TableRow>
                  ) : rows.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium max-w-[240px] truncate">{e.descricao}</TableCell>
                      <TableCell>{catMap.get(e.categoria_id) || '—'}</TableCell>
                      <TableCell>{format(parseISO(dueDateOf(e)), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className={isPagar ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(Number(e.valor))}</TableCell>
                      <TableCell>{statusBadge(e)}</TableCell>
                      <TableCell className="text-right">
                        {e.status !== 'pago' && <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => baixar(e.id)}><CheckCircle className="w-3 h-3" /> Baixar</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export const ContasReceber = () => <ContasPagarReceber tipo="receita" />;
export default ContasPagarReceber;
