import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Heart, Users, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { beneficiosService, BenefitMonthly, Benefit, EmployeeBenefit, currentCompetencia, competenciaLabel, BENEFIT_TYPE_LABELS } from '@/services/beneficiosService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Employee { id: string; nome: string; departamento: string | null; status: string; }

const COLORS = ['hsl(var(--primary))', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#34d399'];

export default function DashboardBeneficios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comp, setComp] = useState(currentCompetencia());
  const [monthly, setMonthly] = useState<BenefitMonthly[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [links, setLinks] = useState<EmployeeBenefit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const benMap = useMemo(() => new Map(benefits.map(b => [b.id, b])), [benefits]);

  useEffect(() => {
    (async () => {
      if (!user?.companyId) return;
      setLoading(true);
      const [{ data: m }, { data: b }, { data: l }, { data: e }] = await Promise.all([
        beneficiosService.listMonthly(user.companyId, comp),
        beneficiosService.listBenefits(user.companyId),
        beneficiosService.listEmployeeBenefits(user.companyId),
        supabase.from('employees').select('id, nome, departamento, status').eq('company_id', user.companyId),
      ]);
      setMonthly((m as BenefitMonthly[]) || []);
      setBenefits((b as Benefit[]) || []);
      setLinks((l as EmployeeBenefit[]) || []);
      setEmployees((e as Employee[]) || []);
      setLoading(false);
    })();
  }, [user?.companyId, comp]);

  const stats = useMemo(() => {
    const totalCompany = monthly.reduce((s, r) => s + Number(r.company_cost), 0);
    const totalEmployee = monthly.reduce((s, r) => s + Number(r.employee_cost), 0);
    const totalNet = monthly.reduce((s, r) => s + Number(r.net_cost), 0);
    const empsWithBenefits = new Set(links.filter(l => l.status === 'ativo').map(l => l.employee_id));
    const activeEmployees = employees.filter(e => e.status === 'ativo');
    const empsWithoutBenefits = activeEmployees.filter(e => !empsWithBenefits.has(e.id));
    const costPerEmp = empsWithBenefits.size > 0 ? totalNet / empsWithBenefits.size : 0;
    return { totalCompany, totalEmployee, totalNet, totalEmps: empsWithBenefits.size, empsWithoutBenefits, costPerEmp };
  }, [monthly, links, employees]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    monthly.forEach(r => {
      const ben = benMap.get(r.benefit_id);
      const t = ben ? BENEFIT_TYPE_LABELS[ben.type] : 'Outros';
      map.set(t, (map.get(t) || 0) + Number(r.net_cost));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [monthly, benMap]);

  const byBenefit = useMemo(() => {
    const map = new Map<string, { count: number; cost: number }>();
    monthly.forEach(r => {
      const ben = benMap.get(r.benefit_id);
      const name = ben?.name || 'N/D';
      const cur = map.get(name) || { count: 0, cost: 0 };
      cur.count += 1;
      cur.cost += Number(r.net_cost);
      map.set(name, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [monthly, benMap]);

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard className="w-6 h-6 text-primary" /> Dashboard de Benefícios</h1>
            <p className="text-sm text-muted-foreground">Visão estratégica e financeira dos benefícios — {competenciaLabel(comp)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="month" value={comp} onChange={e => setComp(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={() => navigate('/beneficios/cadastro')}>Catálogo</Button>
            <Button variant="outline" onClick={() => navigate('/beneficios/vinculo')}>Vínculos</Button>
            <Button onClick={() => navigate('/beneficios/controle-mensal')}>Controle Mensal</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate('/beneficios/controle-mensal')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between"><DollarSign className="w-5 h-5 text-primary" /><span className="text-xs text-muted-foreground">{competenciaLabel(comp)}</span></div>
              <p className="text-xs text-muted-foreground mt-2">Custo total empresa</p>
              <p className="text-2xl font-bold">R$ {stats.totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate('/beneficios/vinculo')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between"><Users className="w-5 h-5 text-primary" /></div>
              <p className="text-xs text-muted-foreground mt-2">Colaboradores beneficiados</p>
              <p className="text-2xl font-bold">{stats.totalEmps}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between"><TrendingUp className="w-5 h-5 text-primary" /></div>
              <p className="text-xs text-muted-foreground mt-2">Custo médio / funcionário</p>
              <p className="text-2xl font-bold">R$ {stats.costPerEmp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition border-amber-200 bg-amber-50/50" onClick={() => navigate('/beneficios/vinculo')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <p className="text-xs text-amber-700 mt-2">Sem benefícios ativos</p>
              <p className="text-2xl font-bold text-amber-700">{stats.empsWithoutBenefits.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Custo por Tipo de Benefício</p>
              {byType.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem dados nesta competência</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" outerRadius={80} label={(e: { name: string; value: number }) => `${e.name}`}>
                      {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Benefícios mais utilizados</p>
              {byBenefit.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem dados nesta competência</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byBenefit}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Adesões" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {stats.empsWithoutBenefits.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />Funcionários ativos sem benefícios ({stats.empsWithoutBenefits.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {stats.empsWithoutBenefits.slice(0, 12).map(e => (
                  <Badge key={e.id} variant="outline" className="bg-white">{e.nome}</Badge>
                ))}
                {stats.empsWithoutBenefits.length > 12 && <Badge variant="outline">+{stats.empsWithoutBenefits.length - 12}</Badge>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
