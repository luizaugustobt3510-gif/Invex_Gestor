import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, Users, Timer, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export interface AtestadoRecord {
  employee_id: string;
  dias?: number | null;
  motivo?: string | null;
  cid?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  data_retorno?: string | null;
}

interface Props {
  certs: AtestadoRecord[];
  employees: { id: string; nome?: string | null; departamento?: string | null }[];
}

const ChartBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">{title}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const Empty = () => (
  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
);

export const AtestadosAnalytics = ({ certs, employees }: Props) => {
  const empMap = useMemo(() => {
    const m = new Map<string, { nome: string; dept: string }>();
    employees.forEach(e => m.set(e.id, { nome: e.nome || 'Sem nome', dept: e.departamento || 'Sem setor' }));
    return m;
  }, [employees]);

  const totalAtestados = certs.length;
  const totalDias = certs.reduce((s, c) => s + (c.dias || 0), 0);
  const mediaAfastamento = totalAtestados > 0 ? Math.round((totalDias / totalAtestados) * 10) / 10 : 0;
  const colaboradoresAfastados = new Set(certs.map(c => c.employee_id)).size;

  const topEmployees = useMemo(() => {
    const map: Record<string, { qtd: number; dias: number }> = {};
    certs.forEach(c => {
      const nome = empMap.get(c.employee_id)?.nome || 'Desconhecido';
      if (!map[nome]) map[nome] = { qtd: 0, dias: 0 };
      map[nome].qtd += 1;
      map[nome].dias += c.dias || 0;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, qtd: v.qtd, dias: v.dias }))
      .sort((a, b) => b.qtd - a.qtd || b.dias - a.dias)
      .slice(0, 10);
  }, [certs, empMap]);

  const byReason = useMemo(() => {
    const map: Record<string, number> = {};
    certs.forEach(c => {
      const key = (c.motivo || '').trim() || 'Não informado';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [certs]);

  const byCid = useMemo(() => {
    const map: Record<string, { qtd: number; dias: number }> = {};
    certs.forEach(c => {
      const key = (c.cid || '').trim().toUpperCase() || 'Sem CID';
      if (!map[key]) map[key] = { qtd: 0, dias: 0 };
      map[key].qtd += 1;
      map[key].dias += c.dias || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, qtd: v.qtd, dias: v.dias }))
      .sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [certs]);

  const bySector = useMemo(() => {
    const map: Record<string, number> = {};
    certs.forEach(c => {
      const dept = empMap.get(c.employee_id)?.dept || 'Sem setor';
      map[dept] = (map[dept] || 0) + (c.dias || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [certs, empMap]);

  const avgByReason = useMemo(() => {
    const map: Record<string, { dias: number; qtd: number }> = {};
    certs.forEach(c => {
      const key = (c.motivo || '').trim() || 'Não informado';
      if (!map[key]) map[key] = { dias: 0, qtd: 0 };
      map[key].dias += c.dias || 0;
      map[key].qtd += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, value: Math.round((v.dias / v.qtd) * 10) / 10 }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [certs]);

  const cards = [
    { label: 'Atestados', value: totalAtestados, sub: 'no período', icon: FileText },
    { label: 'Dias de afastamento', value: totalDias, sub: 'somados', icon: Timer },
    { label: 'Média de afastamento', value: `${mediaAfastamento} d`, sub: 'por atestado', icon: Activity },
    { label: 'Colaboradores', value: colaboradoresAfastados, sub: 'com atestado', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{c.label}</span>
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10"><c.icon className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-lg sm:text-2xl font-bold">{c.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartBox title="Quem mais pega atestado (top 10)">
          {topEmployees.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topEmployees} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: number, n: string) => [v, n === 'qtd' ? 'Atestados' : 'Dias']} />
                <Legend formatter={(v) => (v === 'qtd' ? 'Atestados' : 'Dias')} />
                <Bar dataKey="qtd" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="dias" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>

        <ChartBox title="Maiores motivos de atestado">
          {byReason.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}`}>
                  {byReason.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartBox>

        <ChartBox title="Maiores atestados por CID">
          {byCid.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCid}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip formatter={(v: number, n: string) => [v, n === 'qtd' ? 'Atestados' : 'Dias']} />
                <Legend formatter={(v) => (v === 'qtd' ? 'Atestados' : 'Dias')} />
                <Bar dataKey="qtd" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dias" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>

        <ChartBox title="Média de dias de afastamento por motivo">
          {avgByReason.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgByReason} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: number) => [`${v} dias`, 'Média']} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>

        <ChartBox title="Dias de afastamento por setor">
          {bySector.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bySector}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} dias`, 'Afastamento']} />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </div>
    </div>
  );
};

export default AtestadosAnalytics;
