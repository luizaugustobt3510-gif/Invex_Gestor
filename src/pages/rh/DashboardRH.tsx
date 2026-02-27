import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DashboardRH = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    ativos: 0,
    inativos: 0,
    feriasProximas: 0,
    atestadosMes: 0,
    afastamentosAtivos: 0,
  });
  const [feriasProximas, setFeriasProximas] = useState<any[]>([]);
  const [atestadosRecentes, setAtestadosRecentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, nome, status');

      const totalColaboradores = employees?.length || 0;
      const ativos = employees?.filter(e => e.status === 'ativo').length || 0;
      const inativos = totalColaboradores - ativos;

      // Load upcoming vacations (next 30 days)
      const hoje = new Date().toISOString().split('T')[0];
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      
      const { data: vacations } = await supabase
        .from('employee_vacations')
        .select('*, employees(nome)')
        .gte('data_inicio', hoje)
        .lte('data_inicio', em30dias)
        .order('data_inicio');

      // Load certificates this month
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const { data: certificates } = await supabase
        .from('employee_certificates')
        .select('*, employees(nome)')
        .gte('data_inicio', inicioMes)
        .order('data_inicio', { ascending: false });

      // Active absences (certificates where data_fim >= today)
      const { data: activeAbsences } = await supabase
        .from('employee_certificates')
        .select('id')
        .gte('data_fim', hoje);

      setStats({
        totalColaboradores,
        ativos,
        inativos,
        feriasProximas: vacations?.length || 0,
        atestadosMes: certificates?.length || 0,
        afastamentosAtivos: activeAbsences?.length || 0,
      });

      setFeriasProximas(vacations?.slice(0, 5) || []);
      setAtestadosRecentes(certificates?.slice(0, 5) || []);
    } catch (err) {
      console.error('Erro ao carregar dashboard RH:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

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
        <h1 className="text-2xl font-bold text-foreground">Dashboard RH — Gestão de Pessoas</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Colaboradores</span>
                <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.totalColaboradores}</p>
              <p className="text-xs text-muted-foreground">{stats.ativos} ativos · {stats.inativos} inativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Férias Próximas</span>
                <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.feriasProximas}</p>
              <p className="text-xs text-muted-foreground">nos próximos 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Atestados (mês)</span>
                <div className="p-2 rounded-lg bg-amber-500/10"><FileText className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.atestadosMes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Afastados Agora</span>
                <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.afastamentosAtivos}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming vacations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Férias Próximas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feriasProximas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma férias agendada nos próximos 30 dias.</p>
              ) : (
                <div className="space-y-3">
                  {feriasProximas.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{v.employees?.nome}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(v.data_inicio)} a {formatDate(v.data_fim)}</p>
                      </div>
                      <Badge variant="secondary">{v.dias} dias</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Atestados Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atestadosRecentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum atestado registrado este mês.</p>
              ) : (
                <div className="space-y-3">
                  {atestadosRecentes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{c.employees?.nome}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.data_inicio)} — {c.motivo || 'Sem motivo informado'}</p>
                      </div>
                      <Badge variant="outline">{c.dias} dias</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardRH;
