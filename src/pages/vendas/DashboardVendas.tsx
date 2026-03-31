import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { vendasService } from '@/services/vendasService';
import { ShoppingCart, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { generateVendasInsights } from '@/components/insights/generateVendasInsights';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'C. Crédito',
  cartao_debito: 'C. Débito',
};

const DashboardVendas = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [period, setPeriod] = useState('mes_atual');

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const { data } = await vendasService.getSales(user.companyId!);
      setSales(data || []);
    };
    load();
  }, [user?.companyId]);

  const filteredSales = useMemo(() => {
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
    return sales.filter(s => {
      const d = parseISO(s.created_at);
      return d >= start && d <= end;
    });
  }, [sales, period]);

  const stats = useMemo(() => vendasService.computeStats(filteredSales), [filteredSales]);

  const vendasInsights = useMemo(() => generateVendasInsights(stats, filteredSales), [stats, filteredSales]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { vendas: number; faturamento: number }> = {};
    filteredSales.filter(s => s.status === 'finalizada').forEach(s => {
      const key = format(parseISO(s.created_at), 'MM/yy');
      if (!months[key]) months[key] = { vendas: 0, faturamento: 0 };
      months[key].vendas += 1;
      months[key].faturamento += Number(s.valor_total);
    });
    return Object.entries(months).map(([mes, v]) => ({ mes, ...v }));
  }, [filteredSales]);

  const paymentData = useMemo(() => {
    return Object.entries(stats.porForma).map(([key, value]) => ({
      name: paymentLabels[key] || key,
      value,
    }));
  }, [stats.porForma]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Vendas</h1>
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total de Vendas</p>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.totalVendas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Faturamento</p>
              </div>
              <p className="text-xl font-bold text-green-600">{fmt(stats.faturamento)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
              </div>
              <p className="text-xl font-bold text-foreground">{fmt(stats.ticketMedio)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Vendas por Mês</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ChartContainer config={{ faturamento: { label: 'Faturamento', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem vendas no período</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Por Forma de Pagamento</CardTitle></CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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

export default DashboardVendas;
