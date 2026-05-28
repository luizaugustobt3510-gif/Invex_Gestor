import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { useFitnessDailyLog } from '@/hooks/useFitnessDailyLog';
import {
  Plus, Dumbbell, Play, Trash2, Check, Pause, X, Timer, ChevronRight, Pencil, Sparkles,
  ArrowUp, ArrowDown, SkipForward, AlertTriangle, Heart, StretchHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useFitnessActiveSession, ActiveSession, ActiveSessionExercise, elapsedSec, writeSession,
} from '@/hooks/useFitnessActiveSession';

interface Workout {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  cor: string | null;
  ativo: boolean;
  created_at?: string;
  expires_at?: string | null;
}
interface Exercise {
  id: string;
  workout_id: string;
  ordem: number;
  nome: string;
  tipo?: string;
  series: number;
  repeticoes: string;
  carga_kg: number | null;
  descanso_seg: number | null;
  duracao_min?: number | null;
  distancia_km?: number | null;
  calorias?: number | null;
  intensidade?: string | null;
}

const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen', 'Full body', 'Cardio'];
const TIPOS: { v: 'musculacao' | 'cardio' | 'alongamento'; l: string; icon: any }[] = [
  { v: 'musculacao', l: 'Musculação', icon: Dumbbell },
  { v: 'cardio', l: 'Cardio', icon: Heart },
  { v: 'alongamento', l: 'Alongamento', icon: StretchHorizontal },
];

const isExpired = (w: Workout) => w.expires_at && new Date(w.expires_at).getTime() < Date.now();
const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const FitnessTreinos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, update } = useFitnessProfile();
  const { upsertToday } = useFitnessDailyLog();
  const { session, setSession } = useFitnessActiveSession();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'session' | 'countdown'>('list');
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

  // Se já tem sessão ativa salva, retoma direto
  useEffect(() => {
    if (session && view === 'list') {
      setActiveId(session.workoutId);
      setView('session');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const iniciarFicha = async (workoutId: string) => {
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;
    if (isExpired(w)) {
      toast.error('Esta ficha expirou. Gere uma nova!');
      return;
    }
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const { data: exs } = await supabase
      .from('fitness_workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('ordem');
    if (!exs?.length) {
      toast.error('Adicione exercícios à ficha antes de treinar.');
      return;
    }

    // Busca último log dessa ficha para mostrar comparativo de carga
    const { data: ultimoLog } = await supabase
      .from('fitness_workout_logs')
      .select('exercicios, data_treino')
      .eq('user_id', au.id)
      .eq('workout_id', workoutId)
      .order('data_treino', { ascending: false })
      .limit(1)
      .maybeSingle();

    const ultimasCargas = new Map<string, number>();
    if (ultimoLog?.exercicios && Array.isArray(ultimoLog.exercicios)) {
      for (const e of ultimoLog.exercicios as any[]) {
        if (e?.nome && e?.carga) {
          const n = parseFloat(String(e.carga).replace(',', '.'));
          if (Number.isFinite(n) && n > 0) ultimasCargas.set(e.nome, n);
        }
      }
    }

    const newSession: ActiveSession = {
      workoutId,
      workoutNome: w.nome,
      startedAt: 0,
      pausedAt: null,
      pausedAcc: 0,
      currentIndex: 0,
      exercises: (exs as any[]).map((e, i) => ({
        id: e.id,
        nome: e.nome,
        tipo: (e.tipo as any) || 'musculacao',
        series: e.series,
        repeticoes: e.repeticoes,
        carga_kg: e.carga_kg,
        descanso_seg: e.descanso_seg,
        duracao_min: e.duracao_min,
        distancia_km: e.distancia_km,
        calorias: e.calorias,
        intensidade: e.intensidade,
        ordem: i,
        feito: false,
        cargaReal: e.carga_kg != null ? String(e.carga_kg) : '',
        cargaUltima: ultimasCargas.get(e.nome) ?? null,
      })),
      userId: au.id,
    };
    setActiveId(workoutId);
    setSession(newSession);
    setView('countdown');
  };

  const finalizarTreino = async () => {
    if (!session) return;
    const dur = elapsedSec(session);
    const exsFeitos = session.exercises.filter(e => e.feito);
    const xp = 30 + exsFeitos.length * 10;
    await supabase.from('fitness_workout_logs').insert({
      user_id: session.userId,
      workout_id: session.workoutId,
      duracao_min: Math.max(1, Math.round(dur / 60)),
      exercicios: session.exercises.map(e => ({
        nome: e.nome, tipo: e.tipo, feito: !!e.feito, pulado: !!e.pulado,
        series: e.series, reps: e.repeticoes, carga: e.cargaReal,
        carga_anterior: e.cargaUltima ?? null,
        duracao_min: e.duracao_min, distancia_km: e.distancia_km,
        calorias: e.calorias, intensidade: e.intensidade,
      })),
      xp_ganho: xp,
    });
    await upsertToday({ treino_feito: true });
    if (profile) {
      const hojeStr = new Date().toISOString().slice(0, 10);
      const ontemStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let novoStreak: number;
      if (profile.last_workout_date === hojeStr) {
        // já treinou hoje — mantém streak
        novoStreak = profile.streak_dias || 1;
      } else if (profile.last_workout_date === ontemStr) {
        novoStreak = (profile.streak_dias || 0) + 1;
      } else {
        novoStreak = 1;
      }
      await update({
        xp: (profile.xp || 0) + xp,
        last_workout_date: hojeStr,
        streak_dias: novoStreak,
      });
    }
    toast.success(`Treino salvo! +${xp} XP 🔥`);
    setSession(null);
    setView('list');
    setActiveId(null);
  };

  const cancelarSessao = () => {
    if (!confirm('Cancelar treino em andamento?')) return;
    setSession(null);
    setView('list');
    setActiveId(null);
  };

  if (view === 'edit' && activeId) {
    return <EditorFicha workoutId={activeId} onClose={() => { setView('list'); load(); }} />;
  }
  if (view === 'countdown' && session) {
    return (
      <CountdownStart
        onDone={() => {
          writeSession({ ...session, startedAt: Date.now(), pausedAcc: 0, pausedAt: null });
          setView('session');
        }}
      />
    );
  }
  if (view === 'session' && session) {
    return (
      <SessaoTreino
        onCancel={cancelarSessao}
        onFinish={finalizarTreino}
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
          {workouts.map(w => {
            const expired = isExpired(w);
            const days = daysUntil(w.expires_at);
            const expiringSoon = !expired && days != null && days <= 10;
            return (
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
                  <button onClick={() => { setActiveId(w.id); setView('edit'); }} className="p-2 text-slate-400 hover:text-cyan-300" aria-label="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => excluirFicha(w.id)} className="p-2 text-slate-400 hover:text-rose-400" aria-label="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => iniciarFicha(w.id)}
                    disabled={!!expired}
                    className="h-10 px-3 rounded-lg text-xs font-bold text-slate-900 flex items-center gap-1 active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(90deg, #22d3ee, #67e8f9)' }}
                  >
                    <Play className="w-3.5 h-3.5" /> Iniciar
                  </button>
                </div>
                {(expired || expiringSoon) && (
                  <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${expired ? 'text-rose-400' : 'text-amber-300'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {expired
                      ? <span>Ficha expirada — <button onClick={() => navigate('/fitness/gerar-treino')} className="underline">gerar nova</button></span>
                      : <span>Expira em {days} dia(s)</span>}
                  </div>
                )}
              </FitnessCard>
            );
          })}
        </div>
      )}
    </FitnessLayout>
  );
};

/* ---------- Contagem regressiva 3-2-1-GO ---------- */
const CountdownStart = ({ onDone }: { onDone: () => void }) => {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN(x => x - 1), 900);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <FitnessLayout hideNav>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <p className="text-[11px] uppercase tracking-widest text-cyan-300 mb-4">Prepare-se</p>
        <div
          key={n}
          className="w-44 h-44 rounded-full flex items-center justify-center animate-[pulse_0.9s_ease-out]"
          style={{
            background: 'radial-gradient(circle, rgba(232,121,249,0.3), rgba(34,211,238,0.15) 60%, transparent)',
            boxShadow: '0 0 80px rgba(34,211,238,0.4)',
          }}
        >
          <span className="text-7xl font-black tabular-nums" style={{ textShadow: '0 0 30px rgba(34,211,238,0.7)' }}>
            {n === 0 ? 'GO' : n}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-6">Foco. Respira. Bora!</p>
      </div>
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

  const addExercicio = async (tipo: 'musculacao' | 'cardio' | 'alongamento' = 'musculacao') => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au || !w) return;
    const base: any = {
      workout_id: w.id, user_id: au.id, nome: 'Novo exercício',
      tipo, ordem: exs.length,
    };
    if (tipo === 'musculacao') Object.assign(base, { series: 3, repeticoes: '10', carga_kg: 0, descanso_seg: 60 });
    if (tipo === 'cardio') Object.assign(base, { series: 1, repeticoes: '-', duracao_min: 15, intensidade: 'moderada' });
    if (tipo === 'alongamento') Object.assign(base, { series: 1, repeticoes: '-', duracao_min: 5 });
    const { data, error } = await supabase
      .from('fitness_workout_exercises')
      .insert(base)
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
      nome: ex.nome, tipo: ex.tipo, series: ex.series, repeticoes: ex.repeticoes,
      carga_kg: ex.carga_kg, descanso_seg: ex.descanso_seg,
      duracao_min: ex.duracao_min, distancia_km: ex.distancia_km,
      calorias: ex.calorias, intensidade: ex.intensidade,
    }).eq('id', ex.id);
  };

  const delEx = async (id: string) => {
    await supabase.from('fitness_workout_exercises').delete().eq('id', id);
    setExs(e => e.filter(x => x.id !== id));
  };

  const moveEx = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= exs.length) return;
    const arr = [...exs];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    const reordered = arr.map((e, i) => ({ ...e, ordem: i }));
    setExs(reordered);
    await Promise.all(reordered.map(e =>
      supabase.from('fitness_workout_exercises').update({ ordem: e.ordem }).eq('id', e.id)
    ));
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
        <div className="flex gap-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.v}
                onClick={() => addExercicio(t.v)}
                className="h-9 px-2.5 rounded-lg text-[11px] font-semibold bg-slate-800/60 border border-slate-700 text-slate-200 flex items-center gap-1 active:scale-95"
                title={`Adicionar ${t.l}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.l.slice(0, 4)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        {exs.map((ex, i) => {
          const tipo = (ex.tipo as any) || 'musculacao';
          return (
            <FitnessCard key={ex.id} className="!p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveEx(i, -1)} disabled={i === 0} className="p-0.5 text-slate-500 disabled:opacity-30 hover:text-cyan-300">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveEx(i, 1)} disabled={i === exs.length - 1} className="p-0.5 text-slate-500 disabled:opacity-30 hover:text-cyan-300">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
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

              <div className="flex gap-1 mb-2">
                {TIPOS.map(t => (
                  <button
                    key={t.v}
                    onClick={() => { updateEx(ex.id, { tipo: t.v }); saveEx({ ...ex, tipo: t.v }); }}
                    className={`text-[10px] h-7 px-2.5 rounded-full border ${
                      tipo === t.v
                        ? 'bg-fuchsia-400/15 border-fuchsia-400 text-fuchsia-200'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>

              {tipo === 'musculacao' && (
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
              )}
              {tipo === 'cardio' && (
                <div className="grid grid-cols-4 gap-1.5">
                  <NumInput label="Min" value={String(ex.duracao_min || 0)} step="1"
                    onChange={v => updateEx(ex.id, { duracao_min: parseInt(v) || 0 })} onBlur={() => saveEx(ex)} />
                  <NumInput label="Km" value={ex.distancia_km != null ? String(ex.distancia_km) : ''} step="0.1"
                    onChange={v => updateEx(ex.id, { distancia_km: parseFloat(v.replace(',', '.')) || 0 })} onBlur={() => saveEx(ex)} />
                  <NumInput label="Kcal" value={String(ex.calorias || 0)} step="10"
                    onChange={v => updateEx(ex.id, { calorias: parseInt(v) || 0 })} onBlur={() => saveEx(ex)} />
                  <TxtInput label="Intens." value={ex.intensidade || ''}
                    onChange={v => updateEx(ex.id, { intensidade: v })} onBlur={() => saveEx(ex)} />
                </div>
              )}
              {tipo === 'alongamento' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <NumInput label="Duração (min)" value={String(ex.duracao_min || 0)} step="1"
                    onChange={v => updateEx(ex.id, { duracao_min: parseInt(v) || 0 })} onBlur={() => saveEx(ex)} />
                  <TxtInput label="Observações" value={ex.intensidade || ''}
                    onChange={v => updateEx(ex.id, { intensidade: v })} onBlur={() => saveEx(ex)} />
                </div>
              )}
            </FitnessCard>
          );
        })}
        {exs.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Nenhum exercício ainda — adicione o primeiro!</p>
        )}
      </div>
    </FitnessLayout>
  );
};

/* ---------- Sessão de treino persistente ---------- */

const SessaoTreino = ({
  onCancel,
  onFinish,
}: {
  onCancel: () => void;
  onFinish: () => void;
}) => {
  const { profile } = useFitnessProfile();
  const { setAfkBlocked } = useAuth();
  const { session, setSession, patch } = useFitnessActiveSession();
  const [, forceTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bloqueia AFK durante treino ativo
  useEffect(() => {
    setAfkBlocked(true);
    return () => setAfkBlocked(false);
  }, [setAfkBlocked]);

  // Re-render por timestamp (independe de tab ativa)
  useEffect(() => {
    tickRef.current = setInterval(() => forceTick(x => x + 1), 500);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  if (!session) {
    return <FitnessLayout hideNav><div className="text-center py-20 text-cyan-300">Sem treino ativo</div></FitnessLayout>;
  }

  const w = { nome: session.workoutNome };
  const exs = session.exercises;
  const seg = elapsedSec(session);
  const pausado = !!session.pausedAt;
  const descansoSeg = session.restEndsAt
    ? Math.max(0, Math.ceil((session.restEndsAt - Date.now()) / 1000))
    : 0;

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const togglePause = () => {
    if (pausado) {
      const pausedFor = Date.now() - (session.pausedAt as number);
      patch({ pausedAt: null, pausedAcc: session.pausedAcc + pausedFor });
    } else {
      patch({ pausedAt: Date.now() });
    }
  };

  const toggleDone = (id: string) => {
    const ex = exs.find(e => e.id === id);
    if (!ex) return;
    const newDone = !ex.feito;
    const updated: ActiveSessionExercise[] = exs.map(e =>
      e.id === id ? { ...e, feito: newDone, pulado: false } : e
    );
    let nextIdx = session.currentIndex;
    let restEnd: number | null = session.restEndsAt || null;
    if (newDone) {
      if (ex.tipo === 'musculacao' && ex.descanso_seg) {
        restEnd = Date.now() + ex.descanso_seg * 1000;
      }
      // avança para o próximo não feito
      const next = updated.findIndex((e, i) => i > session.currentIndex && !e.feito);
      nextIdx = next >= 0 ? next : session.currentIndex;
    }
    patch({ exercises: updated, currentIndex: nextIdx, restEndsAt: restEnd });
  };

  const pularEx = (id: string) => {
    const updated = exs.map(e => e.id === id ? { ...e, pulado: true, feito: false } : e);
    const next = updated.findIndex((e, i) => i > session.currentIndex && !e.feito && !e.pulado);
    patch({ exercises: updated, currentIndex: next >= 0 ? next : session.currentIndex });
  };

  // "Próximo": marca o ATUAL como feito (verde) e avança
  const proximoEx = () => {
    const atual = exs[session.currentIndex];
    if (!atual) return;
    const updated = exs.map(e =>
      e.id === atual.id ? { ...e, feito: true, pulado: false } : e
    );
    let restEnd: number | null = session.restEndsAt || null;
    if (atual.tipo === 'musculacao' && atual.descanso_seg) {
      restEnd = Date.now() + atual.descanso_seg * 1000;
    }
    const next = updated.findIndex((e, i) => i > session.currentIndex && !e.feito && !e.pulado);
    patch({
      exercises: updated,
      currentIndex: next >= 0 ? next : session.currentIndex,
      restEndsAt: restEnd,
    });
  };

  const moveEx = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= exs.length) return;
    const arr = [...exs];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    patch({ exercises: arr });
  };

  const setCargaReal = (id: string, v: string) => {
    patch({ exercises: exs.map(e => e.id === id ? { ...e, cargaReal: v } : e) });
  };

  const feitos = exs.filter(e => e.feito).length;
  const pct = exs.length ? (feitos / exs.length) * 100 : 0;
  const avatarState = descansoSeg > 0 ? 'Descansando 🌬️' : (feitos === exs.length ? 'Treino completo! 🏆' : 'Treinando 💪');

  return (
    <FitnessLayout hideNav>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-400 hover:text-rose-400">
          <X className="w-4 h-4" /> Cancelar
        </button>
        <h1 className="text-base font-bold truncate max-w-[60%]">{w.nome}</h1>
        <span className="text-[11px] text-slate-500">{feitos}/{exs.length}</span>
      </div>

      {/* Avatar visual durante treino */}
      {profile && (
        <div className="mb-3 flex flex-col items-center">
          <AvatarMascote
            avatarId={profile.avatar_id}
            mascoteNome={profile.mascote_nome}
            mensagem={avatarState}
            size="md"
          />
        </div>
      )}

      <FitnessCard className="mb-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Timer className="w-5 h-5 text-cyan-300" />
          <p className="text-4xl font-black tabular-nums">{fmt(seg)}</p>
        </div>
        <button
          onClick={togglePause}
          className="h-9 px-4 rounded-lg text-xs font-semibold bg-slate-800/60 border border-slate-700 inline-flex items-center gap-1.5"
        >
          {pausado ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {pausado ? 'Retomar' : 'Pausar'}
        </button>
        <div className="h-1.5 mt-3 rounded-full bg-slate-800/60 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }} />
        </div>
      </FitnessCard>

      {descansoSeg > 0 && (
        <FitnessCard glow="fuchsia" className="mb-3 text-center !py-3">
          <p className="text-[10px] uppercase tracking-widest text-fuchsia-300">Descanso</p>
          <p className="text-2xl font-black tabular-nums">{fmt(descansoSeg)}</p>
          <button onClick={() => patch({ restEndsAt: null })} className="text-[11px] text-slate-400 mt-1 underline">pular descanso</button>
        </FitnessCard>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={proximoEx}
          className="flex-1 h-10 rounded-lg bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Check className="w-3.5 h-3.5" /> Próximo (concluir atual)
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {exs.map((ex, i) => {
          const isCurrent = i === session.currentIndex && !ex.feito && !ex.pulado;
          // ESTADOS VISUAIS:
          // - feito (clicou "Próximo" ou marcou): VERDE
          // - pulado: AMARELO
          // - atual: ring ciano
          const stateClass = ex.feito
            ? 'bg-emerald-500/10 border-emerald-400/40 opacity-90'
            : ex.pulado
              ? 'bg-amber-500/10 border-amber-400/50 opacity-90'
              : isCurrent
                ? 'ring-2 ring-cyan-400/60'
                : '';
          const cargaAtualNum = ex.cargaReal ? parseFloat(ex.cargaReal.replace(',', '.')) : NaN;
          const delta = (Number.isFinite(cargaAtualNum) && ex.cargaUltima != null)
            ? cargaAtualNum - ex.cargaUltima
            : null;
          return (
            <FitnessCard
              key={ex.id}
              className={`!p-3 transition-all ${stateClass}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveEx(i, -1)} disabled={i === 0} className="p-0.5 text-slate-500 disabled:opacity-30 hover:text-cyan-300">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveEx(i, 1)} disabled={i === exs.length - 1} className="p-0.5 text-slate-500 disabled:opacity-30 hover:text-cyan-300">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => toggleDone(ex.id)}
                  className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border-2 ${
                    ex.feito
                      ? 'bg-emerald-400 border-emerald-300 text-slate-900'
                      : ex.pulado
                        ? 'bg-amber-400 border-amber-300 text-slate-900'
                        : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {ex.feito
                    ? <Check className="w-4 h-4" />
                    : ex.pulado
                      ? <SkipForward className="w-4 h-4" />
                      : <span className="text-xs font-bold">{i + 1}</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${ex.feito ? 'line-through' : ''}`}>{ex.nome}</p>
                  <p className="text-[11px] text-slate-400">
                    {ex.tipo === 'musculacao' && `${ex.series}x${ex.repeticoes} · ${ex.descanso_seg || 0}s desc`}
                    {ex.tipo === 'cardio' && `${ex.duracao_min || 0}min · ${ex.intensidade || ''} ${ex.distancia_km ? `· ${ex.distancia_km}km` : ''}`}
                    {ex.tipo === 'alongamento' && `${ex.duracao_min || 0}min`}
                    {ex.pulado && ' · PULADO'}
                  </p>
                </div>
                {ex.tipo === 'musculacao' && (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <input
                        inputMode="decimal"
                        value={ex.cargaReal || ''}
                        onChange={e => setCargaReal(ex.id, e.target.value)}
                        className="w-14 h-9 rounded-lg bg-slate-800/60 border border-slate-700 text-right text-sm px-2 focus:outline-none focus:border-cyan-400"
                        placeholder="kg"
                      />
                      <span className="text-[10px] text-slate-500">kg</span>
                    </div>
                    {ex.cargaUltima != null && (
                      <span className="text-[9px] text-slate-500">
                        ant: {ex.cargaUltima}kg
                        {delta != null && delta !== 0 && (
                          <span className={delta > 0 ? ' text-emerald-400 font-bold' : ' text-rose-400 font-bold'}>
                            {' '}({delta > 0 ? '+' : ''}{delta.toFixed(1)})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
                {!ex.feito && !ex.pulado && (
                  <button onClick={() => pularEx(ex.id)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Pular">
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </FitnessCard>
          );
        })}
        {exs.length === 0 && (
          <FitnessCard className="text-center py-6 text-xs text-slate-400">
            Esta ficha não tem exercícios. Volte e cadastre antes de treinar.
          </FitnessCard>
        )}
      </div>

      <button
        onClick={onFinish}
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
