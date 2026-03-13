import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const GraficosRH = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [terminations, setTerminations] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [empRes, termRes] = await Promise.all([
      supabase.from('employees').select('id, nome, cargo, departamento, status, data_admissao, salario'),
      supabase.from('employee_terminations').select('*, employees(nome, cargo, departamento)').order('data_desligamento', { ascending: false }),
    ]);
    setEmployees(empRes.data || []);
    setTerminations(termRes.data || []);
    setLoading(false);
  };

  // 1. Desligamentos por setor
  const termByDept: Record<string, number> = {};
  terminations.forEach(t => {
    const dept = t.employees?.departamento || 'Sem setor';
    termByDept[dept] = (termByDept[dept] || 0) + 1;
  });
  const termByDeptData = Object.entries(termByDept).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // 2. Motivos de desligamento
  const termByReason: Record<string, number> = {};
  terminations.forEach(t => {
    termByReason[t.motivo] = (termByReason[t.motivo] || 0) + 1;
  });
  const termByReasonData = Object.entries(termByReason).map(([name, value]) => ({ name, value }));

  // 3. Ativos por mês (últimos 12 meses)
  const now = new Date();
  const monthlyActive: { month: string; ativos: number; admissoes: number; desligamentos: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const activeCount = employees.filter(e => {
      const adm = e.data_admissao;
      if (adm > `${monthKey}-31`) return false;
      // Check if terminated before this month
      const term = terminations.find(t => t.employee_id === e.id);
      if (term && term.data_desligamento < `${monthKey}-01`) return false;
      return true;
    }).length;
    const admCount = employees.filter(e => e.data_admissao?.startsWith(monthKey)).length;
    const desCount = terminations.filter(t => t.data_desligamento?.startsWith(monthKey)).length;
    monthlyActive.push({ month: monthLabel, ativos: activeCount, admissoes: admCount, desligamentos: desCount });
  }

  // 4. Desligamentos por cargo
  const termByCargo: Record<string, number> = {};
  terminations.forEach(t => {
    const cargo = t.employees?.cargo || 'N/A';
    termByCargo[cargo] = (termByCargo[cargo] || 0) + 1;
  });
  const termByCargoData = Object.entries(termByCargo).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

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
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Gráficos RH</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Desligamentos por setor */}
          <Card>
            <CardHeader><CardTitle className="text-base">Desligamentos por Setor</CardTitle></CardHeader>
            <CardContent>
              {termByDeptData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de desligamento.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={termByDeptData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Desligamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Motivos de desligamento */}
          <Card>
            <CardHeader><CardTitle className="text-base">Motivos de Desligamento</CardTitle></CardHeader>
            <CardContent>
              {termByReasonData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de desligamento.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={termByReasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {termByReasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Admissões vs Desligamentos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Admissões vs Desligamentos (12 meses)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyActive}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="admissoes" name="Admissões" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="desligamentos" name="Desligamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funcionários ativos por mês */}
          <Card>
            <CardHeader><CardTitle className="text-base">Funcionários Ativos por Mês</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyActive}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Desligamentos por cargo */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Desligamentos por Cargo</CardTitle></CardHeader>
            <CardContent>
              {termByCargoData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={termByCargoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" name="Desligamentos" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default GraficosRH;
