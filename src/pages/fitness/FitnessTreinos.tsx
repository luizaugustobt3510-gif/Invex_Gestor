import { useEffect, useState, useCallback } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { useFitnessDailyLog } from '@/hooks/useFitnessDailyLog';
import { Plus, Dumbbell, Play, Trash2, Check, Pause, X, Timer, ChevronRight, Pencil, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Workout {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  cor: string | null;
  ativo: boolean;
}
interface Exercise {
  id: string;
  workout_id: string;
  ordem: number;
  nome: string;
  series: number;
  repeticoes: string;
  carga_kg: number | null;
  descanso_seg: number | null;
}

const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen', 'Full body', 'Cardio'];

const FitnessTreinos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, update } = useFitnessProfile();
  const { upsertToday } = useFitnessDailyLog();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'session'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const { data } = await supabase
      .from('fitness_workouts')
      .select('*')
      .eq('user_id', au.id)
      .eq('ativo', true)
      .order('created_at', { ascending: true });
    setWorkouts((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const criarFicha = async () => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const { data, error } = await supabase
      .from('fitness_workouts')
      .insert({ user_id: au.id, nome: 'Nova ficha', cor: '#22d3ee' })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setWorkouts(w => [...w, data as any]);
    setActiveId(data!.id);
    setView('edit');
  };

  const excluirFicha = async (id: string) => {
    if (!confirm('Excluir ficha e seus exercícios?')) return;
    await supabase.from('fitness_workouts').delete().eq('id', id);
    setWorkouts(w => w.filter(x => x.id !== id));
    toast.success('Ficha removida');
  };

  const finalizarTreino = async (workoutId: string, duracaoSeg: number, exerciciosFeitos: any[]) => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const xp = 30 + exerciciosFeitos.filter(e => e.feito).length * 10;
    await supabase.from('fitness_workout_logs').insert({
      user_id: au.id,
      workout_id: workoutId,
      duracao_min: Math.max(1, Math.round(duracaoSeg / 60)),
      exercicios: exerciciosFeitos,
      xp_ganho: xp,
    });
    await upsertToday({ treino_feito: true });
    if (profile) {
      const hoje = new Date().toISOString().slice(0, 10);
      const wasYesterday = profile.last_workout_date &&
        new Date(profile.last_workout_date).getTime() >= Date.now() - 36 * 60 * 60 * 1000;
      await update({
        xp: (profile.xp || 0) + xp,
        last_workout_date: hoje,
        streak_dias: wasYesterday ? (profile.streak_dias || 0) + 1 : 1,
      });
    }
    toast.success(`Treino salvo! +${xp} XP 🔥`);
    setView('list');
    setActiveId(null);
  };

  if (view === 'edit' && activeId) {
    return (
      <EditorFicha
        workoutId={activeId}
        onClose={() => { setView('list'); load(); }}
      />
    );
  }
  if (view === 'session' && activeId) {
    return (
      <SessaoTreino
        workoutId={activeId}
        onCancel={() => { setView('list'); setActiveId(null); }}
        onFinish={(dur, exs) => finalizarTreino(activeId, dur, exs)}
      />
    );
  }

  return (
    <FitnessLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black">Treinos</h1>
          <p className="text-xs text-slate-400">Suas fichas e sessões</p>
        </div>
        <button
          onClick={criarFicha}
          className="h-10 px-4 rounded-xl font-semibold text-sm text-slate-900 flex items-center gap-1.5 active:scale-95"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
        >
          <Plus className="w-4 h-4" /> Ficha
        </button>
      </div>

      <button
        onClick={() => navigate('/fitness/gerar-treino')}
        className="w-full mb-4 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] border border-fuchsia-500/30"
        style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.12), rgba(232,121,249,0.18))' }}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #e879f9)' }}>
          <Sparkles className="w-5 h-5 text-slate-900" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Geração Inteligente</p>
          <p className="text-[11px] text-slate-300">IA monta sua ficha · ou crie na raça</p>
        </div>
        <ChevronRight className="w-5 h-5 text-fuchsia-300" />
      </button>

      {loading ? (
        <p className="text-center text-cyan-300 py-10">Carregando...</p>
      ) : workouts.length === 0 ? (
        <FitnessCard className="text-center py-10">
          <Dumbbell className="w-12 h-12 mx-auto text-cyan-400 mb-3" />
          <p className="text-sm text-slate-300 mb-4">Nenhuma ficha ainda. Crie sua primeira!</p>
          <button
            onClick={criarFicha}
            className="h-11 px-5 rounded-xl font-semibold text-sm text-slate-900"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
          >
            + Criar ficha
          </button>
        </FitnessCard>
      ) : (
        <div className="space-y-2.5">
          {workouts.map(w => (
            <FitnessCard key={w.id} className="!p-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${w.cor || '#22d3ee'}22`, color: w.cor || '#22d3ee' }}
                >
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{w.nome}</p>
                  <p className="text-[11px] text-slate-400 truncate">{w.grupo_muscular || 'Sem grupo'}</p>
                </div>
                <button
                  onClick={() => { setActiveId(w.id); setView('edit'); }}
                  className="p-2 text-slate-400 hover:text-cyan-300"
                  aria-label="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => excluirFicha(w.id)}
                  className="p-2 text-slate-400 hover:text-rose-400"
                  aria-label="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setActiveId(w.id); setView('session'); }}
                  className="h-10 px-3 rounded-lg text-xs font-bold text-slate-900 flex items-center gap-1 active:scale-95"
                  style={{ background: 'linear-gradient(90deg, #22d3ee, #67e8f9)' }}
                >
                  <Play className="w-3.5 h-3.5" /> Iniciar
                </button>
              </div>
            </FitnessCard>
          ))}
        </div>
      )}
    </FitnessLayout>
  );
};

/* ---------- Editor de ficha ---------- */

const EditorFicha = ({ workoutId, onClose }: { workoutId: string; onClose: () => void }) => {
  const [w, setW] = useState<Workout | null>(null);
  const [exs, setExs] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: wk }, { data: ex }] = await Promise.all([
      supabase.from('fitness_workouts').select('*').eq('id', workoutId).single(),
      supabase.from('fitness_workout_exercises').select('*').eq('workout_id', workoutId).order('ordem'),
    ]);
    setW(wk as any);
    setExs((ex as any) || []);
    setLoading(false);
  }, [workoutId]);

  useEffect(() => { load(); }, [load]);

  const salvarFicha = async (patch: Partial<Workout>) => {
    if (!w) return;
    const novo = { ...w, ...patch };
    setW(novo);
    await supabase.from('fitness_workouts').update(patch).eq('id', w.id);
  };

  const addExercicio = async () => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au || !w) return;
    const { data, error } = await supabase
      .from('fitness_workout_exercises')
      .insert({
        workout_id: w.id,
        user_id: au.id,
        nome: 'Novo exercício',
        series: 3,
        repeticoes: '10',
        carga_kg: 0,
        descanso_seg: 60,
        ordem: exs.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setExs(e => [...e, data as any]);
  };

  const updateEx = (id: string, patch: Partial<Exercise>) => {
    setExs(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const saveEx = async (ex: Exercise) => {
    await supabase.from('fitness_workout_exercises').update({
      nome: ex.nome,
      series: ex.series,
      repeticoes: ex.repeticoes,
      carga_kg: ex.carga_kg,
      descanso_seg: ex.descanso_seg,
    }).eq('id', ex.id);
  };

  const delEx = async (id: string) => {
    await supabase.from('fitness_workout_exercises').delete().eq('id', id);
    setExs(e => e.filter(x => x.id !== id));
  };

  if (loading || !w) return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando...</div></FitnessLayout>;

  return (
    <FitnessLayout>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="text-sm text-cyan-300">← Voltar</button>
        <span className="text-[11px] text-slate-500">Salvamento automático</span>
      </div>

      <FitnessCard className="mb-3">
        <label className="text-[10px] uppercase tracking-wide text-slate-400">Nome da ficha</label>
        <input
          value={w.nome}
          onChange={e => salvarFicha({ nome: e.target.value })}
          className="w-full mt-1 h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
        />
        <label className="text-[10px] uppercase tracking-wide text-slate-400 mt-3 block">Grupo muscular</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {GRUPOS.map(g => (
            <button
              key={g}
              onClick={() => salvarFicha({ grupo_muscular: g })}
              className={`text-[11px] h-8 px-3 rounded-full border ${
                w.grupo_muscular === g
                  ? 'bg-cyan-400/15 border-cyan-400 text-cyan-200'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </FitnessCard>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold">Exercícios ({exs.length})</h2>
        <button
          onClick={addExercicio}
          className="h-9 px-3 rounded-lg text-xs font-semibold text-slate-900 flex items-center gap-1 active:scale-95"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      <div className="space-y-2.5">
        {exs.map((ex, i) => (
          <FitnessCard key={ex.id} className="!p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-slate-500 w-5">{i + 1}.</span>
              <input
                value={ex.nome}
                onChange={e => updateEx(ex.id, { nome: e.target.value })}
                onBlur={() => saveEx(ex)}
                className="flex-1 h-10 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700 focus:border-cyan-400 focus:outline-none text-base"
              />
              <button onClick={() => delEx(ex.id)} className="p-2 text-slate-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <NumInput label="Séries" value={String(ex.series)} step="1"
                onChange={v => updateEx(ex.id, { series: parseInt(v) || 0 })} onBlur={() => saveEx(ex)} />
              <TxtInput label="Reps" value={ex.repeticoes}
                onChange={v => updateEx(ex.id, { repeticoes: v })} onBlur={() => saveEx(ex)} />
              <NumInput label="Carga (kg)" value={ex.carga_kg != null ? String(ex.carga_kg) : ''} step="0.5"
                onChange={v => updateEx(ex.id, { carga_kg: parseFloat(v.replace(',', '.')) || 0 })} onBlur={() => saveEx(ex)} />
              <NumInput label="Desc. (s)" value={String(ex.descanso_seg || 0)} step="5"
                onChange={v => updateEx(ex.id, { descanso_seg: parseInt(v) || 0 })} onBlur={() => saveEx(ex)} />
            </div>
          </FitnessCard>
        ))}
        {exs.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Nenhum exercício ainda — adicione o primeiro!</p>
        )}
      </div>
    </FitnessLayout>
  );
};

/* ---------- Sessão de treino ---------- */

const SessaoTreino = ({
  workoutId,
  onCancel,
  onFinish,
}: {
  workoutId: string;
  onCancel: () => void;
  onFinish: (durSeg: number, exsFeitos: any[]) => void;
}) => {
  const [w, setW] = useState<Workout | null>(null);
  const [exs, setExs] = useState<(Exercise & { feito?: boolean; cargaReal?: string })[]>([]);
  const [seg, setSeg] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [descanso, setDescanso] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: wk }, { data: ex }] = await Promise.all([
        supabase.from('fitness_workouts').select('*').eq('id', workoutId).single(),
        supabase.from('fitness_workout_exercises').select('*').eq('workout_id', workoutId).order('ordem'),
      ]);
      setW(wk as any);
      setExs(((ex as any[]) || []).map(e => ({ ...e, feito: false, cargaReal: e.carga_kg != null ? String(e.carga_kg) : '' })));
      setLoading(false);
    })();
  }, [workoutId]);

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setSeg(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [pausado]);

  useEffect(() => {
    if (descanso <= 0) return;
    const t = setInterval(() => setDescanso(d => Math.max(0, d - 1)), 1000);
    return () => clearInterval(t);
  }, [descanso]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const toggle = (id: string, desc?: number) => {
    setExs(prev => prev.map(e => e.id === id ? { ...e, feito: !e.feito } : e));
    const ex = exs.find(e => e.id === id);
    if (ex && !ex.feito && desc) setDescanso(desc);
  };

  if (loading || !w) return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando...</div></FitnessLayout>;

  const feitos = exs.filter(e => e.feito).length;
  const pct = exs.length ? (feitos / exs.length) * 100 : 0;

  return (
    <FitnessLayout hideNav>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-400 hover:text-rose-400">
          <X className="w-4 h-4" /> Cancelar
        </button>
        <h1 className="text-base font-bold truncate max-w-[60%]">{w.nome}</h1>
        <span className="text-[11px] text-slate-500">{feitos}/{exs.length}</span>
      </div>

      <FitnessCard className="mb-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Timer className="w-5 h-5 text-cyan-300" />
          <p className="text-4xl font-black tabular-nums">{fmt(seg)}</p>
        </div>
        <button
          onClick={() => setPausado(p => !p)}
          className="h-9 px-4 rounded-lg text-xs font-semibold bg-slate-800/60 border border-slate-700 inline-flex items-center gap-1.5"
        >
          {pausado ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {pausado ? 'Retomar' : 'Pausar'}
        </button>
        <div className="h-1.5 mt-3 rounded-full bg-slate-800/60 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }} />
        </div>
      </FitnessCard>

      {descanso > 0 && (
        <FitnessCard glow="fuchsia" className="mb-3 text-center !py-3">
          <p className="text-[10px] uppercase tracking-widest text-fuchsia-300">Descanso</p>
          <p className="text-2xl font-black tabular-nums">{fmt(descanso)}</p>
          <button onClick={() => setDescanso(0)} className="text-[11px] text-slate-400 mt-1 underline">pular</button>
        </FitnessCard>
      )}

      <div className="space-y-2 mb-4">
        {exs.map((ex, i) => (
          <FitnessCard key={ex.id} className={`!p-3 ${ex.feito ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(ex.id, ex.descanso_seg || undefined)}
                className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border-2 ${
                  ex.feito
                    ? 'bg-emerald-400 border-emerald-300 text-slate-900'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                {ex.feito ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${ex.feito ? 'line-through' : ''}`}>{ex.nome}</p>
                <p className="text-[11px] text-slate-400">{ex.series}x{ex.repeticoes} · descanso {ex.descanso_seg}s</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  inputMode="decimal"
                  value={ex.cargaReal || ''}
                  onChange={e => setExs(prev => prev.map(x => x.id === ex.id ? { ...x, cargaReal: e.target.value } : x))}
                  className="w-14 h-9 rounded-lg bg-slate-800/60 border border-slate-700 text-right text-sm px-2 focus:outline-none focus:border-cyan-400"
                  placeholder="kg"
                />
                <span className="text-[10px] text-slate-500">kg</span>
              </div>
            </div>
          </FitnessCard>
        ))}
        {exs.length === 0 && (
          <FitnessCard className="text-center py-6 text-xs text-slate-400">
            Esta ficha não tem exercícios. Volte e cadastre antes de treinar.
          </FitnessCard>
        )}
      </div>

      <button
        onClick={() => onFinish(seg, exs.map(e => ({
          nome: e.nome, series: e.series, reps: e.repeticoes, carga: e.cargaReal, feito: !!e.feito,
        })))}
        disabled={exs.length === 0}
        className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)', boxShadow: '0 8px 24px rgba(34,211,238,0.25)' }}
      >
        <Check className="w-5 h-5" /> Finalizar treino
      </button>
    </FitnessLayout>
  );
};

/* helpers */

const NumInput = ({ label, value, onChange, onBlur, step }: any) => (
  <div>
    <label className="text-[9px] uppercase tracking-wide text-slate-500 block mb-1">{label}</label>
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full h-10 px-2 rounded-md bg-slate-800/60 border border-slate-700 text-center text-base focus:outline-none focus:border-cyan-400"
    />
  </div>
);
const TxtInput = ({ label, value, onChange, onBlur }: any) => (
  <div>
    <label className="text-[9px] uppercase tracking-wide text-slate-500 block mb-1">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full h-10 px-2 rounded-md bg-slate-800/60 border border-slate-700 text-center text-base focus:outline-none focus:border-cyan-400"
    />
  </div>
);

export default FitnessTreinos;
