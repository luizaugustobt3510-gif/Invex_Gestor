import { useEffect, useMemo, useState } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Save, RefreshCw, Info, Trash2, Gauge } from 'lucide-react';
import { toast } from 'sonner';

interface LogRow {
  id: string;
  peso: number;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  created_at: string;
}

const calc = (peso: number) => ({
  calorias: Math.round(peso * 20),
  proteinas: Math.round(peso * 2),
  gorduras: Math.round(peso * 0.8),
  fibras: Math.round(peso * 0.5),
  carboidratos: Math.round(peso * 2),
});

// Velocímetro semicircular (0 a max)
const Speedometer = ({ value, max, label }: { value: number; max: number; label: string }) => {
  const pct = Math.max(0, Math.min(1, value / max));
  const angle = -90 + pct * 180; // -90 (esquerda) a 90 (direita)
  const color = pct < 0.5 ? '#f43f5e' : pct < 0.85 ? '#f59e0b' : '#10b981';
  // Arco
  const r = 70;
  const cx = 90;
  const cy = 90;
  const arc = (start: number, end: number) => {
    const s = (start * Math.PI) / 180;
    const e = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" className="w-full max-w-[260px]">
        <path d={arc(180, 360)} stroke="rgba(148,163,184,0.25)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={arc(180, 180 + pct * 180)} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* Ponteiro */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 8) * Math.cos((angle * Math.PI) / 180)}
          y2={cy + (r - 8) * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6" fill={color} />
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize="18" fontWeight="800" fill="currentColor">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="text-xs text-slate-400 -mt-1">{label}</div>
    </div>
  );
};

const MacroBar = ({ data }: { data: { proteinas: number; carboidratos: number; gorduras: number } }) => {
  const total = data.proteinas + data.carboidratos + data.gorduras || 1;
  const p = (data.proteinas / total) * 100;
  const c = (data.carboidratos / total) * 100;
  const g = (data.gorduras / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800/60">
        <div style={{ width: `${p}%` }} className="bg-cyan-500" title="Proteínas" />
        <div style={{ width: `${c}%` }} className="bg-amber-500" title="Carboidratos" />
        <div style={{ width: `${g}%` }} className="bg-fuchsia-500" title="Gorduras" />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>🟦 Prot {p.toFixed(0)}%</span>
        <span>🟧 Carb {c.toFixed(0)}%</span>
        <span>🟪 Gord {g.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const FitnessEmagrecimento = () => {
  const { profile, update, loading } = useFitnessProfile();
  const [pesoInput, setPesoInput] = useState('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [adherence, setAdherence] = useState(0); // calorias consumidas hoje (manual)

  useEffect(() => {
    if (profile?.peso_atual != null && !pesoInput) {
      setPesoInput(String(profile.peso_atual));
    }
  }, [profile?.peso_atual]);

  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('fitness_emagrecimento_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setLogs((data as any) || []);
  };

  useEffect(() => { fetchLogs(); }, []);

  const peso = useMemo(() => {
    const n = parseFloat(pesoInput.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [pesoInput]);

  const result = useMemo(() => (peso > 0 ? calc(peso) : null), [peso]);

  const recalcular = () => {
    if (profile?.peso_atual != null) setPesoInput(String(profile.peso_atual));
    toast.success('Recalculado com dados do perfil');
  };

  const salvar = async () => {
    if (!result || peso <= 0) {
      toast.error('Informe um peso válido (maior que 0)');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const { error } = await supabase.from('fitness_emagrecimento_logs' as any).insert({
        user_id: user.id,
        peso,
        ...result,
      });
      if (error) throw error;
      // sincroniza peso no perfil se mudou
      if (profile && profile.peso_atual !== peso) {
        await update({ peso_atual: peso });
      }
      toast.success('Estimativa salva no histórico');
      fetchLogs();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from('fitness_emagrecimento_logs' as any).delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    setLogs(l => l.filter(x => x.id !== id));
  };

  if (loading) {
    return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando...</div></FitnessLayout>;
  }

  return (
    <FitnessLayout>
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-rose-400" />
          <h1 className="text-2xl font-black">Processo de Emagrecimento</h1>
        </div>
        <p className="text-sm text-slate-400">Estimativa inicial · Sugestão de referência para organização alimentar</p>
      </header>

      {/* Dados do perfil */}
      <FitnessCard className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Info_ field="Nome" value={profile?.nome || '—'} />
          <Info_ field="Altura" value={profile?.altura ? `${profile.altura} cm` : '—'} />
          <Info_ field="Objetivo" value={(profile as any)?.objetivo || 'Emagrecimento'} />
          <Info_ field="Meta de peso" value={profile?.meta_peso ? `${profile.meta_peso} kg` : '—'} />
        </div>
        <div className="mt-4">
          <label className="text-xs text-slate-400">Peso atual (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={pesoInput}
            onChange={e => setPesoInput(e.target.value)}
            placeholder="Ex: 80"
            className="mt-1 w-full bg-slate-900/60 border border-cyan-500/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
          />
          {peso <= 0 && pesoInput && (
            <p className="text-xs text-rose-400 mt-1">Informe um peso maior que zero.</p>
          )}
        </div>
      </FitnessCard>

      {result && (
        <>
          {/* Resultado */}
          <FitnessCard className="mb-4">
            <h2 className="text-sm font-bold text-cyan-300 mb-3">Sua estimativa inicial</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <Stat label="Calorias" value={`${result.calorias}`} unit="kcal" color="text-rose-400" />
              <Stat label="Proteínas" value={`${result.proteinas}`} unit="g" color="text-cyan-300" />
              <Stat label="Carboidratos" value={`${result.carboidratos}`} unit="g" color="text-amber-300" />
              <Stat label="Gorduras" value={`${result.gorduras}`} unit="g" color="text-fuchsia-300" />
              <Stat label="Fibras" value={`${result.fibras}`} unit="g" color="text-emerald-300" />
            </div>
            <div className="mt-4">
              <MacroBar data={result} />
            </div>
          </FitnessCard>

          {/* Velocímetro */}
          <FitnessCard className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-300" />
                <h2 className="text-sm font-bold">Aderência à meta diária</h2>
              </div>
              <span className="text-[10px] text-slate-500">{adherence} / {result.calorias} kcal</span>
            </div>
            <Speedometer value={adherence} max={result.calorias} label="kcal consumidas hoje" />
            <input
              type="range"
              min={0}
              max={result.calorias}
              value={adherence}
              onChange={e => setAdherence(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-400"
            />
            <p className="text-[10px] text-slate-500 mt-1 text-center">Arraste para registrar quantas kcal você consumiu hoje</p>
          </FitnessCard>

          {/* Aviso */}
          <div className="mb-4 flex gap-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Esses valores são apenas uma <b>estimativa inicial</b> e uma <b>sugestão de referência</b> — uma receitinha para
              organização alimentar. Para acompanhamento individualizado, consulte um profissional habilitado.
            </span>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={recalcular}
              className="flex items-center justify-center gap-2 bg-slate-800/70 border border-slate-700/60 text-slate-200 rounded-xl py-2.5 text-sm font-bold hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" /> Recalcular
            </button>
            <button
              onClick={salvar}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar resultado'}
            </button>
          </div>
        </>
      )}

      {/* Histórico */}
      <FitnessCard>
        <h2 className="text-sm font-bold mb-3">Histórico</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Nenhuma estimativa salva ainda.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map(l => (
              <li
                key={l.id}
                className="flex items-center justify-between bg-slate-900/40 border border-slate-700/40 rounded-xl px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">
                    {new Date(l.created_at).toLocaleDateString('pt-BR')} · {l.peso} kg
                  </div>
                  <div className="text-slate-400">
                    {l.calorias} kcal · P {l.proteinas}g · C {l.carboidratos}g · G {l.gorduras}g · F {l.fibras}g
                  </div>
                </div>
                <button
                  onClick={() => excluir(l.id)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  aria-label="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FitnessCard>
    </FitnessLayout>
  );
};

const Stat = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
  <div className="rounded-xl bg-slate-900/50 border border-slate-700/40 p-2.5 text-center">
    <div className={`text-xl font-black ${color}`}>{value}<span className="text-[10px] text-slate-500 ml-0.5">{unit}</span></div>
    <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
  </div>
);

const Info_ = ({ field, value }: { field: string; value: string }) => (
  <div>
    <div className="text-slate-500">{field}</div>
    <div className="text-slate-200 font-semibold truncate">{value}</div>
  </div>
);

export default FitnessEmagrecimento;
