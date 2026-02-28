import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingDown, TrendingUp, Clock, Users } from 'lucide-react';

const Indicadores = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    ativos: 0,
    absenteismo: 0,
    turnover: 0,
    bancoHorasTotal: 0,
    admissoesMes: 0,
    desligamentosMes: 0,
    diasAtestadoMes: 0,
    diasUteisMes: 22,
  });

  useEffect(() => { loadIndicadores(); }, []);

  const loadIndicadores = async () => {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

      const [empRes, certRes, timeRes] = await Promise.all([
        supabase.from('employees').select('id, status, data_admissao'),
        supabase.from('employee_certificates').select('dias, data_inicio').gte('data_inicio', inicioMes).lte('data_inicio', fimMes),
        supabase.from('time_records').select('horas_extras').gte('data', inicioMes).lte('data', fimMes),
      ]);

      const employees = empRes.data || [];
      const totalColaboradores = employees.length;
      const ativos = employees.filter(e => e.status === 'ativo').length;
      const inativos = employees.filter(e => e.status === 'inativo').length;

      // Admissions this month
      const admissoesMes = employees.filter(e => e.data_admissao >= inicioMes && e.data_admissao <= fimMes).length;

      // Certificates (absenteism)
      const diasAtestadoMes = (certRes.data || []).reduce((sum, c) => sum + (c.dias || 0), 0);
      const diasUteisMes = 22;
      const absenteismo = ativos > 0 ? (diasAtestadoMes / (ativos * diasUteisMes)) * 100 : 0;

      // Turnover
      const turnover = totalColaboradores > 0 ? ((admissoesMes + inativos) / totalColaboradores) * 100 : 0;

      // Banco de horas
      const bancoHorasTotal = (timeRes.data || []).reduce((sum, t) => sum + (t.horas_extras || 0), 0);

      setStats({
        totalColaboradores,
        ativos,
        absenteismo: Math.round(absenteismo * 10) / 10,
        turnover: Math.round(turnover * 10) / 10,
        bancoHorasTotal: Math.round(bancoHorasTotal * 10) / 10,
        admissoesMes,
        desligamentosMes: inativos,
        diasAtestadoMes,
        diasUteisMes,
      });
    } catch (err) {
      console.error('Erro indicadores:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Indicadores RH</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Absenteísmo</span>
                <div className="p-2 rounded-lg bg-amber-500/10"><TrendingDown className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.absenteismo}%</p>
              <p className="text-xs text-muted-foreground">{stats.diasAtestadoMes} dias atestado / {stats.ativos * stats.diasUteisMes} dias úteis</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Turnover</span>
                <div className="p-2 rounded-lg bg-destructive/10"><TrendingUp className="w-4 h-4 text-destructive" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.turnover}%</p>
              <p className="text-xs text-muted-foreground">{stats.admissoesMes} adm. + {stats.desligamentosMes} desl. / {stats.totalColaboradores} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Banco de Horas</span>
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-4 h-4 text-primary" /></div>
              </div>
              <p className={`text-2xl font-bold ${stats.bancoHorasTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {stats.bancoHorasTotal >= 0 ? '+' : ''}{stats.bancoHorasTotal}h
              </p>
              <p className="text-xs text-muted-foreground">acumulado no mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Colaboradores</span>
                <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.ativos}</p>
              <p className="text-xs text-muted-foreground">de {stats.totalColaboradores} total</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Fórmulas Utilizadas</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Absenteísmo</p>
                <p>= (Dias de atestado no mês) / (Colaboradores ativos × Dias úteis) × 100</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Turnover</p>
                <p>= (Admissões + Desligamentos) / Total de colaboradores × 100</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Banco de Horas</p>
                <p>= Soma de horas extras acumuladas no mês</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Indicadores;
