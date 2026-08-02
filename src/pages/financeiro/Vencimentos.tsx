import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, AlertTriangle, CalendarClock, CalendarDays } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const PERIODS = [
  { key: 'dia', label: 'Hoje', days: 0 },
  { key: 'semana', label: 'Semana (7d)', days: 7 },
  { key: 'quinzena', label: 'Quinzena (15d)', days: 15 },
  { key: 'mes', label: 'Mês (30d)', days: 30 },
];

const Vencimentos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [period, setPeriod] = useState('dia');
  const [refDate, setRefDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).neq('status', 'cancelado').limit(2000),
      supabase.from('financial_categories').select('*').eq('company_id', user.companyId),
    ]);
    setEntries(e || []);
    setCategories(c || []);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);
  const dueDateOf = (e: any) => e.data_vencimento || e.data;

  const ref = startOfDay(parseISO(refDate));
  const days = PERIODS.find(p => p.key === period)!.days;
  const rangeEnd = addDays(ref, days);

  const abertas = useMemo(() => entries.filter(e => e.status !== 'pago'), [entries]);

  const inRange = useMemo(() => abertas.filter(e => {
    const d = startOfDay(parseISO(dueDateOf(e)));
    return d >= ref && d <= rangeEnd;
  }).sort((a, b) => dueDateOf(a).localeCompare(dueDateOf(b))), [abertas, refDate, period]);

  const vencidas = useMemo(() => abertas.filter(e => differenceInCalendarDays(startOfDay(parseISO(dueDateOf(e))), ref) < 0)
    .sort((a, b) => dueDateOf(a).localeCompare(dueDateOf(b))), [abertas, refDate]);

  const sum = (arr: any[], tipo?: string) => arr.filter(e => !tipo || e.tipo === tipo).reduce((s, e) => s + Number(e.valor), 0);

  const pagosNoDia = useMemo(() => entries.filter(e => e.status === 'pago' && e.data_pagamento === refDate), [entries, refDate]);

  const baixar = async (id: string) => {
    const { error } = await supabase.from('financial_entries').update({ status: 'pago', data_pagamento: format(new Date(), 'yyyy-MM-dd') }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Baixa registrada!' }); load(); }
  };

  const renderList = (list: any[], emptyMsg: string) => (
    <>
      <div className="space-y-2 md:hidden">
        {list.length === 0 && <p className="text-center text-muted-foreground py-6">{emptyMsg}</p>}
        {list.map(e => (
          <div key={e.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{e.descricao}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(dueDateOf(e)), "dd/MM/yyyy (EEEE)", { locale: ptBR })} · {catMap.get(e.categoria_id) || 'Sem categoria'}</p>
              </div>
              <p className={`font-bold whitespace-nowrap ${e.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>{fmt(Number(e.valor))}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant={e.tipo === 'receita' ? 'default' : 'secondary'}>{e.tipo === 'receita' ? 'A receber' : 'A pagar'}</Badge>
              {e.status !== 'pago' && <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => baixar(e.id)}><CheckCircle className="w-3 h-3" /> Baixar</Button>}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{emptyMsg}</TableCell></TableRow>
            ) : list.map(e => (
              <TableRow key={e.id}>
                <TableCell>{format(parseISO(dueDateOf(e)), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium max-w-[240px] truncate">{e.descricao}</TableCell>
                <TableCell>{catMap.get(e.categoria_id) || '—'}</TableCell>
                <TableCell><Badge variant={e.tipo === 'receita' ? 'default' : 'secondary'}>{e.tipo === 'receita' ? 'A receber' : 'A pagar'}</Badge></TableCell>
                <TableCell className={e.tipo === 'receita' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{fmt(Number(e.valor))}</TableCell>
                <TableCell className="text-right">
                  {e.status !== 'pago' && <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => baixar(e.id)}><CheckCircle className="w-3 h-3" /> Baixar</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Vencimentos e Pagamentos do Dia</h1>
          <Input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} className="w-full sm:w-44" />
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <Button key={p.key} size="sm" variant={period === p.key ? 'default' : 'outline'} onClick={() => setPeriod(p.key)}>{p.label}</Button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencidas (acumulado)</p><p className="text-xl font-bold text-red-600">{fmt(sum(vencidas))}</p><p className="text-xs text-muted-foreground">{vencidas.length} conta(s)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">A pagar no período</p><p className="text-xl font-bold text-orange-600">{fmt(sum(inRange, 'despesa'))}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">A receber no período</p><p className="text-xl font-bold text-green-600">{fmt(sum(inRange, 'receita'))}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo projetado</p><p className={`text-xl font-bold ${sum(inRange, 'receita') - sum(inRange, 'despesa') >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(sum(inRange, 'receita') - sum(inRange, 'despesa'))}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-red-600"><AlertTriangle className="w-4 h-4" /> Contas vencidas</CardTitle></CardHeader>
          <CardContent>{renderList(vencidas, 'Nenhuma conta vencida 🎉')}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Vencimentos — {PERIODS.find(p => p.key === period)!.label}
              <span className="text-xs font-normal text-muted-foreground">
                ({format(ref, 'dd/MM')} {days > 0 ? `a ${format(rangeEnd, 'dd/MM')}` : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>{renderList(inRange, 'Nenhum vencimento no período')}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Movimentações liquidadas em {format(ref, 'dd/MM/yyyy')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Recebido</p><p className="font-bold text-green-600">{fmt(sum(pagosNoDia, 'receita'))}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Pago</p><p className="font-bold text-red-600">{fmt(sum(pagosNoDia, 'despesa'))}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Saldo do dia</p><p className={`font-bold ${sum(pagosNoDia, 'receita') - sum(pagosNoDia, 'despesa') >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(sum(pagosNoDia, 'receita') - sum(pagosNoDia, 'despesa'))}</p></div>
            </div>
            {renderList(pagosNoDia, 'Nenhuma movimentação liquidada nesta data')}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Vencimentos;
