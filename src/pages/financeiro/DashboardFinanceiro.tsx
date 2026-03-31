import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { financeiroService } from '@/services/financeiroService';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { generateFinanceiroInsights } from '@/components/insights/generateFinanceiroInsights';

const DashboardFinanceiro = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [period, setPeriod] = useState('mes_atual');

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const { data } = await financeiroService.getEntries(user.companyId!);
      setEntries(data || []);
    };
    load();
  }, [user?.companyId]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    if (period === 'mes_atual') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === 'mes_anterior') {
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
    } else if (period === '3_meses') {
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
    } else {
      start = startOfMonth(subMonths(now, 11));
      end = endOfMonth(now);
    }
    return entries.filter(e => {
      const d = parseISO(e.data);
      return d >= start && d <= end;
    });
  }, [entries, period]);

  const stats = useMemo(() => financeiroService.computeStats(filteredEntries), [filteredEntries]);

  // Chart: monthly comparison
  const monthlyData = useMemo(() => {
    const months: Record<string, { receita: number; despesa: number }> = {};
    filteredEntries.forEach(e => {
      if (e.status === 'cancelado') return;
      const key = format(parseISO(e.data), 'MM/yy');
      if (!months[key]) months[key] = { receita: 0, despesa: 0 };
      if (e.tipo === 'receita' && e.status === 'pago') months[key].receita += Number(e.valor);
      if (e.tipo === 'despesa' && e.status === 'pago') months[key].despesa += Number(e.valor);
    });
    return Object.entries(months).map(([mes, v]) => ({ mes, ...v }));
  }, [filteredEntries]);

  // Chart: by origin
  const originData = useMemo(() => {
    const origins: Record<string, number> = {};
    filteredEntries.filter(e => e.tipo === 'receita' && e.status === 'pago').forEach(e => {
      const key = e.origem || 'manual';
      origins[key] = (origins[key] || 0) + Number(e.valor);
    });
    return Object.entries(origins).map(([name, value]) => ({ name: name === 'academia' ? 'Academia' : name === 'venda' ? 'Vendas' : 'Manual', value }));
  }, [filteredEntries]);

  const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(47 96% 53%)', 'hsl(0 72% 51%)'];
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
              <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
              <SelectItem value="3_meses">Últimos 3 Meses</SelectItem>
              <SelectItem value="12_meses">Últimos 12 Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receitas</p><p className="text-xl font-bold text-green-600">{fmt(stats.receitas)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Despesas</p><p className="text-xl font-bold text-red-600">{fmt(stats.despesas)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lucro Líquido</p><p className={`text-xl font-bold ${stats.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(stats.lucro)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">A Receber</p><p className="text-xl font-bold text-blue-600">{fmt(stats.aReceber)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">A Pagar</p><p className="text-xl font-bold text-orange-600">{fmt(stats.aPagar)}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Receitas x Despesas</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ChartContainer config={{ receita: { label: 'Receita', color: 'hsl(142 76% 36%)' }, despesa: { label: 'Despesa', color: 'hsl(0 72% 51%)' } }} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="receita" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
                      <Bar dataKey="despesa" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados no período</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Receitas por Origem</CardTitle></CardHeader>
            <CardContent>
              {originData.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={originData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {originData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados no período</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardFinanceiro;
