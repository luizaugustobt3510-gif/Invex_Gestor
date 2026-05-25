import { useEffect, useState, useCallback, useMemo } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { supabase } from '@/integrations/supabase/client';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { Plus, TrendingUp, TrendingDown, Minus, Scale, Ruler, X } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface Medida {
  id: string;
  data: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  peitoral: number | null;
  braco: number | null;
  coxa: number | null;
  panturrilha: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
}

const CAMPOS: { key: keyof Medida; label: string; unit: string }[] = [
  { key: 'peso', label: 'Peso', unit: 'kg' },
  { key: 'percentual_gordura', label: '% Gordura', unit: '%' },
  { key: 'cintura', label: 'Cintura', unit: 'cm' },
  { key: 'quadril', label: 'Quadril', unit: 'cm' },
  { key: 'peitoral', label: 'Peitoral', unit: 'cm' },
  { key: 'braco', label: 'Braço', unit: 'cm' },
  { key: 'coxa', label: 'Coxa', unit: 'cm' },
  { key: 'panturrilha', label: 'Panturrilha', unit: 'cm' },
];

const FitnessEvolucao = () => {
  const { profile } = useFitnessProfile();
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const { data } = await supabase
      .from('fitness_measurements')
      .select('*')
      .eq('user_id', au.id)
      .order('data', { ascending: false })
      .limit(60);
    setMedidas((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pesoChart = useMemo(() => {
    return [...medidas]
      .filter(m => m.peso != null)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(m => ({
        data: new Date(m.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        peso: Number(m.peso),
      }));
  }, [medidas]);

  const ultima = medidas[0];
  const anterior = medidas[1];

  const diff = (k: keyof Medida) => {
    const a = ultima?.[k] as number | null;
    const b = anterior?.[k] as number | null;
    if (a == null || b == null) return null;
    return Number(a) - Number(b);
  };

  const imc = useMemo(() => {
    const peso = ultima?.peso ?? profile?.peso_atual;
    const altCm = profile?.altura;
    if (!peso || !altCm) return null;
    const m = Number(altCm) / 100;
    return Number(peso) / (m * m);
  }, [ultima, profile]);

  return (
    <FitnessLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black">Evolução</h1>
          <p className="text-xs text-slate-400">Medidas, peso e progresso</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-xl font-semibold text-sm text-slate-900 flex items-center gap-1.5 active:scale-95"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
        >
          <Plus className="w-4 h-4" /> Medida
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <FitnessCard className="!p-3 text-center">
          <Scale className="w-4 h-4 mx-auto text-cyan-300 mb-1" />
          <p className="text-lg font-black leading-tight">
            {ultima?.peso ? Number(ultima.peso).toFixed(1) : profile?.peso_atual ?? '--'}
          </p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">peso (kg)</p>
        </FitnessCard>
        <FitnessCard className="!p-3 text-center">
          <Ruler className="w-4 h-4 mx-auto text-fuchsia-300 mb-1" />
          <p className="text-lg font-black leading-tight">{imc ? imc.toFixed(1) : '--'}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">IMC</p>
        </FitnessCard>
        <FitnessCard className="!p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto text-emerald-300 mb-1" />
          <p className="text-lg font-black leading-tight">{profile?.meta_peso ?? '--'}</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">meta (kg)</p>
        </FitnessCard>
      </div>

      {/* Gráfico de peso */}
      <FitnessCard className="mb-4">
        <p className="text-sm font-semibold mb-2">Evolução do peso</p>
        {pesoChart.length < 2 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            Registre ao menos 2 medidas para ver o gráfico.
          </p>
        ) : (
          <div className="h-44 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pesoChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="3 3" />
                <XAxis dataKey="data" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3, fill: '#22d3ee' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </FitnessCard>

      {/* Comparação última vs anterior */}
      {ultima && (
        <FitnessCard className="mb-4">
          <p className="text-sm font-semibold mb-3">Última medida vs anterior</p>
          <div className="grid grid-cols-2 gap-2">
            {CAMPOS.map(c => {
              const v = ultima[c.key] as number | null;
              const d = diff(c.key);
              if (v == null) return null;
              const Trend = d == null ? Minus : d > 0.05 ? TrendingUp : d < -0.05 ? TrendingDown : Minus;
              const color = d == null ? 'text-slate-500' : d > 0.05 ? 'text-amber-400' : d < -0.05 ? 'text-emerald-400' : 'text-slate-500';
              return (
                <div key={c.key} className="bg-slate-800/40 rounded-lg p-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className="text-base font-bold">
                    {Number(v).toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">{c.unit}</span>
                  </p>
                  {d != null && (
                    <p className={`flex items-center gap-1 text-[10px] ${color}`}>
                      <Trend className="w-3 h-3" />
                      {d > 0 ? '+' : ''}{d.toFixed(1)} {c.unit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </FitnessCard>
      )}

      {/* Histórico */}
      <FitnessCard>
        <p className="text-sm font-semibold mb-2">Histórico</p>
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Carregando...</p>
        ) : medidas.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Sem medidas ainda. Registre a primeira!</p>
        ) : (
          <div className="space-y-1.5">
            {medidas.slice(0, 10).map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-300 font-mono">
                  {new Date(m.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <div className="flex items-center gap-3 text-slate-400">
                  {m.peso != null && <span>{Number(m.peso).toFixed(1)} kg</span>}
                  {m.cintura != null && <span>cint {Number(m.cintura).toFixed(0)}</span>}
                  {m.percentual_gordura != null && <span>{Number(m.percentual_gordura).toFixed(1)}%</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </FitnessCard>

      {showForm && (
        <NovaMedidaForm onClose={() => { setShowForm(false); load(); }} />
      )}
    </FitnessLayout>
  );
};

const NovaMedidaForm = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const parse = (v: string) => {
    if (!v.trim()) return null;
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au) return;
      const payload: any = { user_id: au.id, data: new Date().toISOString().slice(0, 10) };
      CAMPOS.forEach(c => { payload[c.key] = parse(form[c.key as string] || ''); });
      const { error } = await supabase.from('fitness_measurements').insert(payload);
      if (error) throw error;
      toast.success('Medida registrada!');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-cyan-500/30 bg-slate-900 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="font-bold">Nova medida</h2>
          <button onClick={onClose} className="p-2 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CAMPOS.map(c => (
            <div key={c.key}>
              <label className="text-[10px] uppercase tracking-wide text-slate-400">{c.label} ({c.unit})</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form[c.key as string] || ''}
                onChange={e => setForm(f => ({ ...f, [c.key as string]: e.target.value }))}
                className="w-full h-11 mt-1 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
              />
            </div>
          ))}
        </div>
        <div className="p-4 sticky bottom-0 bg-slate-900 border-t border-slate-800">
          <button
            onClick={salvar}
            disabled={saving}
            className="w-full h-12 rounded-xl font-black text-slate-900 active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
          >
            {saving ? 'Salvando...' : 'Salvar medida'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FitnessEvolucao;
