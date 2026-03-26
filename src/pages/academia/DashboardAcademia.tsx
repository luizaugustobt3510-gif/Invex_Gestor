import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, DollarSign, AlertTriangle, CheckCircle, TrendingUp, UserMinus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', 'hsl(142 76% 36%)'];

const DashboardAcademia = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('academy_students').select('*').eq('company_id', user.companyId),
        supabase.from('academy_payments').select('*').eq('company_id', user.companyId),
      ]);
      setStudents(s || []);
      setPayments(p || []);
      setLoading(false);
    };
    load();
  }, [user?.companyId]);

  const stats = useMemo(() => {
    const ativos = students.filter(s => s.status === 'ativo').length;
    const inativos = students.filter(s => s.status !== 'ativo').length;
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const monthPayments = payments.filter(p => {
      const venc = parseISO(p.data_vencimento);
      return venc >= monthStart && venc <= monthEnd;
    });

    const pagos = monthPayments.filter(p => p.status === 'pago');
    const atrasados = monthPayments.filter(p => p.status === 'pendente' && isBefore(parseISO(p.data_vencimento), today));
    const pendentes = monthPayments.filter(p => p.status === 'pendente' && !isBefore(parseISO(p.data_vencimento), today));

    const recebido = pagos.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const aReceber = monthPayments.filter(p => p.status === 'pendente').reduce((sum, p) => sum + Number(p.valor || 0), 0);

    return { ativos, inativos, pagos: pagos.length, atrasados: atrasados.length, pendentes: pendentes.length, recebido, aReceber };
  }, [students, payments]);

  const statusData = [
    { name: 'Pagos', value: stats.pagos },
    { name: 'Atrasados', value: stats.atrasados },
    { name: 'Pendentes', value: stats.pendentes },
  ].filter(d => d.value > 0);

  const monthlyData = useMemo(() => {
    const months: Record<string, { mes: string, recebido: number, pendente: number }> = {};
    payments.forEach(p => {
      const key = format(parseISO(p.data_vencimento), 'yyyy-MM');
      const label = format(parseISO(p.data_vencimento), 'MMM/yy', { locale: ptBR });
      if (!months[key]) months[key] = { mes: label, recebido: 0, pendente: 0 };
      if (p.status === 'pago') months[key].recebido += Number(p.valor || 0);
      else months[key].pendente += Number(p.valor || 0);
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
  }, [payments]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Academia — Dashboard</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.ativos}</p>
            <p className="text-xs text-muted-foreground">Alunos Ativos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <UserMinus className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.inativos}</p>
            <p className="text-xs text-muted-foreground">Inativos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{stats.pagos}</p>
            <p className="text-xs text-muted-foreground">Pagos (mês)</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{stats.atrasados}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">R$ {stats.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">Recebido</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-orange-500 mb-1" />
            <p className="text-2xl font-bold">R$ {stats.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">A Receber</p>
          </CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Recebimentos por Mês</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Bar dataKey="recebido" fill="hsl(142 76% 36%)" name="Recebido" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendente" fill="hsl(var(--destructive))" name="Pendente" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Status Mensalidades (Mês Atual)</CardTitle></CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardAcademia;
