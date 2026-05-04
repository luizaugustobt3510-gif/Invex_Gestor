import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, Users, DollarSign, Clock, Calculator, Settings, Info, type LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

type MetricTone = 'default' | 'success' | 'warning' | 'danger';

const metricToneClasses: Record<MetricTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

const TurnoverMetricCard = ({
  title,
  value,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: MetricTone;
}) => (
  <Card className="h-full border-border/50 transition-all duration-300 hover:shadow-lg">
    <CardContent className="flex h-full min-h-[100px] items-start justify-between gap-2 p-3 sm:p-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-medium leading-snug text-muted-foreground">{title}</p>
        <p className="text-base sm:text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere]">{value}</p>
      </div>
      <div className={`shrink-0 rounded-lg p-2 ${metricToneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardContent>
  </Card>
);

const Turnover = () => {
  const { toast } = useToast();
  const [terminations, setTerminations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [factor, setFactor] = useState(1.5);
  const [factorDialogOpen, setFactorDialogOpen] = useState(false);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [tempFactor, setTempFactor] = useState('1.5');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [termRes, empRes] = await Promise.all([
      supabase.from('employee_terminations').select('*, employees(nome, cargo, departamento, salario, data_admissao)').order('data_desligamento', { ascending: false }),
      supabase.from('employees').select('id, nome, cargo, salario, status, departamento, data_admissao'),
    ]);
    setTerminations(termRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = new Date();
    if (period === 'custom') {
      start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      if (customEnd) end.setTime(new Date(customEnd + 'T23:59:59').getTime());
    } else {
      const months = parseInt(period);
      start = new Date(now.getFullYear(), now.getMonth() - (months === 1 ? 1 : months), months === 1 ? now.getDate() : now.getDate());
    }
    return { start, end };
  }, [period, customStart, customEnd]);

  const filteredTerminations = useMemo(() => {
    return terminations.filter(t => {
      const d = new Date(t.data_desligamento + 'T00:00:00');
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [terminations, dateRange]);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'ativo'), [employees]);

  const metrics = useMemo(() => {
    const totalDesligamentos = filteredTerminations.length;
    const totalAtivos = activeEmployees.length;
    const totalColabs = totalAtivos + totalDesligamentos;
    const taxaTurnover = totalColabs > 0 ? ((totalDesligamentos / totalColabs) * 100) : 0;

    const salarios = activeEmployees.map(e => e.salario || 0);
    const custoMedio = salarios.length > 0 ? salarios.reduce((a, b) => a + b, 0) / salarios.length : 0;
    const custoTurnover = custoMedio * totalDesligamentos * factor;

    // Tempo médio de permanência dos desligados
    let tempoMedio = 0;
    const desligadosComTempo = filteredTerminations.filter(t => t.employees?.data_admissao);
    if (desligadosComTempo.length > 0) {
      const totalMeses = desligadosComTempo.reduce((acc, t) => {
        const admissao = new Date(t.employees.data_admissao);
        const deslig = new Date(t.data_desligamento);
        return acc + ((deslig.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }, 0);
      tempoMedio = totalMeses / desligadosComTempo.length;
    }

    return { totalDesligamentos, taxaTurnover, custoMedio, custoTurnover, tempoMedio, totalAtivos };
  }, [filteredTerminations, activeEmployees, factor]);

  // Chart: desligamentos por mês
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTerminations.forEach(t => {
      const d = new Date(t.data_desligamento + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: month.split('-').reverse().join('/'),
        desligamentos: count,
      }));
  }, [filteredTerminations]);

  // Chart: motivos
  const reasonsData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTerminations.forEach(t => {
      map.set(t.motivo, (map.get(t.motivo) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTerminations]);

  // Chart: turnover por setor
  const sectorData = useMemo(() => {
    const sectorTerms = new Map<string, number>();
    filteredTerminations.forEach(t => {
      const dept = t.employees?.departamento || 'Sem setor';
      sectorTerms.set(dept, (sectorTerms.get(dept) || 0) + 1);
    });
    return Array.from(sectorTerms.entries()).map(([setor, desligamentos]) => ({ setor, desligamentos })).sort((a, b) => b.desligamentos - a.desligamentos);
  }, [filteredTerminations]);

  // Chart: evolução do custo
  const costEvolution = useMemo(() => {
    const avgSalary = metrics.custoMedio;
    const map = new Map<string, number>();
    filteredTerminations.forEach(t => {
      const d = new Date(t.data_desligamento + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const salary = t.employees?.salario || avgSalary;
      map.set(key, (map.get(key) || 0) + salary * factor);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, custo]) => ({
        month: month.split('-').reverse().join('/'),
        custo: Math.round(custo),
      }));
  }, [filteredTerminations, factor, metrics.custoMedio]);

  const handleSaveFactor = () => {
    const val = parseFloat(tempFactor);
    if (isNaN(val) || val <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    setFactor(val);
    setFactorDialogOpen(false);
    toast({ title: 'Fator atualizado', description: `Novo fator: ${val}x` });
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="w-6 h-6" /> Turnover</h1>
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimos 30 dias</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setTempFactor(String(factor)); setFactorDialogOpen(true); }} className="gap-1">
              <Settings className="w-4 h-4" /> Fator: {factor}x
            </Button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[160px]" />
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <TurnoverMetricCard title="Desligamentos" value={metrics.totalDesligamentos} icon={Users} tone="danger" />
          <TurnoverMetricCard title="Taxa de Turnover" value={`${metrics.taxaTurnover.toFixed(1)}%`} icon={TrendingDown} tone={metrics.taxaTurnover > 10 ? 'danger' : metrics.taxaTurnover > 5 ? 'warning' : 'success'} />
          <TurnoverMetricCard title="Custo Turnover" value={fmt(metrics.custoTurnover)} icon={DollarSign} tone="warning" />
          <TurnoverMetricCard title="Custo Médio/Colab." value={fmt(metrics.custoMedio)} icon={DollarSign} tone="default" />
          <TurnoverMetricCard title="Tempo Médio (meses)" value={metrics.tempoMedio.toFixed(1)} icon={Clock} tone="default" />
        </div>

        {/* Ver cálculo */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCalcDialogOpen(true)} className="gap-1">
            <Calculator className="w-4 h-4" /> Ver cálculo
          </Button>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Desligamentos por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                    <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="desligamentos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Motivos de Desligamento</CardTitle>
            </CardHeader>
            <CardContent>
              {reasonsData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={reasonsData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {reasonsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Turnover por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              {sectorData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sectorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} className="text-xs fill-muted-foreground" />
                    <YAxis type="category" dataKey="setor" width={120} className="text-xs fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="desligamentos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução do Custo de Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              {costEvolution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={costEvolution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="custo" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog: Ver Cálculo */}
        <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Detalhamento do Cálculo</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Colaboradores ativos:</span><span className="font-medium">{metrics.totalAtivos}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Desligamentos no período:</span><span className="font-medium">{metrics.totalDesligamentos}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Custo médio (salário):</span><span className="font-medium">{fmt(metrics.custoMedio)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fator de custo:</span><span className="font-medium">{factor}x</span></div>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-2">
                <p className="font-semibold">Fórmula do Custo de Turnover:</p>
                <p className="text-muted-foreground font-mono text-xs">Custo = Custo Médio × Desligamentos × Fator</p>
                <p className="font-mono text-xs">{fmt(metrics.custoMedio)} × {metrics.totalDesligamentos} × {factor} = <span className="font-bold text-destructive">{fmt(metrics.custoTurnover)}</span></p>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-2">
                <p className="font-semibold">Fórmula da Taxa de Turnover:</p>
                <p className="text-muted-foreground font-mono text-xs">Taxa = (Desligamentos / Total Colaboradores) × 100</p>
                <p className="font-mono text-xs">({metrics.totalDesligamentos} / {metrics.totalAtivos + metrics.totalDesligamentos}) × 100 = <span className="font-bold">{metrics.taxaTurnover.toFixed(1)}%</span></p>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>O fator de custo representa o multiplicador aplicado sobre o salário médio para estimar custos indiretos de turnover (recrutamento, treinamento, perda de produtividade). Padrão: 1.5x.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Configurar Fator */}
        <Dialog open={factorDialogOpen} onOpenChange={setFactorDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Configurar Fator de Turnover</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fator de custo</Label>
                <Input type="number" step="0.1" min="0.1" value={tempFactor} onChange={e => setTempFactor(e.target.value)} />
                <p className="text-xs text-muted-foreground">Multiplicador aplicado ao custo médio. Ex: 1.0, 1.5, 2.0</p>
              </div>
              <div className="flex gap-2">
                {[1.0, 1.5, 2.0].map(v => (
                  <Button key={v} variant={parseFloat(tempFactor) === v ? 'default' : 'outline'} size="sm" onClick={() => setTempFactor(String(v))}>{v}x</Button>
                ))}
              </div>
              <Button onClick={handleSaveFactor} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Turnover;
