import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const RelatoriosFinanceiros = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const [{ data: e }, { data: c }] = await Promise.all([
        supabase.from('financial_entries').select('*').eq('company_id', user.companyId).order('data'),
        supabase.from('financial_categories').select('*').eq('company_id', user.companyId),
      ]);
      setEntries(e || []);
      setCategories(c || []);
    };
    load();
  }, [user?.companyId]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const d = e.data;
      return d >= dateFrom && d <= dateTo && e.status !== 'cancelado';
    });
  }, [entries, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const receitas = filtered.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.valor), 0);
    const despesas = filtered.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.valor), 0);
    return { receitas, despesas, lucro: receitas - despesas, margem: receitas > 0 ? ((receitas - despesas) / receitas * 100) : 0 };
  }, [filtered]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);

  // By category
  const byCat = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    filtered.filter(e => e.status === 'pago').forEach(e => {
      const cat = catMap.get(e.categoria_id) || 'Sem categoria';
      if (!map[cat]) map[cat] = { receita: 0, despesa: 0 };
      if (e.tipo === 'receita') map[cat].receita += Number(e.valor);
      else map[cat].despesa += Number(e.valor);
    });
    return Object.entries(map).map(([cat, v]) => ({ categoria: cat, ...v }));
  }, [filtered, catMap]);

  // Monthly comparison
  const byMonth = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    filtered.filter(e => e.status === 'pago').forEach(e => {
      const key = format(parseISO(e.data), 'MM/yy');
      if (!map[key]) map[key] = { receita: 0, despesa: 0 };
      if (e.tipo === 'receita') map[key].receita += Number(e.valor);
      else map[key].despesa += Number(e.valor);
    });
    return Object.entries(map).map(([mes, v]) => ({ mes, ...v, lucro: v.receita - v.despesa }));
  }, [filtered]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
          <div className="flex gap-2 items-end">
            <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" /></div>
            <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receita Total</p><p className="text-xl font-bold text-green-600">{fmt(stats.receitas)}</p></CardContent></Card>
          <Card className="border-l-4 border-l-red-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Despesas Totais</p><p className="text-xl font-bold text-red-600">{fmt(stats.despesas)}</p></CardContent></Card>
          <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lucro Líquido</p><p className={`text-xl font-bold ${stats.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(stats.lucro)}</p></CardContent></Card>
          <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Margem</p><p className={`text-xl font-bold ${stats.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.margem.toFixed(1)}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Comparação por Período</CardTitle></CardHeader>
            <CardContent>
              {byMonth.length > 0 ? (
                <ChartContainer config={{ receita: { label: 'Receita', color: 'hsl(142 76% 36%)' }, despesa: { label: 'Despesa', color: 'hsl(0 72% 51%)' } }} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={byMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="receita" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
                      <Bar dataKey="despesa" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : <p className="text-center text-muted-foreground py-8">Sem dados no período</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Por Categoria</CardTitle></CardHeader>
            <CardContent>
              {byCat.length > 0 ? (
                <ChartContainer config={{ receita: { label: 'Receita', color: 'hsl(142 76% 36%)' }, despesa: { label: 'Despesa', color: 'hsl(0 72% 51%)' } }} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={byCat} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="categoria" type="category" width={100} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="receita" fill="hsl(142 76% 36%)" radius={[0,4,4,0]} />
                      <Bar dataKey="despesa" fill="hsl(0 72% 51%)" radius={[0,4,4,0]} />
                    </BarChart>
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

export default RelatoriosFinanceiros;
