import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingDown, TrendingUp, Clock, Users, Filter, Calendar, DollarSign, Timer } from 'lucide-react';

const Indicadores = () => {
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [departments, setDepartments] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allCerts, setAllCerts] = useState<any[]>([]);
  const [allTimeRecords, setAllTimeRecords] = useState<any[]>([]);
  const [allVacations, setAllVacations] = useState<any[]>([]);
  const [allTerminations, setAllTerminations] = useState<any[]>([]);

  useEffect(() => { loadIndicadores(); }, []);

  const loadIndicadores = async () => {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const [empRes, certRes, timeRes, vacRes] = await Promise.all([
        supabase.from('employees').select('id, status, data_admissao, departamento'),
        supabase.from('employee_certificates').select('dias, data_inicio, employee_id').gte('data_inicio', inicioMes).lte('data_inicio', fimMes),
        supabase.from('time_records').select('horas_extras, employee_id').gte('data', inicioMes).lte('data', fimMes),
        supabase.from('employee_vacations').select('employee_id, data_inicio').gte('data_inicio', new Date().toISOString().split('T')[0]).lte('data_inicio', em30dias),
      ]);

      const employees = empRes.data || [];
      const depts = [...new Set(employees.map(e => e.departamento || '').filter(Boolean))].sort();
      setDepartments(depts);
      setAllEmployees(employees);
      setAllCerts(certRes.data || []);
      setAllTimeRecords(timeRes.data || []);
      setAllVacations(vacRes.data || []);
    } catch (err) {
      console.error('Erro indicadores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats based on filter
  const empIds = sectorFilter === 'todos'
    ? new Set(allEmployees.map(e => e.id))
    : new Set(allEmployees.filter(e => (e.departamento || '') === sectorFilter).map(e => e.id));

  const filteredEmps = allEmployees.filter(e => empIds.has(e.id));
  const totalColaboradores = filteredEmps.length;
  const ativos = filteredEmps.filter(e => e.status === 'ativo').length;
  const inativos = filteredEmps.filter(e => e.status === 'inativo').length;
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const admissoesMes = filteredEmps.filter(e => e.data_admissao >= inicioMes && e.data_admissao <= fimMes).length;

  const filteredCerts = allCerts.filter(c => empIds.has(c.employee_id));
  const diasAtestadoMes = filteredCerts.reduce((sum, c) => sum + (c.dias || 0), 0);
  const diasUteisMes = 22;
  const absenteismo = ativos > 0 ? Math.round((diasAtestadoMes / (ativos * diasUteisMes)) * 1000) / 10 : 0;
  const turnover = totalColaboradores > 0 ? Math.round(((admissoesMes + inativos) / totalColaboradores) * 1000) / 10 : 0;

  const filteredTime = allTimeRecords.filter(t => empIds.has(t.employee_id));
  const bancoHorasTotal = Math.round(filteredTime.reduce((sum, t) => sum + (t.horas_extras || 0), 0) * 10) / 10;

  const feriasProximas = allVacations.filter(v => empIds.has(v.employee_id)).length;

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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Indicadores RH</h1>
          {departments.length > 0 && (
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-48 h-9">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Filtrar setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {sectorFilter !== 'todos' && (
          <p className="text-sm text-muted-foreground">Exibindo dados do setor: <strong>{sectorFilter}</strong></p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Colaboradores</span>
                <div className="p-2 rounded-lg bg-primary/10"><Users className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold">{ativos}</p>
              <p className="text-xs text-muted-foreground">de {totalColaboradores} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Absenteísmo</span>
                <div className="p-2 rounded-lg bg-amber-500/10"><TrendingDown className="w-4 h-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{absenteismo}%</p>
              <p className="text-xs text-muted-foreground">{diasAtestadoMes} dias atestado</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Turnover</span>
                <div className="p-2 rounded-lg bg-destructive/10"><TrendingUp className="w-4 h-4 text-destructive" /></div>
              </div>
              <p className="text-2xl font-bold">{turnover}%</p>
              <p className="text-xs text-muted-foreground">{admissoesMes} adm. + {inativos} desl.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Banco de Horas</span>
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-4 h-4 text-primary" /></div>
              </div>
              <p className={`text-2xl font-bold ${bancoHorasTotal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {bancoHorasTotal >= 0 ? '+' : ''}{bancoHorasTotal}h
              </p>
              <p className="text-xs text-muted-foreground">acumulado no mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Férias Próx.</span>
                <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold">{feriasProximas}</p>
              <p className="text-xs text-muted-foreground">em 30 dias</p>
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

          {/* Sector breakdown */}
          {departments.length > 0 && sectorFilter === 'todos' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Por Setor</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {departments.map(dept => {
                  const deptEmps = allEmployees.filter(e => e.departamento === dept);
                  const deptAtivos = deptEmps.filter(e => e.status === 'ativo').length;
                  const deptIds = new Set(deptEmps.map(e => e.id));
                  const deptCerts = allCerts.filter(c => deptIds.has(c.employee_id));
                  const deptDias = deptCerts.reduce((s, c) => s + (c.dias || 0), 0);
                  const deptAbsent = deptAtivos > 0 ? Math.round((deptDias / (deptAtivos * 22)) * 1000) / 10 : 0;
                  return (
                    <div key={dept} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 px-2 rounded" onClick={() => setSectorFilter(dept)}>
                      <span className="text-sm font-medium">{dept}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{deptAtivos} ativos</span>
                        <span>Absent. {deptAbsent}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Indicadores;
