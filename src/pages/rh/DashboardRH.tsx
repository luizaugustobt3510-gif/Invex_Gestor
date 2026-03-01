import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Calendar, AlertTriangle, TrendingDown, Clock, Search, MoreVertical, DollarSign, GraduationCap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };

const DashboardRH = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'visualizador';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string; severity: 'warning' | 'error' }[]>([]);
  const [stats, setStats] = useState({
    totalColaboradores: 0, ativos: 0, absenteismo: 0, turnover: 0,
    feriasProximas: 0, atestadosMes: 0, bancoHorasTotal: 0, custoFolha: 0,
  });
  const [lastEvaluations, setLastEvaluations] = useState<Map<string, number>>(new Map());
  const [vacationAlerts, setVacationAlerts] = useState<Set<string>>(new Set());
  const [trainingAlerts, setTrainingAlerts] = useState<Set<string>>(new Set());
  const [hoursAlerts, setHoursAlerts] = useState<Map<string, number>>(new Map());

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
      const bancoHorasTotal = (timeRes.data || []).reduce((s, t) => s + (t.horas_extras || 0), 0);
      const custoFolha = emps.filter(e => e.status === 'ativo').reduce((s, e) => s + Number(e.salario || 0), 0);

      // Last evaluations per employee
      const evalMap = new Map<string, number>();
      (evalRes.data || []).forEach(ev => {
        if (!evalMap.has(ev.employee_id)) evalMap.set(ev.employee_id, ev.nota);
      });
      setLastEvaluations(evalMap);

      // Vacation alerts per employee
      const vacAlerts = new Set<string>();
      emps.forEach(emp => {
        if (emp.status !== 'ativo') return;
        const admDate = new Date(emp.data_admissao);
        const now = new Date();
        const monthsSinceAdm = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        if (monthsSinceAdm > 0 && monthsSinceAdm % 12 >= 10) {
          vacAlerts.add(emp.id);
        }
      });
      // Also mark employees with vacations in next 30 days
      (vacRes.data || []).forEach(v => { if (v.employee_id) vacAlerts.add(v.employee_id); });
      setVacationAlerts(vacAlerts);

      // Training alerts per employee
      const trainAlerts = new Set<string>();
      (trainRes.data || []).forEach(et => {
        if (!et.data_validade) return;
        const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
        if (diff <= 30) trainAlerts.add(et.employee_id);
      });
      setTrainingAlerts(trainAlerts);

      // Hours per employee
      const horasPorEmp = new Map<string, number>();
      (timeRes.data || []).forEach(t => {
        horasPorEmp.set(t.employee_id, (horasPorEmp.get(t.employee_id) || 0) + (t.horas_extras || 0));
      });
      setHoursAlerts(horasPorEmp);

      // Generate alerts
      const newAlerts: typeof alerts = [];
      vacAlerts.forEach(empId => {
        const emp = emps.find(e => e.id === empId);
        if (emp) newAlerts.push({ type: 'ferias', message: `${emp.nome} — férias próximas ou período aquisitivo`, severity: 'warning' });
      });
      trainAlerts.forEach(empId => {
        const emp = emps.find(e => e.id === empId);
        if (emp) newAlerts.push({ type: 'treinamento', message: `${emp.nome} — treinamento vencido ou próximo de vencer`, severity: 'error' });
      });
      horasPorEmp.forEach((total, empId) => {
        if (total > 40) {
          const emp = emps.find(e => e.id === empId);
          newAlerts.push({ type: 'banco_horas', message: `${emp?.nome || 'Colaborador'} com ${total.toFixed(1)}h extras acumuladas`, severity: 'warning' });
        }
      });
      if (absenteismo > 5) newAlerts.push({ type: 'absenteismo', message: `Absenteísmo elevado: ${absenteismo}%`, severity: 'error' });
      if (turnover > 10) newAlerts.push({ type: 'turnover', message: `Turnover acima da média: ${turnover}%`, severity: 'warning' });

      setAlerts(newAlerts);
      setEmployees(emps);
      setStats({
        totalColaboradores, ativos, absenteismo, turnover,
        feriasProximas: vacRes.data?.length || 0, atestadosMes: certRes.data?.length || 0,
        bancoHorasTotal: Math.round(bancoHorasTotal * 10) / 10, custoFolha,
      });
    } catch (err) {
      console.error('Erro dashboard RH:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRH = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: roleData } = await supabase.from('user_roles').select('company_id').eq('user_id', authUser.id).not('company_id', 'is', null).limit(1).single();
      if (!roleData?.company_id) return;

      const [empR, vacR, certR, timeR, trainR, evalR] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', roleData.company_id),
        supabase.from('employee_vacations').select('*, employees(nome)').eq('company_id', roleData.company_id),
        supabase.from('employee_certificates').select('*, employees(nome)').eq('company_id', roleData.company_id),
        supabase.from('time_records').select('*, employees(nome)').eq('company_id', roleData.company_id),
        supabase.from('employee_trainings').select('*, employees(nome), trainings(nome)').eq('company_id', roleData.company_id),
        supabase.from('performance_evaluations').select('*, employees(nome)').eq('company_id', roleData.company_id),
      ]);

      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, data: any[]) => {
        if (data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, name);
        }
      };

      addSheet('Colaboradores', (empR.data || []).map(e => ({ Nome: e.nome, CPF: e.cpf, Cargo: e.cargo, Status: e.status, Admissão: e.data_admissao, Salário: e.salario })));
      addSheet('Férias', (vacR.data || []).map(v => ({ Colaborador: (v as any).employees?.nome, Início: v.data_inicio, Fim: v.data_fim, Dias: v.dias, Status: v.status })));
      addSheet('Atestados', (certR.data || []).map(c => ({ Colaborador: (c as any).employees?.nome, Início: c.data_inicio, Fim: c.data_fim, Dias: c.dias, Motivo: c.motivo })));
      addSheet('Banco de Horas', (timeR.data || []).map(t => ({ Colaborador: (t as any).employees?.nome, Data: t.data, Entrada: t.entrada, Saída: t.saida, 'Horas Trab.': t.horas_trabalhadas, 'Horas Extras': t.horas_extras })));
      addSheet('Treinamentos', (trainR.data || []).map(t => ({ Colaborador: (t as any).employees?.nome, Treinamento: (t as any).trainings?.nome, Realização: t.data_realizacao, Validade: t.data_validade, Status: t.status })));
      addSheet('Avaliações', (evalR.data || []).map(e => ({ Colaborador: (e as any).employees?.nome, Nota: e.nota, Observações: e.observacoes, Data: e.created_at?.split('T')[0] })));

      XLSX.writeFile(wb, `Backup_RH_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      toast({ title: 'Backup RH exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
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
    <MainLayout onExportReport={!isViewer ? handleExportRH : undefined} showExport={!isViewer}>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              <p className="text-xs text-muted-foreground">{stats.atestadosMes} atestados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Turnover</span>
                <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-4 h-4 text-destructive" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.turnover}%</p>
              <p className="text-xs text-muted-foreground">no mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Férias Próx.</span>
                <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats.feriasProximas}</p>
              <p className="text-xs text-muted-foreground">em 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Banco Horas</span>
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-4 h-4 text-primary" /></div>
              </div>
              <p className={`text-2xl font-bold ${stats.bancoHorasTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {stats.bancoHorasTotal >= 0 ? '+' : ''}{stats.bancoHorasTotal}h
              </p>
              <p className="text-xs text-muted-foreground">acumulado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Folha Mensal</span>
                <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-xl font-bold">
                R$ {stats.custoFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee Cards */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-lg font-bold text-foreground">Colaboradores ({filtered.length})</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum colaborador encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filtered.map(emp => {
                const lastEval = lastEvaluations.get(emp.id);
                const hasVacAlert = vacationAlerts.has(emp.id);
                const hasTrainAlert = trainingAlerts.has(emp.id);
                const empHours = hoursAlerts.get(emp.id) || 0;
                const hasHoursAlert = empHours > 40;

                const statusColor = emp.status === 'ativo'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : emp.status === 'ferias'
                    ? 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                    : 'bg-muted text-muted-foreground border-border';

                return (
                  <Card key={emp.id} className="border transition-all hover:shadow-md">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {emp.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{emp.nome}</p>
                            <p className="text-xs text-muted-foreground">{emp.cargo}</p>
                          </div>
                        </div>
                        {!isViewer && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
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
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${statusColor}`}>
                          {emp.status === 'ativo' ? 'Ativo' : emp.status === 'ferias' ? 'Férias' : emp.status === 'afastado' ? 'Afastado' : 'Inativo'}
                        </Badge>
                        {lastEval && (
                          <span className="text-lg" title={`Última avaliação: ${lastEval}/4`}>{notaEmoji[lastEval]}</span>
                        )}
                      </div>

                      {/* Alert indicators */}
                      {(hasVacAlert || hasTrainAlert || hasHoursAlert) && (
                        <div className="flex flex-wrap gap-1.5">
                          {hasVacAlert && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30 gap-1">
                              <Calendar className="w-3 h-3" /> Férias
                            </Badge>
                          )}
                          {hasTrainAlert && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                              <GraduationCap className="w-3 h-3" /> Treinamento
                            </Badge>
                          )}
                          {hasHoursAlert && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1">
                              <Clock className="w-3 h-3" /> {empHours.toFixed(0)}h extras
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardRH;
