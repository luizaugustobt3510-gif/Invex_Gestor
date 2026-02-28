import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Calendar, FileText, AlertTriangle, TrendingDown, Clock, Search, MoreVertical, GraduationCap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };

const DashboardRH = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string; severity: 'warning' | 'error' }[]>([]);
  const [stats, setStats] = useState({
    totalColaboradores: 0, ativos: 0, absenteismo: 0, turnover: 0,
    feriasProximas: 0, atestadosMes: 0, bancoHorasTotal: 0,
  });
  const [lastEvaluations, setLastEvaluations] = useState<Map<string, number>>(new Map());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [empRes, vacRes, certRes, timeRes, evalRes, trainRes] = await Promise.all([
        supabase.from('employees').select('*').order('nome'),
        supabase.from('employee_vacations').select('*, employees(nome)').gte('data_inicio', hoje).lte('data_inicio', em30dias),
        supabase.from('employee_certificates').select('dias, data_inicio').gte('data_inicio', inicioMes),
        supabase.from('time_records').select('employee_id, horas_extras').gte('data', inicioMes),
        supabase.from('performance_evaluations').select('employee_id, nota, created_at').order('created_at', { ascending: false }),
        supabase.from('employee_trainings').select('employee_id, data_validade, trainings(nome, obrigatorio)').not('data_validade', 'is', null),
      ]);

      const emps = empRes.data || [];
      const totalColaboradores = emps.length;
      const ativos = emps.filter(e => e.status === 'ativo').length;
      const diasAtestado = (certRes.data || []).reduce((s, c) => s + (c.dias || 0), 0);
      const absenteismo = ativos > 0 ? Math.round((diasAtestado / (ativos * 22)) * 1000) / 10 : 0;
      const inativos = emps.filter(e => e.status === 'inativo').length;
      const admMes = emps.filter(e => e.data_admissao >= inicioMes).length;
      const turnover = totalColaboradores > 0 ? Math.round(((admMes + inativos) / totalColaboradores) * 1000) / 10 : 0;

      // Banco de horas
      const bancoHorasTotal = (timeRes.data || []).reduce((s, t) => s + (t.horas_extras || 0), 0);

      // Last evaluations per employee
      const evalMap = new Map<string, number>();
      (evalRes.data || []).forEach(ev => {
        if (!evalMap.has(ev.employee_id)) evalMap.set(ev.employee_id, ev.nota);
      });
      setLastEvaluations(evalMap);

      // Generate alerts
      const newAlerts: typeof alerts = [];

      // Vacation alerts - employees near acquisition period end
      emps.forEach(emp => {
        if (emp.status !== 'ativo') return;
        const admDate = new Date(emp.data_admissao);
        const now = new Date();
        const monthsSinceAdm = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        if (monthsSinceAdm > 0 && monthsSinceAdm % 12 >= 10) {
          newAlerts.push({ type: 'ferias', message: `${emp.nome} próximo de completar período aquisitivo`, severity: 'warning' });
        }
      });

      // Training alerts
      (trainRes.data || []).forEach(et => {
        if (!et.data_validade) return;
        const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
        if (diff < 0) {
          newAlerts.push({ type: 'treinamento', message: `Treinamento "${et.trainings?.nome}" vencido`, severity: 'error' });
        } else if (diff <= 30) {
          newAlerts.push({ type: 'treinamento', message: `Treinamento "${et.trainings?.nome}" vence em ${Math.ceil(diff)} dias`, severity: 'warning' });
        }
      });

      // Bank hours alert
      const horasPorEmp = new Map<string, number>();
      (timeRes.data || []).forEach(t => {
        horasPorEmp.set(t.employee_id, (horasPorEmp.get(t.employee_id) || 0) + (t.horas_extras || 0));
      });
      horasPorEmp.forEach((total, empId) => {
        if (total > 40) {
          const emp = emps.find(e => e.id === empId);
          newAlerts.push({ type: 'banco_horas', message: `${emp?.nome || 'Colaborador'} com ${total.toFixed(1)}h extras acumuladas`, severity: 'warning' });
        }
      });

      // Absenteism alert
      if (absenteismo > 5) {
        newAlerts.push({ type: 'absenteismo', message: `Absenteísmo elevado: ${absenteismo}%`, severity: 'error' });
      }

      // Turnover alert
      if (turnover > 10) {
        newAlerts.push({ type: 'turnover', message: `Turnover acima da média: ${turnover}%`, severity: 'warning' });
      }

      setAlerts(newAlerts);
      setEmployees(emps);
      setStats({
        totalColaboradores, ativos, absenteismo, turnover,
        feriasProximas: vacRes.data?.length || 0, atestadosMes: certRes.data?.length || 0,
        bancoHorasTotal: Math.round(bancoHorasTotal * 10) / 10,
      });
    } catch (err) {
      console.error('Erro dashboard RH:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cargo.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-foreground">Início RH — Gestão de Pessoas</h1>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /> {alerts.length} Alerta(s)
              </div>
              {alerts.slice(0, 5).map((a, i) => (
                <p key={i} className={`text-sm ${a.severity === 'error' ? 'text-destructive' : 'text-amber-700'}`}>
                  • {a.message}
                </p>
              ))}
              {alerts.length > 5 && <p className="text-xs text-muted-foreground">+{alerts.length - 5} outros alertas</p>}
            </CardContent>
          </Card>
        )}

        {/* Indicator Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Absenteísmo</span>
                <div className="p-2 rounded-lg bg-amber-500/10"><TrendingDown className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.absenteismo}%</p>
              <p className="text-xs text-muted-foreground">{stats.atestadosMes} atestados no mês</p>
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
                <span className="text-xs font-medium text-muted-foreground uppercase">Banco de Horas</span>
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-4 h-4 text-primary" /></div>
              </div>
              <p className={`text-2xl font-bold ${stats.bancoHorasTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {stats.bancoHorasTotal >= 0 ? '+' : ''}{stats.bancoHorasTotal}h
              </p>
              <p className="text-xs text-muted-foreground">acumulado no mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Colaboradores</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Nenhum colaborador encontrado.</p>
              ) : filtered.map(emp => {
                const lastEval = lastEvaluations.get(emp.id);
                return (
                  <div key={emp.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {emp.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{emp.nome}</p>
                        <p className="text-xs text-muted-foreground">{emp.cargo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lastEval && <span className="text-lg" title="Última avaliação">{notaEmoji[lastEval]}</span>}
                      <Badge variant={emp.status === 'ativo' ? 'default' : emp.status === 'ferias' ? 'secondary' : 'outline'} className="text-xs">
                        {emp.status === 'ativo' ? 'Ativo' : emp.status === 'ferias' ? 'Férias' : emp.status === 'afastado' ? 'Afastado' : 'Inativo'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('/rh/colaboradores')}>Editar colaborador</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/rh/ferias')}>Programar férias</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/rh/atestados')}>Registrar atestado</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/rh/treinamentos')}>Adicionar treinamento</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/rh/avaliacoes')}>Avaliar desempenho</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/rh/banco-de-horas')}>Ajustar banco de horas</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardRH;
