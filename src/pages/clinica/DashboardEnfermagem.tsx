import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsNursingAdmin } from '@/hooks/useIsNursingAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ClipboardList, Stethoscope, CalendarCheck, Users, Package, ShieldAlert } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', '#0f6b5c', '#3b9c8a', '#7cc4b4', '#f59e0b', '#ef4444', '#6366f1', '#94a3b8'];
const TZ = 'America/Sao_Paulo';
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const dayLabel = (k: string) => k.slice(8, 10) + '/' + k.slice(5, 7);

type Row = { created_at: string; created_by_name?: string | null; exam_type?: string | null; [k: string]: any };

function countBy<T>(arr: T[], fn: (x: T) => string | null | undefined) {
  const m = new Map<string, number>();
  arr.forEach(x => { const k = fn(x) || 'Não informado'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export default function DashboardEnfermagem() {
  const { user } = useAuth();
  const { isNursingAdmin, loading: checking } = useIsNursingAdmin();
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [anam, setAnam] = useState<Row[]>([]);
  const [evol, setEvol] = useState<Row[]>([]);
  const [appts, setAppts] = useState<Row[]>([]);
  const [cons, setCons] = useState<Row[]>([]);
  const [newPatients, setNewPatients] = useState(0);
  const [mats, setMats] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.companyId || !isNursingAdmin) return;
    const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
    const cid = user.companyId;
    setLoading(true);
    (async () => {
      const [a, e, ap, c, p] = await Promise.all([
        supabase.from('anamneses').select('created_at, created_by_name, exam_type, template_name').eq('company_id', cid).gte('created_at', since).limit(5000),
        supabase.from('clinical_evolutions').select('created_at, created_by_name, professional_name').eq('company_id', cid).gte('created_at', since).limit(5000),
        supabase.from('clinic_appointments').select('created_at, scheduled_at, status, attendance_type').eq('company_id', cid).gte('scheduled_at', since).limit(5000),
        supabase.from('patient_consumptions').select('created_at, material_id, quantidade, valor_unitario').eq('company_id', cid).gte('created_at', since).limit(5000),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('company_id', cid).gte('created_at', since),
      ]);
      setAnam((a.data || []) as any);
      setEvol((e.data || []) as any);
      setAppts((ap.data || []) as any);
      const cr = (c.data || []) as any[];
      setCons(cr);
      setNewPatients(p.count || 0);
      const ids = [...new Set(cr.map(x => x.material_id))];
      if (ids.length) {
        const { data } = await supabase.from('materials').select('id, material').in('id', ids);
        setMats(Object.fromEntries((data || []).map((m: any) => [m.id, m.material])));
      }
      setLoading(false);
    })();
  }, [user?.companyId, isNursingAdmin, days]);

  const daily = useMemo(() => {
    const n = Number(days);
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 86400000).toISOString()));
    const ca = new Map<string, number>(), ce = new Map<string, number>();
    anam.forEach(r => { const k = dayKey(r.created_at); ca.set(k, (ca.get(k) || 0) + 1); });
    evol.forEach(r => { const k = dayKey(r.created_at); ce.set(k, (ce.get(k) || 0) + 1); });
    return keys.map(k => ({ dia: dayLabel(k), Anamneses: ca.get(k) || 0, 'Evoluções': ce.get(k) || 0 }));
  }, [anam, evol, days]);

  const byExam = useMemo(() => countBy(anam, r => r.exam_type).slice(0, 8), [anam]);
  const byProf = useMemo(() => {
    const m = new Map<string, { name: string; Anamneses: number; 'Evoluções': number }>();
    const get = (n: string) => { if (!m.has(n)) m.set(n, { name: n, Anamneses: 0, 'Evoluções': 0 }); return m.get(n)!; };
    anam.forEach(r => get(r.created_by_name || 'Não informado').Anamneses++);
    evol.forEach(r => get(r.created_by_name || r.professional_name || 'Não informado')['Evoluções']++);
    return [...m.values()].sort((a, b) => (b.Anamneses + b['Evoluções']) - (a.Anamneses + a['Evoluções'])).slice(0, 10);
  }, [anam, evol]);
  const byStatus = useMemo(() => countBy(appts, r => r.status), [appts]);
  const byHour = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ hora: `${String(i).padStart(2, '0')}h`, Anamneses: 0 }));
    anam.forEach(r => { const hr = Number(new Date(r.created_at).toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: TZ })) % 24; h[hr].Anamneses++; });
    return h.slice(6, 23);
  }, [anam]);
  const topMats = useMemo(() => {
    const m = new Map<string, number>();
    cons.forEach(c => m.set(c.material_id, (m.get(c.material_id) || 0) + Number(c.quantidade || 0)));
    return [...m.entries()].map(([id, q]) => ({ name: mats[id] || 'Material', Quantidade: q })).sort((a, b) => b.Quantidade - a.Quantidade).slice(0, 8);
  }, [cons, mats]);
  const consValue = cons.reduce((s, c) => s + Number(c.quantidade || 0) * Number(c.valor_unitario || 0), 0);

  if (checking) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isNursingAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-2">
        <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">O dashboard de enfermagem é exclusivo do administrador da enfermagem.</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Anamneses', value: anam.length, icon: ClipboardList },
    { label: 'Evoluções', value: evol.length, icon: Stethoscope },
    { label: 'Agendamentos', value: appts.length, icon: CalendarCheck },
    { label: 'Novos pacientes', value: newPatients, icon: Users },
    { label: 'Materiais consumidos', value: consValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Package },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Enfermagem</h1>
          <p className="text-sm text-muted-foreground">Produção da equipe, atendimentos e consumo de materiais</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {kpis.map(k => (
              <Card key={k.label}><CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><k.icon className="w-4 h-4" />{k.label}</div>
                <div className="text-2xl font-bold mt-1">{k.value}</div>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Atendimentos por dia</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer><LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
                <Line type="monotone" dataKey="Anamneses" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Evoluções" stroke={COLORS[4]} strokeWidth={2} dot={false} />
              </LineChart></ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Produção por profissional</CardTitle></CardHeader>
              <CardContent className="h-80">
                {byProf.length === 0 ? <Empty /> : <ResponsiveContainer><BarChart data={byProf} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={120} fontSize={11} /><Tooltip /><Legend />
                  <Bar dataKey="Anamneses" stackId="a" fill={COLORS[0]} /><Bar dataKey="Evoluções" stackId="a" fill={COLORS[4]} />
                </BarChart></ResponsiveContainer>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Anamneses por tipo de exame</CardTitle></CardHeader>
              <CardContent className="h-80">
                {byExam.length === 0 ? <Empty /> : <ResponsiveContainer><PieChart>
                  <Pie data={byExam} dataKey="value" nameKey="name" outerRadius={100} label>
                    {byExam.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip /><Legend />
                </PieChart></ResponsiveContainer>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Horários de maior movimento (anamneses)</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer><BarChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hora" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip />
                  <Bar dataKey="Anamneses" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Agendamentos por situação</CardTitle></CardHeader>
              <CardContent className="h-72">
                {byStatus.length === 0 ? <Empty /> : <ResponsiveContainer><PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip /><Legend />
                </PieChart></ResponsiveContainer>}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Materiais mais consumidos</CardTitle></CardHeader>
              <CardContent className="h-72">
                {topMats.length === 0 ? <Empty /> : <ResponsiveContainer><BarChart data={topMats}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
                  <Bar dataKey="Quantidade" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart></ResponsiveContainer>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>;
}
