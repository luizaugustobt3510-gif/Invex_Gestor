import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Calendar, AlertTriangle, TrendingDown, Clock, Search, MoreVertical, DollarSign, GraduationCap, Star, HeartPulse, Filter, UserMinus, Cake, Timer, BarChart3, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { DesligamentoDialog } from './DesligamentoDialog';
import { InsightsRH } from './InsightsRH';
import { AlertActionSheet, type AlertEmployee } from '@/components/rh/AlertActionSheet';
import * as XLSX from 'xlsx';

const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };

interface AlertItem {
  type: 'ferias' | 'treinamento' | 'aso' | 'banco_horas' | 'absenteismo' | 'turnover' | 'risco_trabalhista';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  route: string;
  count?: number;
  actionable: boolean;
  employeeIds?: string[];
}

const DashboardRH = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'visualizador';
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [employees, setEmployees] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalColaboradores: 0, ativos: 0, absenteismo: 0, turnover: 0,
    feriasProximas: 0, atestadosMes: 0, bancoHorasTotal: 0, custoFolha: 0,
    tempoMedioPermanencia: 0, taxaRetencao: 0, mediaIdade: 0, admissoesPeriodo: 0, desligamentosPeriodo: 0,
  });
  const [lastEvaluations, setLastEvaluations] = useState<Map<string, number>>(new Map());
  const [vacationAlerts, setVacationAlerts] = useState<Set<string>>(new Set());
  const [trainingAlerts, setTrainingAlerts] = useState<Set<string>>(new Set());
  const [asoAlerts, setAsoAlerts] = useState<Map<string, string>>(new Map());
  const [hoursAlerts, setHoursAlerts] = useState<Map<string, number>>(new Map());
  const [desligOpen, setDesligOpen] = useState(false);
  const [desligEmployee, setDesligEmployee] = useState<{ id: string; nome: string } | null>(null);
  const [allTerminations, setAllTerminations] = useState<any[]>([]);
  const [allCertificates, setAllCertificates] = useState<any[]>([]);
  const [allTrainings, setAllTrainings] = useState<any[]>([]);
  const [allAsos, setAllAsos] = useState<any[]>([]);
  const [allVacations, setAllVacations] = useState<any[]>([]);
  const [catalogTrainings, setCatalogTrainings] = useState<any[]>([]);

  // Action sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<'ferias' | 'treinamento' | 'aso' | null>(null);
  const [sheetEmployees, setSheetEmployees] = useState<AlertEmployee[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [empRes, vacRes, certRes, timeRes, evalRes, trainRes, asoRes, termRes, catalogRes, allVacRes] = await Promise.all([
        supabase.from('employees').select('*').order('nome'),
        supabase.from('employee_vacations').select('*, employees(nome)').gte('data_inicio', hoje).lte('data_inicio', em30dias),
        supabase.from('employee_certificates').select('dias, data_inicio, employee_id').gte('data_inicio', inicioMes),
        supabase.from('time_records').select('employee_id, horas_extras').gte('data', inicioMes),
        supabase.from('performance_evaluations').select('employee_id, nota, created_at').order('created_at', { ascending: false }),
        supabase.from('employee_trainings').select('employee_id, data_validade, trainings(nome, obrigatorio)').not('data_validade', 'is', null),
        supabase.from('employee_asos').select('employee_id, data_vencimento, tipo').not('data_vencimento', 'is', null),
        supabase.from('employee_terminations').select('*, employees(nome, cargo, departamento)').order('data_desligamento', { ascending: false }),
        supabase.from('trainings').select('*').order('nome'),
        supabase.from('employee_vacations').select('employee_id, status, data_inicio, data_fim'),
      ]);

      const emps = empRes.data || [];
      const terms = termRes.data || [];
      const certs = certRes.data || [];
      const trains = trainRes.data || [];
      const asosData = asoRes.data || [];
      const vacsData = vacRes.data || [];
      const allVacsData = allVacRes.data || [];

      setAllTerminations(terms);
      setAllCertificates(certs);
      setAllTrainings(trains);
      setAllAsos(asosData);
      setAllVacations(vacsData);
      setCatalogTrainings(catalogRes.data || []);

      // Auto-update vacation statuses
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      for (const vac of allVacsData) {
        let newStatus: string | null = null;
        if (vac.status === 'agendada' && vac.data_inicio <= todayStr && vac.data_fim >= todayStr) {
          newStatus = 'em_andamento';
        } else if ((vac.status === 'agendada' || vac.status === 'em_andamento') && vac.data_fim < todayStr) {
          newStatus = 'concluida';
        }
        if (newStatus) {
          await supabase.from('employee_vacations').update({ status: newStatus }).eq('employee_id', vac.employee_id).eq('data_inicio', vac.data_inicio);
        }
      }

      const totalColaboradores = emps.length;
      const ativosEmps = emps.filter(e => e.status === 'ativo');
      const ativos = ativosEmps.length;
      const diasAtestado = certs.reduce((s: number, c: any) => s + (c.dias || 0), 0);
      const absenteismo = ativos > 0 ? Math.round((diasAtestado / (ativos * 22)) * 1000) / 10 : 0;
      const admMes = emps.filter(e => e.data_admissao >= inicioMes).length;
      const desligMes = terms.filter(t => t.data_desligamento >= inicioMes).length;
      const turnover = totalColaboradores > 0 ? Math.round(((admMes + desligMes) / totalColaboradores) * 1000) / 10 : 0;
      const bancoHorasTotal = (timeRes.data || []).reduce((s: number, t: any) => s + (t.horas_extras || 0), 0);
      const custoFolha = ativosEmps.reduce((s: number, e: any) => s + Number(e.salario || 0), 0);

      const tempoMedioPermanencia = ativosEmps.length > 0 ? Math.round(ativosEmps.reduce((s, e) => {
        const adm = new Date(e.data_admissao);
        return s + ((now.getTime() - adm.getTime()) / (86400000 * 30));
      }, 0) / ativosEmps.length) : 0;

      const taxaRetencao = totalColaboradores > 0 ? Math.round(((totalColaboradores - terms.length) / totalColaboradores) * 1000) / 10 : 100;

      const empsComIdade = ativosEmps.filter(e => e.data_nascimento);
      const mediaIdade = empsComIdade.length > 0 ? Math.round(empsComIdade.reduce((s, e) => {
        const nasc = new Date(e.data_nascimento);
        return s + ((now.getTime() - nasc.getTime()) / (86400000 * 365.25));
      }, 0) / empsComIdade.length) : 0;

      const depts = [...new Set(emps.map((e: any) => e.departamento || '').filter(Boolean))].sort();
      setDepartments(depts);

      const evalMap = new Map<string, number>();
      (evalRes.data || []).forEach((ev: any) => {
        if (!evalMap.has(ev.employee_id)) evalMap.set(ev.employee_id, ev.nota);
      });
      setLastEvaluations(evalMap);

      // Check employees with active/scheduled vacation (non-cancelled)
      const employeesWithVacation = new Set(
        allVacsData.filter((v: any) => v.status !== 'cancelada').map((v: any) => v.employee_id)
      );

      // Vacation alerts
      const vacAlerts = new Set<string>();
      emps.forEach((emp: any) => {
        if (emp.status !== 'ativo') return;
        const admDate = new Date(emp.data_admissao);
        const monthsSinceAdm = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        if (monthsSinceAdm >= 10 && !employeesWithVacation.has(emp.id)) {
          vacAlerts.add(emp.id);
        }
      });
      setVacationAlerts(vacAlerts);

      // Training alerts — only if latest training for that employee is expired or expiring
      const trainAlerts = new Set<string>();
      const latestTrainByEmployee = new Map<string, string>();
      trains.forEach((et: any) => {
        if (!et.data_validade) return;
        const current = latestTrainByEmployee.get(et.employee_id);
        if (!current || et.data_validade > current) {
          latestTrainByEmployee.set(et.employee_id, et.data_validade);
        }
      });
      latestTrainByEmployee.forEach((validade, empId) => {
        const diff = (new Date(validade).getTime() - Date.now()) / 86400000;
        if (diff <= 30) trainAlerts.add(empId);
      });
      setTrainingAlerts(trainAlerts);

      // ASO alerts
      const latestAsoByEmployee = new Map<string, string>();
      asosData.forEach((aso: any) => {
        if (!aso.data_vencimento) return;
        const current = latestAsoByEmployee.get(aso.employee_id);
        if (!current || aso.data_vencimento > current) {
          latestAsoByEmployee.set(aso.employee_id, aso.data_vencimento);
        }
      });
      const asoMap = new Map<string, string>();
      latestAsoByEmployee.forEach((vencimento, empId) => {
        const diff = (new Date(vencimento).getTime() - Date.now()) / 86400000;
        if (diff < 0) asoMap.set(empId, 'vencido');
        else if (diff <= 30) asoMap.set(empId, 'proximo');
      });
      setAsoAlerts(asoMap);

      const horasPorEmp = new Map<string, number>();
      (timeRes.data || []).forEach((t: any) => {
        horasPorEmp.set(t.employee_id, (horasPorEmp.get(t.employee_id) || 0) + (t.horas_extras || 0));
      });
      setHoursAlerts(horasPorEmp);

      // Build actionable alerts sorted by priority
      const newAlerts: AlertItem[] = [];

      // Critical: labor risk
      const riscoIds = [...vacAlerts].filter(id => {
        const emp = emps.find((e: any) => e.id === id);
        if (!emp) return false;
        const admDate = new Date(emp.data_admissao);
        const months = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        return months >= 23;
      });
      if (riscoIds.length > 0) {
        newAlerts.push({ type: 'risco_trabalhista', message: `⚠️ ${riscoIds.length} colaborador(es) com risco trabalhista de férias`, severity: 'critical', route: '/rh/ferias', count: riscoIds.length, actionable: true, employeeIds: riscoIds });
      }

      // Critical: ASO vencido
      const asoVencidoIds = [...asoMap.entries()].filter(([, v]) => v === 'vencido').map(([k]) => k);
      if (asoVencidoIds.length > 0) {
        newAlerts.push({ type: 'aso', message: `${asoVencidoIds.length} ASO(s) vencido(s)`, severity: 'critical', route: '/rh/aso', count: asoVencidoIds.length, actionable: true, employeeIds: asoVencidoIds });
      }

      // Critical: Training expired
      const trainExpiredIds = [...trainAlerts].filter(id => {
        const val = latestTrainByEmployee.get(id);
        return val && new Date(val).getTime() < Date.now();
      });
      if (trainExpiredIds.length > 0) {
        newAlerts.push({ type: 'treinamento', message: `${trainExpiredIds.length} treinamento(s) vencido(s)`, severity: 'critical', route: '/rh/treinamentos', count: trainExpiredIds.length, actionable: true, employeeIds: trainExpiredIds });
      }

      // Warning: ASO próximo
      const asoProximoIds = [...asoMap.entries()].filter(([, v]) => v === 'proximo').map(([k]) => k);
      if (asoProximoIds.length > 0) {
        newAlerts.push({ type: 'aso', message: `${asoProximoIds.length} ASO(s) próximo(s) do vencimento`, severity: 'warning', route: '/rh/aso', count: asoProximoIds.length, actionable: true, employeeIds: asoProximoIds });
      }

      // Warning: Training expiring soon
      const trainSoonIds = [...trainAlerts].filter(id => {
        const val = latestTrainByEmployee.get(id);
        if (!val) return false;
        const diff = (new Date(val).getTime() - Date.now()) / 86400000;
        return diff >= 0 && diff <= 30;
      });
      if (trainSoonIds.length > 0) {
        newAlerts.push({ type: 'treinamento', message: `${trainSoonIds.length} treinamento(s) próximo(s) de vencer`, severity: 'warning', route: '/rh/treinamentos', count: trainSoonIds.length, actionable: true, employeeIds: trainSoonIds });
      }

      // Warning: Férias pending (non-risk)
      const feriasPendingIds = [...vacAlerts].filter(id => !riscoIds.includes(id));
      if (feriasPendingIds.length > 0) {
        newAlerts.push({ type: 'ferias', message: `${feriasPendingIds.length} colaborador(es) com férias pendentes`, severity: 'warning', route: '/rh/ferias', count: feriasPendingIds.length, actionable: true, employeeIds: feriasPendingIds });
      }

      // Info alerts
      let hoursExceedCount = 0;
      horasPorEmp.forEach((total) => { if (total > 40) hoursExceedCount++; });
      if (hoursExceedCount > 0) newAlerts.push({ type: 'banco_horas', message: `${hoursExceedCount} colaborador(es) com banco de horas excedente`, severity: 'warning', route: '/rh/banco-de-horas', count: hoursExceedCount, actionable: false });
      if (absenteismo > 5) newAlerts.push({ type: 'absenteismo', message: `Absenteísmo elevado: ${absenteismo}%`, severity: 'warning', route: '/rh/analises', actionable: false });
      if (turnover > 10) newAlerts.push({ type: 'turnover', message: `Turnover acima da média: ${turnover}%`, severity: 'info', route: '/rh/analises', actionable: false });

      setAlerts(newAlerts);
      setEmployees(emps);
      setStats({
        totalColaboradores, ativos, absenteismo, turnover,
        feriasProximas: vacsData.length || 0, atestadosMes: certs.length || 0,
        bancoHorasTotal: Math.round(bancoHorasTotal * 10) / 10, custoFolha,
        tempoMedioPermanencia, taxaRetencao, mediaIdade, admissoesPeriodo: admMes, desligamentosPeriodo: desligMes,
      });
    } catch (err) {
      console.error('Erro dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAlertSheet = (alert: AlertItem) => {
    if (!alert.actionable || !alert.employeeIds?.length) {
      navigate(alert.route);
      return;
    }
    const empList: AlertEmployee[] = alert.employeeIds
      .map(id => employees.find(e => e.id === id))
      .filter(Boolean)
      .map(e => ({ id: e.id, nome: e.nome, cargo: e.cargo, departamento: e.departamento, data_admissao: e.data_admissao, company_id: e.company_id }));

    const actionType = alert.type === 'risco_trabalhista' ? 'ferias' : alert.type;
    if (actionType === 'ferias' || actionType === 'treinamento' || actionType === 'aso') {
      setSheetType(actionType);
      setSheetEmployees(empList);
      setSheetOpen(true);
    } else {
      navigate(alert.route);
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

      addSheet('Colaboradores', (empR.data || []).map(e => ({ Nome: e.nome, CPF: e.cpf, Cargo: e.cargo, Departamento: e.departamento, Status: e.status, Admissão: e.data_admissao, Salário: e.salario })));
      addSheet('Férias', (vacR.data || []).map((v: any) => ({ Colaborador: v.employees?.nome, Início: v.data_inicio, Fim: v.data_fim, Dias: v.dias, Status: v.status })));
      addSheet('Atestados', (certR.data || []).map((c: any) => ({ Colaborador: c.employees?.nome, Início: c.data_inicio, Fim: c.data_fim, Dias: c.dias, Motivo: c.motivo })));
      addSheet('Banco de Horas', (timeR.data || []).map((t: any) => ({ Colaborador: t.employees?.nome, Data: t.data, Entrada: t.entrada, Saída: t.saida, 'Horas Trab.': t.horas_trabalhadas, 'Horas Extras': t.horas_extras })));
      addSheet('Treinamentos', (trainR.data || []).map((t: any) => ({ Colaborador: t.employees?.nome, Treinamento: t.trainings?.nome, Realização: t.data_realizacao, Validade: t.data_validade, Status: t.status })));
      addSheet('Avaliações', (evalR.data || []).map((e: any) => ({ Colaborador: e.employees?.nome, Nota: e.nota, Observações: e.observacoes, Data: e.created_at?.split('T')[0] })));

      XLSX.writeFile(wb, `Backup_GP_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      toast({ title: 'Backup exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  };

  const getCardStatus = (empId: string, empStatus: string) => {
    if (empStatus !== 'ativo') return 'neutral';
    const hasAsoVencido = asoAlerts.get(empId) === 'vencido';
    const hasTrainVencido = trainingAlerts.has(empId);
    if (hasAsoVencido || hasTrainVencido) return 'red';
    const hasAsoProximo = asoAlerts.get(empId) === 'proximo';
    const hasVacAlert = vacationAlerts.has(empId);
    const hasHoursAlert = (hoursAlerts.get(empId) || 0) > 40;
    if (hasAsoProximo || hasVacAlert || hasHoursAlert) return 'yellow';
    return 'green';
  };

  const cardBorderColor: Record<string, string> = {
    green: 'border-l-4 border-l-emerald-500',
    yellow: 'border-l-4 border-l-amber-500',
    red: 'border-l-4 border-l-destructive',
    neutral: 'border-l-4 border-l-muted',
  };

  const severityStyles: Record<string, { bg: string; text: string; icon: string }> = {
    critical: { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive', icon: '🔴' },
    warning: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-700', icon: '🟡' },
    info: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700', icon: '🔵' },
  };

  const filtered = employees.filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.cargo.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === 'todos' || (e.departamento || '') === sectorFilter;
    return matchSearch && matchSector;
  });

  const sectorStats = departments.length > 0 ? departments.map(dept => {
    const deptEmps = employees.filter(e => e.departamento === dept);
    return { dept, count: deptEmps.length, ativos: deptEmps.filter(e => e.status === 'ativo').length };
  }) : [];

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');
  const visibleAlerts = alertsExpanded ? alerts : alerts.slice(0, 4);

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestão de Pessoas</h1>

        {/* Priority-based Actionable Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">{alerts.length} Alerta(s)</span>
                  {criticalAlerts.length > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{criticalAlerts.length} crítico(s)</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {visibleAlerts.map((a, i) => {
                  const style = severityStyles[a.severity];
                  return (
                    <button
                      key={i}
                      onClick={() => openAlertSheet(a)}
                      className={`text-xs sm:text-sm w-full text-left px-3 py-2 rounded-md border transition-all hover:shadow-sm cursor-pointer flex items-center justify-between gap-2 ${style.bg}`}
                    >
                      <span className={`flex items-center gap-2 min-w-0 ${style.text}`}>
                        <span className="text-xs">{style.icon}</span>
                        <span className="truncate">{a.message}</span>
                      </span>
                      {a.actionable ? (
                        <Badge variant="outline" className="text-[10px] shrink-0 gap-1 border-current">
                          <Zap className="w-3 h-3" /> Resolver
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">→</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {alerts.length > 4 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setAlertsExpanded(!alertsExpanded)}>
                  {alertsExpanded ? <><ChevronUp className="w-3 h-3 mr-1" /> Mostrar menos</> : <><ChevronDown className="w-3 h-3 mr-1" /> +{alerts.length - 4} outros alertas</>}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Indicator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            { label: 'Colaboradores', value: stats.ativos, sub: `de ${stats.totalColaboradores} total`, icon: <Users className="w-4 h-4 text-primary" />, bg: 'bg-primary/10' },
            { label: 'Absenteísmo', value: `${stats.absenteismo}%`, sub: `${stats.atestadosMes} atestados`, icon: <TrendingDown className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-500/10' },
            { label: 'Turnover', value: `${stats.turnover}%`, sub: 'no mês', icon: <TrendingDown className="w-4 h-4 text-destructive" />, bg: 'bg-destructive/10' },
            { label: 'Férias Próx.', value: stats.feriasProximas, sub: 'em 30 dias', icon: <Calendar className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-500/10' },
            { label: 'Banco Horas', value: `${stats.bancoHorasTotal >= 0 ? '+' : ''}${stats.bancoHorasTotal}h`, sub: 'acumulado', icon: <Clock className="w-4 h-4 text-primary" />, bg: 'bg-primary/10', extraClass: stats.bancoHorasTotal >= 0 ? 'text-emerald-600' : 'text-destructive' },
            { label: 'Folha Mensal', value: `R$ ${stats.custoFolha.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, sub: 'ativos', icon: <DollarSign className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10' },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{item.label}</span>
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.bg}`}>{item.icon}</div>
                </div>
                <p className={`text-lg sm:text-2xl font-bold ${'extraClass' in item ? item.extraClass : ''}`}>{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2 indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Tempo Médio', value: `${stats.tempoMedioPermanencia} meses`, sub: 'permanência', icon: <Timer className="w-4 h-4 text-primary" />, bg: 'bg-primary/10' },
            { label: 'Retenção', value: `${stats.taxaRetencao}%`, sub: 'taxa de retenção', icon: <Users className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10' },
            { label: 'Idade Média', value: `${stats.mediaIdade} anos`, sub: 'da equipe', icon: <Users className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-500/10' },
            { label: 'Admissões', value: `+${stats.admissoesPeriodo}`, sub: 'no período', icon: <Users className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10' },
            { label: 'Desligamentos', value: stats.desligamentosPeriodo, sub: 'no período', icon: <UserMinus className="w-4 h-4 text-destructive" />, bg: 'bg-destructive/10' },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{item.label}</span>
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.bg}`}>{item.icon}</div>
                </div>
                <p className="text-lg sm:text-2xl font-bold">{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custo por setor */}
        {(() => {
          const ativosEmps = employees.filter(e => e.status === 'ativo');
          const custoPorSetor: Record<string, number> = {};
          ativosEmps.forEach(e => {
            const dept = e.departamento || 'Sem setor';
            custoPorSetor[dept] = (custoPorSetor[dept] || 0) + Number(e.salario || 0);
          });
          const setores = Object.entries(custoPorSetor).sort((a, b) => b[1] - a[1]);
          if (setores.length === 0) return null;
          const custoMedio = ativosEmps.length > 0 ? stats.custoFolha / ativosEmps.length : 0;
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 font-medium mb-3 text-foreground">
                    <DollarSign className="w-4 h-4" /> Custo por Setor
                  </div>
                  <div className="space-y-2">
                    {setores.map(([dept, custo]) => (
                      <div key={dept} className="flex items-center justify-between py-1.5 px-2 border-b border-border/50 last:border-0">
                        <span className="text-sm truncate mr-2">{dept}</span>
                        <span className="text-sm font-bold shrink-0">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 font-medium mb-3 text-foreground">
                    <BarChart3 className="w-4 h-4" /> Resumo Financeiro
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Folha mensal total</span><span className="font-bold">{stats.custoFolha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">Custo médio / colaborador</span><span className="font-bold">{custoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    {allTerminations.length > 0 && (
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Impacto turnover (est.)</span><span className="font-bold text-destructive">{(allTerminations.length * custoMedio * 1.5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Insights */}
        <InsightsRH
          employees={employees}
          terminations={allTerminations}
          certificates={allCertificates}
          trainings={allTrainings}
          asos={allAsos}
          vacations={allVacations}
        />

        {/* Birthday Card */}
        {(() => {
          const now = new Date();
          const currentMonth = now.getMonth();
          const aniversariantes = employees.filter(e => {
            if (!e.data_nascimento || e.status !== 'ativo') return false;
            const bd = new Date(e.data_nascimento + 'T00:00:00');
            return bd.getMonth() === currentMonth;
          }).sort((a, b) => {
            const da = new Date(a.data_nascimento + 'T00:00:00').getDate();
            const db = new Date(b.data_nascimento + 'T00:00:00').getDate();
            return da - db;
          });
          if (aniversariantes.length === 0) return null;
          return (
            <Card className="border-pink-500/30 bg-pink-500/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 text-pink-700 font-medium mb-3">
                  <Cake className="w-5 h-5" /> 🎂 Aniversariantes do Mês ({aniversariantes.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {aniversariantes.map(emp => {
                    const bd = new Date(emp.data_nascimento + 'T00:00:00');
                    return (
                      <div key={emp.id} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border/50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-sm font-bold text-pink-600">
                          {bd.getDate()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{emp.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.cargo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Sector Stats */}
        {sectorStats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sectorStats.map(s => (
              <Card key={s.dept} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSectorFilter(s.dept)}>
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase truncate">{s.dept}</p>
                  <p className="text-lg font-bold">{s.ativos} <span className="text-xs font-normal text-muted-foreground">ativos</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Employee Cards */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-foreground">Colaboradores ({filtered.length})</h2>
            <div className="flex flex-wrap items-center gap-2">
              {departments.length > 0 && (
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-44 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Sem pendências</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> Prestes a vencer</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive" /> Vencido / Atenção</span>
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
                const asoStatus = asoAlerts.get(emp.id);
                const cardStatus = getCardStatus(emp.id, emp.status);

                return (
                  <Card key={emp.id} className={`transition-all hover:shadow-md ${cardBorderColor[cardStatus]}`}>
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary">
                            {emp.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{emp.nome}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{emp.cargo}</p>
                            {emp.departamento && <p className="text-[10px] text-muted-foreground truncate">{emp.departamento}</p>}
                          </div>
                        </div>
                        {!isViewer && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate('/rh/colaboradores')}>Editar colaborador</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSheetType('ferias');
                                setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                                setSheetOpen(true);
                              }}>Programar férias</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/rh/atestados')}>Registrar atestado</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSheetType('treinamento');
                                setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                                setSheetOpen(true);
                              }}>Adicionar treinamento</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/rh/avaliacoes')}>Avaliar desempenho</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/rh/banco-de-horas')}>Ajustar banco de horas</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSheetType('aso');
                                setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                                setSheetOpen(true);
                              }}>Registrar ASO</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDesligEmployee({ id: emp.id, nome: emp.nome }); setDesligOpen(true); }}>
                                <UserMinus className="w-4 h-4 mr-2" /> Registrar desligamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] sm:text-xs ${
                          emp.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                          emp.status === 'ferias' ? 'bg-blue-500/15 text-blue-700 border-blue-500/30' :
                          emp.status === 'desligado' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {emp.status === 'ativo' ? 'Ativo' : emp.status === 'ferias' ? 'Férias' : emp.status === 'afastado' ? 'Afastado' : emp.status === 'desligado' ? 'Desligado' : 'Inativo'}
                        </Badge>
                        {lastEval && (
                          <span className="text-lg" title={`Última avaliação: ${lastEval}/4`}>{notaEmoji[lastEval]}</span>
                        )}
                      </div>

                      {/* Alert indicators — clickable to open action sheet */}
                      {(hasVacAlert || hasTrainAlert || hasHoursAlert || asoStatus) && (
                        <div className="flex flex-wrap gap-1.5">
                          {hasVacAlert && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30 gap-1 cursor-pointer" onClick={() => {
                              setSheetType('ferias');
                              setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                              setSheetOpen(true);
                            }}>
                              <Calendar className="w-3 h-3" /> Férias
                            </Badge>
                          )}
                          {hasTrainAlert && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1 cursor-pointer" onClick={() => {
                              setSheetType('treinamento');
                              setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                              setSheetOpen(true);
                            }}>
                              <GraduationCap className="w-3 h-3" /> Treinamento
                            </Badge>
                          )}
                          {asoStatus && (
                            <Badge variant="outline" className={`text-[10px] gap-1 cursor-pointer ${asoStatus === 'vencido' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}`} onClick={() => {
                              setSheetType('aso');
                              setSheetEmployees([{ id: emp.id, nome: emp.nome, cargo: emp.cargo, departamento: emp.departamento, data_admissao: emp.data_admissao, company_id: emp.company_id }]);
                              setSheetOpen(true);
                            }}>
                              <HeartPulse className="w-3 h-3" /> ASO
                            </Badge>
                          )}
                          {hasHoursAlert && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1 cursor-pointer" onClick={() => navigate('/rh/banco-de-horas')}>
                              <Clock className="w-3 h-3" /> {empHours.toFixed(0)}h
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

      <DesligamentoDialog
        open={desligOpen}
        onOpenChange={setDesligOpen}
        employee={desligEmployee}
        onSuccess={loadData}
      />

      <AlertActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        type={sheetType}
        employees={sheetEmployees}
        trainings={catalogTrainings}
        onSuccess={loadData}
      />
    </MainLayout>
  );
};

export default DashboardRH;
