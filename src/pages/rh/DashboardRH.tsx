import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Calendar, AlertTriangle, TrendingDown, Clock, Search, MoreVertical, DollarSign, GraduationCap, Star, HeartPulse, Filter, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { DesligamentoDialog } from './DesligamentoDialog';
import * as XLSX from 'xlsx';

const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };

interface AlertItem {
  type: string;
  message: string;
  severity: 'warning' | 'error';
  route: string;
  count?: number;
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
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalColaboradores: 0, ativos: 0, absenteismo: 0, turnover: 0,
    feriasProximas: 0, atestadosMes: 0, bancoHorasTotal: 0, custoFolha: 0,
  });
  const [lastEvaluations, setLastEvaluations] = useState<Map<string, number>>(new Map());
  const [vacationAlerts, setVacationAlerts] = useState<Set<string>>(new Set());
  const [trainingAlerts, setTrainingAlerts] = useState<Set<string>>(new Set());
  const [asoAlerts, setAsoAlerts] = useState<Map<string, string>>(new Map()); // empId -> 'vencido' | 'proximo'
  const [hoursAlerts, setHoursAlerts] = useState<Map<string, number>>(new Map());
  const [desligOpen, setDesligOpen] = useState(false);
  const [desligEmployee, setDesligEmployee] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [empRes, vacRes, certRes, timeRes, evalRes, trainRes, asoRes] = await Promise.all([
        supabase.from('employees').select('*').order('nome'),
        supabase.from('employee_vacations').select('*, employees(nome)').gte('data_inicio', hoje).lte('data_inicio', em30dias),
        supabase.from('employee_certificates').select('dias, data_inicio').gte('data_inicio', inicioMes),
        supabase.from('time_records').select('employee_id, horas_extras').gte('data', inicioMes),
        supabase.from('performance_evaluations').select('employee_id, nota, created_at').order('created_at', { ascending: false }),
        supabase.from('employee_trainings').select('employee_id, data_validade, trainings(nome, obrigatorio)').not('data_validade', 'is', null),
        supabase.from('employee_asos').select('employee_id, data_vencimento, tipo').not('data_vencimento', 'is', null),
      ]);

      const emps = empRes.data || [];
      const totalColaboradores = emps.length;
      const ativos = emps.filter(e => e.status === 'ativo').length;
      const diasAtestado = (certRes.data || []).reduce((s: number, c: any) => s + (c.dias || 0), 0);
      const absenteismo = ativos > 0 ? Math.round((diasAtestado / (ativos * 22)) * 1000) / 10 : 0;
      const inativos = emps.filter(e => e.status === 'inativo').length;
      const admMes = emps.filter(e => e.data_admissao >= inicioMes).length;
      const turnover = totalColaboradores > 0 ? Math.round(((admMes + inativos) / totalColaboradores) * 1000) / 10 : 0;
      const bancoHorasTotal = (timeRes.data || []).reduce((s: number, t: any) => s + (t.horas_extras || 0), 0);
      const custoFolha = emps.filter(e => e.status === 'ativo').reduce((s: number, e: any) => s + Number(e.salario || 0), 0);

      // Departments
      const depts = [...new Set(emps.map((e: any) => e.departamento || '').filter(Boolean))].sort();
      setDepartments(depts);

      // Last evaluations per employee
      const evalMap = new Map<string, number>();
      (evalRes.data || []).forEach((ev: any) => {
        if (!evalMap.has(ev.employee_id)) evalMap.set(ev.employee_id, ev.nota);
      });
      setLastEvaluations(evalMap);

      // Vacation alerts - automatic period calculation
      const vacAlerts = new Set<string>();
      emps.forEach((emp: any) => {
        if (emp.status !== 'ativo') return;
        const admDate = new Date(emp.data_admissao);
        const now = new Date();
        const monthsSinceAdm = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        // Alert when approaching 12-month acquisition period or exceeding concessive period (23 months)
        if (monthsSinceAdm >= 10 && monthsSinceAdm < 12) vacAlerts.add(emp.id); // approaching
        if (monthsSinceAdm >= 23) vacAlerts.add(emp.id); // labor risk!
      });
      (vacRes.data || []).forEach((v: any) => { if (v.employee_id) vacAlerts.add(v.employee_id); });
      setVacationAlerts(vacAlerts);

      // Training alerts
      const trainAlerts = new Set<string>();
      (trainRes.data || []).forEach((et: any) => {
        if (!et.data_validade) return;
        const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
        if (diff <= 30) trainAlerts.add(et.employee_id);
      });
      setTrainingAlerts(trainAlerts);

      // ASO alerts
      const asoMap = new Map<string, string>();
      (asoRes.data || []).forEach((aso: any) => {
        if (!aso.data_vencimento) return;
        const diff = (new Date(aso.data_vencimento).getTime() - Date.now()) / 86400000;
        if (diff < 0) asoMap.set(aso.employee_id, 'vencido');
        else if (diff <= 30 && !asoMap.has(aso.employee_id)) asoMap.set(aso.employee_id, 'proximo');
      });
      setAsoAlerts(asoMap);

      // Hours per employee
      const horasPorEmp = new Map<string, number>();
      (timeRes.data || []).forEach((t: any) => {
        horasPorEmp.set(t.employee_id, (horasPorEmp.get(t.employee_id) || 0) + (t.horas_extras || 0));
      });
      setHoursAlerts(horasPorEmp);

      // Generate clickable alerts
      const newAlerts: AlertItem[] = [];
      const vacCount = vacAlerts.size;
      if (vacCount > 0) newAlerts.push({ type: 'ferias', message: `${vacCount} colaborador(es) com férias próximas ou período aquisitivo`, severity: 'warning', route: '/rh/ferias', count: vacCount });
      const trainCount = trainAlerts.size;
      if (trainCount > 0) newAlerts.push({ type: 'treinamento', message: `${trainCount} treinamento(s) vencido(s) ou próximo(s) de vencer`, severity: 'error', route: '/rh/treinamentos', count: trainCount });
      const asoVencidos = [...asoMap.values()].filter(v => v === 'vencido').length;
      const asoProximos = [...asoMap.values()].filter(v => v === 'proximo').length;
      if (asoVencidos > 0) newAlerts.push({ type: 'aso', message: `${asoVencidos} ASO(s) vencido(s)`, severity: 'error', route: '/rh/aso' });
      if (asoProximos > 0) newAlerts.push({ type: 'aso', message: `${asoProximos} ASO(s) próximo(s) do vencimento`, severity: 'warning', route: '/rh/aso' });
      let hoursExceedCount = 0;
      horasPorEmp.forEach((total) => { if (total > 40) hoursExceedCount++; });
      if (hoursExceedCount > 0) newAlerts.push({ type: 'banco_horas', message: `${hoursExceedCount} colaborador(es) com banco de horas excedente`, severity: 'warning', route: '/rh/banco-de-horas' });
      if (absenteismo > 5) newAlerts.push({ type: 'absenteismo', message: `Absenteísmo elevado: ${absenteismo}%`, severity: 'error', route: '/rh/indicadores' });
      if (turnover > 10) newAlerts.push({ type: 'turnover', message: `Turnover acima da média: ${turnover}%`, severity: 'warning', route: '/rh/indicadores' });

      // Labor risk alerts
      emps.forEach((emp: any) => {
        if (emp.status !== 'ativo') return;
        const admDate = new Date(emp.data_admissao);
        const now = new Date();
        const monthsSinceAdm = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
        if (monthsSinceAdm >= 23) {
          newAlerts.push({ type: 'risco_trabalhista', message: `⚠️ ${emp.nome}: período concessivo de férias vencendo — risco trabalhista!`, severity: 'error', route: '/rh/ferias' });
        }
      });

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

      addSheet('Colaboradores', (empR.data || []).map(e => ({ Nome: e.nome, CPF: e.cpf, Cargo: e.cargo, Departamento: e.departamento, Status: e.status, Admissão: e.data_admissao, Salário: e.salario })));
      addSheet('Férias', (vacR.data || []).map((v: any) => ({ Colaborador: v.employees?.nome, Início: v.data_inicio, Fim: v.data_fim, Dias: v.dias, Status: v.status })));
      addSheet('Atestados', (certR.data || []).map((c: any) => ({ Colaborador: c.employees?.nome, Início: c.data_inicio, Fim: c.data_fim, Dias: c.dias, Motivo: c.motivo })));
      addSheet('Banco de Horas', (timeR.data || []).map((t: any) => ({ Colaborador: t.employees?.nome, Data: t.data, Entrada: t.entrada, Saída: t.saida, 'Horas Trab.': t.horas_trabalhadas, 'Horas Extras': t.horas_extras })));
      addSheet('Treinamentos', (trainR.data || []).map((t: any) => ({ Colaborador: t.employees?.nome, Treinamento: t.trainings?.nome, Realização: t.data_realizacao, Validade: t.data_validade, Status: t.status })));
      addSheet('Avaliações', (evalR.data || []).map((e: any) => ({ Colaborador: e.employees?.nome, Nota: e.nota, Observações: e.observacoes, Data: e.created_at?.split('T')[0] })));

      XLSX.writeFile(wb, `Backup_RH_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      toast({ title: 'Backup RH exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  };

  // Determine card color based on pendencies
  const getCardStatus = (empId: string, empStatus: string) => {
    if (empStatus !== 'ativo') return 'neutral';
    const hasAsoVencido = asoAlerts.get(empId) === 'vencido';
    const hasTrainVencido = trainingAlerts.has(empId);
    // Check if training is actually expired (not just near)
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

  const filtered = employees.filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.cargo.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === 'todos' || (e.departamento || '') === sectorFilter;
    return matchSearch && matchSector;
  });

  // Sector stats
  const sectorStats = departments.length > 0 ? departments.map(dept => {
    const deptEmps = employees.filter(e => e.departamento === dept);
    return { dept, count: deptEmps.length, ativos: deptEmps.filter(e => e.status === 'ativo').length };
  }) : [];

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

        {/* Clickable Alerts */}
        {alerts.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /> {alerts.length} Alerta(s)
              </div>
              {alerts.slice(0, 8).map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.route)}
                  className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-amber-500/10 transition-colors cursor-pointer ${a.severity === 'error' ? 'text-destructive' : 'text-amber-700'}`}
                >
                  • {a.message} →
                </button>
              ))}
              {alerts.length > 8 && <p className="text-xs text-muted-foreground px-2">+{alerts.length - 8} outros alertas</p>}
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
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-lg font-bold text-foreground">Colaboradores ({filtered.length})</h2>
            <div className="flex items-center gap-2">
              {departments.length > 0 && (
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
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
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {emp.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{emp.nome}</p>
                            <p className="text-xs text-muted-foreground">{emp.cargo}</p>
                            {emp.departamento && <p className="text-[10px] text-muted-foreground">{emp.departamento}</p>}
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
                              <DropdownMenuItem onClick={() => navigate('/rh/aso')}>Visualizar ASO</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setDesligEmployee({ id: emp.id, nome: emp.nome }); setDesligOpen(true); }}>
                                <UserMinus className="w-4 h-4 mr-2" /> Registrar desligamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${
                          emp.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                          emp.status === 'ferias' ? 'bg-blue-500/15 text-blue-700 border-blue-500/30' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {emp.status === 'ativo' ? 'Ativo' : emp.status === 'ferias' ? 'Férias' : emp.status === 'afastado' ? 'Afastado' : 'Inativo'}
                        </Badge>
                        {lastEval && (
                          <span className="text-lg" title={`Última avaliação: ${lastEval}/4`}>{notaEmoji[lastEval]}</span>
                        )}
                      </div>

                      {/* Alert indicators */}
                      {(hasVacAlert || hasTrainAlert || hasHoursAlert || asoStatus) && (
                        <div className="flex flex-wrap gap-1.5">
                          {hasVacAlert && (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30 gap-1 cursor-pointer" onClick={() => navigate('/rh/ferias')}>
                              <Calendar className="w-3 h-3" /> Férias
                            </Badge>
                          )}
                          {hasTrainAlert && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1 cursor-pointer" onClick={() => navigate('/rh/treinamentos')}>
                              <GraduationCap className="w-3 h-3" /> Treinamento
                            </Badge>
                          )}
                          {asoStatus && (
                            <Badge variant="outline" className={`text-[10px] gap-1 cursor-pointer ${asoStatus === 'vencido' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}`} onClick={() => navigate('/rh/aso')}>
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
    </MainLayout>
  );
};

export default DashboardRH;
