import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const FluxoCaixa = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [view, setView] = useState('diario');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const { data } = await supabase.from('financial_entries').select('*').eq('company_id', user.companyId).eq('status', 'pago').order('data');
      setEntries(data || []);
    };
    load();
  }, [user?.companyId]);

  const dailyData = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const start = startOfMonth(new Date(year, mon - 1));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    let saldo = 0;
    return days.map(day => {
      const dayEntries = entries.filter(e => isSameDay(parseISO(e.data), day));
      const receitas = dayEntries.filter(e => e.tipo === 'receita').reduce((s, e) => s + Number(e.valor), 0);
      const despesas = dayEntries.filter(e => e.tipo === 'despesa').reduce((s, e) => s + Number(e.valor), 0);
      saldo += receitas - despesas;
      return { dia: format(day, 'dd'), receitas, despesas, saldo, liquido: receitas - despesas };
    });
  }, [entries, month]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { receitas: number; despesas: number }> = {};
    entries.forEach(e => {
      const key = format(parseISO(e.data), 'yyyy-MM');
      if (!months[key]) months[key] = { receitas: 0, despesas: 0 };
      if (e.tipo === 'receita') months[key].receitas += Number(e.valor);
      else months[key].despesas += Number(e.valor);
    });
    let saldo = 0;
    return Object.entries(months).sort().map(([mes, v]) => {
      saldo += v.receitas - v.despesas;
      return { mes: mes.slice(5) + '/' + mes.slice(2, 4), ...v, saldo, liquido: v.receitas - v.despesas };
    });
  }, [entries]);

  const data = view === 'diario' ? dailyData : monthlyData;
  const xKey = view === 'diario' ? 'dia' : 'mes';
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const totals = useMemo(() => {
    const d = view === 'diario' ? dailyData : monthlyData;
    const rec = d.reduce((s, r) => s + r.receitas, 0);
    const desp = d.reduce((s, r) => s + r.despesas, 0);
    return { rec, desp, saldo: d.length > 0 ? d[d.length - 1].saldo : 0 };
  }, [dailyData, monthlyData, view]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
          <div className="flex gap-2">
            <Select value={view} onValueChange={setView}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
            {view === 'diario' && (
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Entradas</p><p className="text-xl font-bold text-green-600">{fmt(totals.rec)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Saídas</p><p className="text-xl font-bold text-red-600">{fmt(totals.desp)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-xl font-bold ${totals.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.saldo)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução do Saldo</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <ResponsiveContainer>
                <AreaChart data={data as any[]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xKey} />
                  <YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{view === 'diario' ? 'Dia' : 'Mês'}</TableHead>
                    <TableHead>Entradas</TableHead>
                    <TableHead>Saídas</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Saldo Acum.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{(r as any)[xKey]}</TableCell>
                      <TableCell className="text-green-600">{fmt(r.receitas)}</TableCell>
                      <TableCell className="text-red-600">{fmt(r.despesas)}</TableCell>
                      <TableCell className={r.liquido >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(r.liquido)}</TableCell>
                      <TableCell className={r.saldo >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{fmt(r.saldo)}</TableCell>
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

export default FluxoCaixa;
