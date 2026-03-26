import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Sale {
  id: string;
  valor_total: number;
  forma_pagamento: string;
  status: string;
  created_at: string;
}

interface SaleItem {
  quantidade: number;
  subtotal: number;
  material_id: string;
  materials?: { material: string } | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'C. Crédito',
  cartao_debito: 'C. Débito',
};

const RelatoriosVendas = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user?.companyId) fetchData();
  }, [user?.companyId, startDate, endDate]);

  const fetchData = async () => {
    const { data: salesData } = await supabase
      .from('sales')
      .select('*')
      .eq('company_id', user!.companyId!)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .eq('status', 'finalizada');
    if (salesData) setSales(salesData as Sale[]);

    const saleIds = (salesData || []).map(s => s.id);
    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('quantidade, subtotal, material_id, materials(material)')
        .in('sale_id', saleIds);
      if (itemsData) setSaleItems(itemsData as unknown as SaleItem[]);
    } else {
      setSaleItems([]);
    }
  };

  const totalVendido = sales.reduce((acc, s) => acc + s.valor_total, 0);
  const totalVendas = sales.length;
  const ticketMedio = totalVendas > 0 ? totalVendido / totalVendas : 0;

  // Sales by day
  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const day = format(parseISO(s.created_at), 'dd/MM');
      map[day] = (map[day] || 0) + s.valor_total;
    });
    return Object.entries(map).map(([day, total]) => ({ day, total }));
  }, [sales]);

  // Payment distribution
  const paymentDist = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const label = paymentLabels[s.forma_pagamento] || s.forma_pagamento;
      map[label] = (map[label] || 0) + s.valor_total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    saleItems.forEach(item => {
      const name = (item.materials as any)?.material || 'Desconhecido';
      if (!map[item.material_id]) map[item.material_id] = { name, qty: 0, total: 0 };
      map[item.material_id].qty += item.quantidade;
      map[item.material_id].total += item.subtotal;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [saleItems]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Relatórios de Vendas</h1>

        <div className="flex gap-3 flex-wrap">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-2xl font-bold">R$ {totalVendido.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold">{totalVendas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">R$ {ticketMedio.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales by day */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Vendas por Dia</CardTitle></CardHeader>
            <CardContent>
              {salesByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* Payment distribution */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Formas de Pagamento</CardTitle></CardHeader>
            <CardContent>
              {paymentDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={paymentDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top products */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">{p.qty} un.</span>
                      <span className="font-semibold">R$ {p.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RelatoriosVendas;
