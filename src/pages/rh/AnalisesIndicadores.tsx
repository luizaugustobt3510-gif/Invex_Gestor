import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingDown, TrendingUp, Clock, Users, Filter, Calendar, DollarSign, Timer, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line } from 'recharts';
import { resolveGender } from '@/lib/genderUtils';

const GENDER_COLORS = { M: '#93c5fd', F: '#fbcfe8', N: '#d4d4d8' };

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const periodOptions = [
  { value: 'all', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Este mês' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '12m', label: 'Últimos 12 meses' },
];

const getDateRange = (period: string) => {
  const now = new Date();
  let start: Date;
  switch (period) {
    case '7d': start = new Date(now.getTime() - 7 * 86400000); break;
    case '30d': start = new Date(now.getTime() - 30 * 86400000); break;
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case '90d': start = new Date(now.getTime() - 90 * 86400000); break;
    case '12m': start = new Date(now.getFullYear() - 1, now.getMonth(), 1); break;
    default: return null;
  }
  return start.toISOString().split('T')[0];
};

const AnalisesIndicadores = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allCerts, setAllCerts] = useState<any[]>([]);
  const [allTimeRecords, setAllTimeRecords] = useState<any[]>([]);
  const [allVacations, setAllVacations] = useState<any[]>([]);
  const [allTerminations, setAllTerminations] = useState<any[]>([]);
  const [allTrainings, setAllTrainings] = useState<any[]>([]);
  const [allAsos, setAllAsos] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [empRes, certRes, timeRes, vacRes, termRes, trainRes, asoRes] = await Promise.all([
        supabase.from('employees').select('id, status, data_admissao, departamento, salario, data_nascimento, cargo, nome, sexo'),
        supabase.from('employee_certificates').select('dias, data_inicio, employee_id'),
        supabase.from('time_records').select('horas_extras, employee_id, data'),
        supabase.from('employee_vacations').select('employee_id, data_inicio, data_fim, status'),
        supabase.from('employee_terminations').select('*, employees(departamento, cargo, nome)'),
        supabase.from('employee_trainings').select('employee_id, data_validade, data_realizacao, trainings(nome)'),
        supabase.from('employee_asos').select('employee_id, data_vencimento, tipo'),
      ]);
      setAllEmployees(empRes.data || []);
      setAllCerts(certRes.data || []);
      setAllTimeRecords(timeRes.data || []);
      setAllVacations(vacRes.data || []);
      setAllTerminations(termRes.data || []);
      setAllTrainings(trainRes.data || []);
      setAllAsos(asoRes.data || []);
      const depts = [...new Set((empRes.data || []).map(e => e.departamento || '').filter(Boolean))].sort();
      setDepartments(depts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dateStart = getDateRange(periodFilter);

  // Filter employees by sector
  const filteredEmps = useMemo(() => {
    return sectorFilter === 'todos' ? allEmployees : allEmployees.filter(e => (e.departamento || '') === sectorFilter);
  }, [allEmployees, sectorFilter]);

  const empIds = useMemo(() => new Set(filteredEmps.map(e => e.id)), [filteredEmps]);

  // Filter terminations by sector & period
  const filteredTerminations = useMemo(() => {
    return allTerminations.filter(t => {
      const dept = t.employees?.departamento || '';
      if (sectorFilter !== 'todos' && dept !== sectorFilter) return false;
      if (dateStart && t.data_desligamento < dateStart) return false;
      return true;
    });
  }, [allTerminations, sectorFilter, dateStart]);

  const filteredCerts = useMemo(() => {
    return allCerts.filter(c => {
      if (!empIds.has(c.employee_id)) return false;
      if (dateStart && c.data_inicio < dateStart) return false;
      return true;
    });
  }, [allCerts, empIds, dateStart]);

  const filteredTime = useMemo(() => {
    return allTimeRecords.filter(t => {
      if (!empIds.has(t.employee_id)) return false;
      if (dateStart && t.data < dateStart) return false;
      return true;
    });
  }, [allTimeRecords, empIds, dateStart]);

  const filteredVacations = useMemo(() => {
    return allVacations.filter(v => {
      if (!empIds.has(v.employee_id)) return false;
      if (dateStart && v.data_inicio < dateStart) return false;
      return true;
    });
  }, [allVacations, empIds, dateStart]);

  // === INDICATOR CALCULATIONS ===
  const ativosEmps = filteredEmps.filter(e => e.status === 'ativo');
  const totalColaboradores = filteredEmps.length;
  const ativos = ativosEmps.length;
  const diasAtestado = filteredCerts.reduce((s, c) => s + (c.dias || 0), 0);
  const absenteismo = ativos > 0 ? Math.round((diasAtestado / (ativos * 22)) * 1000) / 10 : 0;
  const admissoes = dateStart ? filteredEmps.filter(e => e.data_admissao >= dateStart).length : filteredEmps.filter(e => e.data_admissao >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]).length;
  const turnover = totalColaboradores > 0 ? Math.round(((admissoes + filteredTerminations.length) / totalColaboradores) * 1000) / 10 : 0;
  const bancoHoras = Math.round(filteredTime.reduce((s, t) => s + (t.horas_extras || 0), 0) * 10) / 10;
  const custoFolha = ativosEmps.reduce((s, e) => s + Number(e.salario || 0), 0);
  const custoMedio = ativos > 0 ? custoFolha / ativos : 0;

  const now2 = new Date();
  const tempoMedio = ativos > 0 ? Math.round(ativosEmps.reduce((s, e) => {
    return s + ((now2.getTime() - new Date(e.data_admissao).getTime()) / (86400000 * 30));
  }, 0) / ativos) : 0;

  const taxaRetencao = totalColaboradores > 0 ? Math.round(((totalColaboradores - filteredTerminations.length) / totalColaboradores) * 1000) / 10 : 100;

  const empsComIdade = ativosEmps.filter(e => e.data_nascimento);
  const mediaIdade = empsComIdade.length > 0 ? Math.round(empsComIdade.reduce((s, e) => {
    return s + ((now2.getTime() - new Date(e.data_nascimento).getTime()) / (86400000 * 365.25));
  }, 0) / empsComIdade.length) : 0;

  // === CHART DATA ===
  // Colaboradores por setor
  const empBySector = useMemo(() => {
    const map: Record<string, number> = {};
    ativosEmps.forEach(e => { const d = e.departamento || 'Sem setor'; map[d] = (map[d] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ativosEmps]);

  // Colaboradores por cargo
  const empByCargo = useMemo(() => {
    const map: Record<string, number> = {};
    ativosEmps.forEach(e => { map[e.cargo] = (map[e.cargo] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [ativosEmps]);

  // Desligamentos por setor
  const termBySector = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTerminations.forEach(t => { const d = t.employees?.departamento || 'Sem setor'; map[d] = (map[d] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTerminations]);

  // Motivos de desligamento
  const termByReason = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTerminations.forEach(t => { map[t.motivo] = (map[t.motivo] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTerminations]);

  // Admissões vs Desligamentos (últimos 12 meses)
  const monthlyData = useMemo(() => {
    const data: { month: string; admissoes: number; desligamentos: number; ativos: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const admCount = allEmployees.filter(e => e.data_admissao?.startsWith(key) && (sectorFilter === 'todos' || (e.departamento || '') === sectorFilter)).length;
      const desCount = allTerminations.filter(t => t.data_desligamento?.startsWith(key) && (sectorFilter === 'todos' || (t.employees?.departamento || '') === sectorFilter)).length;
      const activeCount = allEmployees.filter(e => {
        if (sectorFilter !== 'todos' && (e.departamento || '') !== sectorFilter) return false;
        if (e.data_admissao > `${key}-31`) return false;
        const term = allTerminations.find(t2 => t2.employee_id === e.id);
        if (term && term.data_desligamento < `${key}-01`) return false;
        return true;
      }).length;
      data.push({ month: label, admissoes: admCount, desligamentos: desCount, ativos: activeCount });
    }
    return data;
  }, [allEmployees, allTerminations, sectorFilter]);

  // Desligamentos por cargo
  const termByCargo = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTerminations.forEach(t => { const c = t.employees?.cargo || 'N/A'; map[c] = (map[c] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredTerminations]);

  // Férias por mês
  const vacByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVacations.forEach(v => {
      const m = v.data_inicio?.substring(0, 7);
      if (m) map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).sort().map(([month, value]) => {
      const d = new Date(month + '-01');
      return { month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), value };
    });
  }, [filteredVacations]);

  // Treinamentos vencidos por setor
  const hoje = now2.toISOString().split('T')[0];
  const trainExpiredBySector = useMemo(() => {
    const map: Record<string, number> = {};
    allTrainings.filter(t => t.data_validade && t.data_validade < hoje && empIds.has(t.employee_id)).forEach(t => {
      const emp = allEmployees.find(e => e.id === t.employee_id);
      const dept = emp?.departamento || 'Sem setor';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allTrainings, empIds, allEmployees, hoje]);

  // ASO vencido por setor
  const asoExpiredBySector = useMemo(() => {
    const map: Record<string, number> = {};
    allAsos.filter(a => a.data_vencimento && a.data_vencimento < hoje && empIds.has(a.employee_id)).forEach(a => {
      const emp = allEmployees.find(e => e.id === a.employee_id);
      const dept = emp?.departamento || 'Sem setor';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allAsos, empIds, allEmployees, hoje]);

  // Absenteísmo por setor
  const absentBySector = useMemo(() => {
    if (departments.length === 0) return [];
    return departments.map(dept => {
      const deptEmps = allEmployees.filter(e => e.departamento === dept && e.status === 'ativo');
      const deptIds = new Set(deptEmps.map(e => e.id));
      const dias = allCerts.filter(c => deptIds.has(c.employee_id) && (!dateStart || c.data_inicio >= dateStart)).reduce((s, c) => s + (c.dias || 0), 0);
      const pct = deptEmps.length > 0 ? Math.round((dias / (deptEmps.length * 22)) * 1000) / 10 : 0;
      return { name: dept, value: pct };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [departments, allEmployees, allCerts, dateStart]);

  // Turnover por setor
  const turnoverBySector = useMemo(() => {
    if (departments.length === 0) return [];
    return departments.map(dept => {
      const deptEmps = allEmployees.filter(e => e.departamento === dept);
      const deptTerms = allTerminations.filter(t => (t.employees?.departamento || '') === dept && (!dateStart || t.data_desligamento >= dateStart));
      const total2 = deptEmps.length;
      const pct = total2 > 0 ? Math.round((deptTerms.length / total2) * 1000) / 10 : 0;
      return { name: dept, value: pct };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [departments, allEmployees, allTerminations, dateStart]);

  // Banco de horas por setor
  const hoursBySector = useMemo(() => {
    if (departments.length === 0) return [];
    return departments.map(dept => {
      const deptEmps = allEmployees.filter(e => e.departamento === dept);
      const deptIds = new Set(deptEmps.map(e => e.id));
      const total2 = Math.round(allTimeRecords.filter(t => deptIds.has(t.employee_id) && (!dateStart || t.data >= dateStart)).reduce((s, t) => s + (t.horas_extras || 0), 0) * 10) / 10;
      return { name: dept, value: total2 };
    }).filter(d => d.value !== 0).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [departments, allEmployees, allTimeRecords, dateStart]);

  // Custo por setor
  const costBySector = useMemo(() => {
    const map: Record<string, number> = {};
    ativosEmps.forEach(e => {
      const d = e.departamento || 'Sem setor';
      map[d] = (map[d] || 0) + Number(e.salario || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ativosEmps]);

  // === GENDER ===
  const genderCounts = useMemo(() => {
    let m = 0, f = 0, n = 0;
    ativosEmps.forEach(e => {
      const g = resolveGender(e);
      if (g === 'M') m++;
      else if (g === 'F') f++;
      else n++;
    });
    return { m, f, n };
  }, [ativosEmps]);

  const genderPie = useMemo(() => {
    const data = [
      { name: 'Masculino', value: genderCounts.m, color: GENDER_COLORS.M },
      { name: 'Feminino', value: genderCounts.f, color: GENDER_COLORS.F },
    ];
    if (genderCounts.n > 0) data.push({ name: 'Não informado', value: genderCounts.n, color: GENDER_COLORS.N });
    return data.filter(d => d.value > 0);
  }, [genderCounts]);

  const genderBySector = useMemo(() => {
    const map: Record<string, { name: string; Masculino: number; Feminino: number; 'Não informado': number }> = {};
    ativosEmps.forEach(e => {
      const d = e.departamento || 'Sem setor';
      if (!map[d]) map[d] = { name: d, Masculino: 0, Feminino: 0, 'Não informado': 0 };
      const g = resolveGender(e);
      if (g === 'M') map[d].Masculino++;
      else if (g === 'F') map[d].Feminino++;
      else map[d]['Não informado']++;
    });
    return Object.values(map).sort((a, b) => (b.Masculino + b.Feminino + b['Não informado']) - (a.Masculino + a.Feminino + a['Não informado']));
  }, [ativosEmps]);

  const genderByCargo = useMemo(() => {
    const map: Record<string, { name: string; Masculino: number; Feminino: number }> = {};
    ativosEmps.forEach(e => {
      const c = e.cargo || 'N/A';
      if (!map[c]) map[c] = { name: c, Masculino: 0, Feminino: 0 };
      const g = resolveGender(e);
      if (g === 'M') map[c].Masculino++;
      else if (g === 'F') map[c].Feminino++;
    });
    return Object.values(map).sort((a, b) => (b.Masculino + b.Feminino) - (a.Masculino + a.Feminino)).slice(0, 10);
  }, [ativosEmps]);


  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  const ChartCard = ({ title, children, colSpan }: { title: string; children: React.ReactNode; colSpan?: boolean }) => (
    <Card className={colSpan ? 'lg:col-span-2' : ''}>
      <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const EmptyChart = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" /> Análises e Indicadores</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <Calendar className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {departments.length > 0 && (
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-40 h-9 text-sm">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {sectorFilter !== 'todos' && (
          <p className="text-sm text-muted-foreground">Exibindo dados do setor: <strong>{sectorFilter}</strong></p>
        )}

        {/* Indicator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Colaboradores', value: `${ativos}`, sub: `de ${totalColaboradores} total`, icon: <Users className="w-4 h-4 text-primary" />, bg: 'bg-primary/10', route: '/rh/colaboradores' },
            { label: 'Absenteísmo', value: `${absenteismo}%`, sub: `${diasAtestado} dias`, icon: <TrendingDown className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-500/10', route: '/rh/atestados' },
            { label: 'Turnover', value: `${turnover}%`, sub: `${filteredTerminations.length} desl.`, icon: <TrendingUp className="w-4 h-4 text-destructive" />, bg: 'bg-destructive/10', route: '/rh/turnover' },
            { label: 'Banco Horas', value: `${bancoHoras >= 0 ? '+' : ''}${bancoHoras}h`, sub: 'acumulado', icon: <Clock className="w-4 h-4 text-primary" />, bg: 'bg-primary/10', route: '/rh/banco-de-horas' },
            { label: 'Retenção', value: `${taxaRetencao}%`, sub: 'taxa', icon: <Users className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10', route: '/rh/colaboradores' },
          ].map(item => (
            <Card key={item.label} onClick={() => navigate(item.route)} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Folha Mensal', value: custoFolha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), sub: `Média: ${custoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, icon: <DollarSign className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10', route: '/rh/colaboradores' },
            { label: 'Tempo Médio', value: `${tempoMedio} meses`, sub: 'permanência', icon: <Timer className="w-4 h-4 text-primary" />, bg: 'bg-primary/10', route: '/rh/colaboradores' },
            { label: 'Idade Média', value: `${mediaIdade} anos`, sub: 'da equipe', icon: <Users className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-500/10', route: '/rh/colaboradores' },
            { label: 'Admissões', value: `+${admissoes}`, sub: 'no período', icon: <Users className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-500/10', route: '/rh/colaboradores' },
            { label: 'Desligamentos', value: `${filteredTerminations.length}`, sub: 'no período', icon: <TrendingDown className="w-4 h-4 text-destructive" />, bg: 'bg-destructive/10', route: '/rh/desligamentos' },
          ].map(item => (
            <Card key={item.label} onClick={() => navigate(item.route)} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase truncate">{item.label}</span>
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${item.bg}`}>{item.icon}</div>
                </div>
                <p className="text-sm sm:text-xl font-bold truncate">{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gender Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Masculino', value: genderCounts.m, pct: ativos > 0 ? Math.round((genderCounts.m / ativos) * 100) : 0, bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
            { label: 'Feminino', value: genderCounts.f, pct: ativos > 0 ? Math.round((genderCounts.f / ativos) * 100) : 0, bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
            { label: 'Não informado', value: genderCounts.n, pct: ativos > 0 ? Math.round((genderCounts.n / ativos) * 100) : 0, bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
          ].map(item => (
            <Card key={item.label} onClick={() => navigate('/rh/colaboradores')} className={`cursor-pointer hover:shadow-md transition-all ${item.bg} ${item.border}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] sm:text-xs font-medium uppercase ${item.text}`}>{item.label}</span>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-white/60">
                    <UserCheck className={`w-4 h-4 ${item.text}`} />
                  </div>
                </div>
                <p className={`text-lg sm:text-2xl font-bold ${item.text}`}>{item.value}</p>
                <p className={`text-[10px] sm:text-xs ${item.text} opacity-80`}>{item.pct}% da equipe ativa</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="pessoas" className="w-full">
          <TabsList className="w-full sm:w-auto flex flex-wrap">
            <TabsTrigger value="pessoas" className="text-xs sm:text-sm">Pessoas</TabsTrigger>
            <TabsTrigger value="genero" className="text-xs sm:text-sm">Gênero</TabsTrigger>
            <TabsTrigger value="desligamentos" className="text-xs sm:text-sm">Desligamentos</TabsTrigger>
            <TabsTrigger value="operacional" className="text-xs sm:text-sm">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs sm:text-sm">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoas" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Colaboradores por Setor">
                {empBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={empBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Colaboradores" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Colaboradores por Cargo (Top 10)">
                {empByCargo.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={empByCargo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" name="Colaboradores" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Funcionários Ativos por Mês" colSpan>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="genero" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Distribuição por Gênero">
                {genderPie.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={genderPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {genderPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Resumo por Gênero">
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-100 border border-blue-200">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Masculino</p>
                      <p className="text-3xl font-bold text-blue-700">{genderCounts.m}</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{ativos > 0 ? Math.round((genderCounts.m / ativos) * 100) : 0}%</p>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-pink-100 border border-pink-200">
                    <div>
                      <p className="text-sm font-medium text-pink-700">Feminino</p>
                      <p className="text-3xl font-bold text-pink-700">{genderCounts.f}</p>
                    </div>
                    <p className="text-2xl font-bold text-pink-700">{ativos > 0 ? Math.round((genderCounts.f / ativos) * 100) : 0}%</p>
                  </div>
                  {genderCounts.n > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted border">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Não informado</p>
                        <p className="text-3xl font-bold">{genderCounts.n}</p>
                      </div>
                      <p className="text-2xl font-bold text-muted-foreground">{ativos > 0 ? Math.round((genderCounts.n / ativos) * 100) : 0}%</p>
                    </div>
                  )}
                </div>
              </ChartCard>

              <ChartCard title="Gênero por Setor" colSpan>
                {genderBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={genderBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Masculino" stackId="a" fill={GENDER_COLORS.M} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Feminino" stackId="a" fill={GENDER_COLORS.F} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Não informado" stackId="a" fill={GENDER_COLORS.N} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Gênero por Cargo (Top 10)" colSpan>
                {genderByCargo.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={genderByCargo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Masculino" stackId="a" fill={GENDER_COLORS.M} />
                      <Bar dataKey="Feminino" stackId="a" fill={GENDER_COLORS.F} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="desligamentos" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Desligamentos por Setor">
                {termBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={termBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Desligamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Motivos de Desligamento">
                {termByReason.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={termByReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {termByReason.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Admissões vs Desligamentos (12 meses)" colSpan>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="admissoes" name="Admissões" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="desligamentos" name="Desligamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Desligamentos por Cargo (Top 10)">
                {termByCargo.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={termByCargo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" name="Desligamentos" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Turnover por Setor (%)">
                {turnoverBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={turnoverBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="value" name="Turnover %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="operacional" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Férias por Mês">
                {vacByMonth.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vacByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Férias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Treinamentos Vencidos por Setor">
                {trainExpiredBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trainExpiredBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Vencidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="ASO Vencido por Setor">
                {asoExpiredBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={asoExpiredBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Vencidos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Absenteísmo por Setor (%)">
                {absentBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={absentBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="value" name="Absenteísmo %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Banco de Horas por Setor" colSpan>
                {hoursBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => `${v}h`} />
                      <Bar dataKey="value" name="Horas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Custo da Folha por Setor">
                {costBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costBySector}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis />
                      <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                      <Bar dataKey="value" name="Custo" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Distribuição da Folha (%)">
                {costBySector.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={costBySector} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {costBySector.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Fórmulas */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Fórmulas Utilizadas</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Absenteísmo</p>
                    <p>= (Dias atestado) / (Ativos × Dias úteis) × 100</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Turnover</p>
                    <p>= (Admissões + Desligamentos) / Total × 100</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Impacto Turnover</p>
                    <p>= Desligamentos × Salário médio × 1.5</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AnalisesIndicadores;
