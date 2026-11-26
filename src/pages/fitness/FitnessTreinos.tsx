import { Button } from '@/components/ui/button';
import { FitnessPopup } from '@/components/fitness/FitnessPopup';
import { exerciseImage } from '@/lib/exerciseImages';
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
  ArrowUp, ArrowDown, SkipForward, AlertTriangle, Heart, StretchHorizontal, TrendingUp,
  ChevronDown, ChevronLeft, ListChecks, Volume2, VolumeX, Minus, Trophy, Clock, Repeat, Layers,
  Route, Gauge, Equal, TrendingDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { playSfx, celebrate, isFitnessMuted, setFitnessMuted } from '@/lib/fitnessFeedback';
import {
  useFitnessActiveSession, ActiveSession, ActiveSessionExercise, elapsedSec, writeSession, readSession,
} from '@/hooks/useFitnessActiveSession';
import { isWorkoutIdle, lastActivityOf } from '@/lib/fitnessSessionIdle';
import { musclesForExercise, MUSCLE_LABEL } from '@/lib/muscleHeat';

interface Workout {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  cor: string | null;
  ativo: boolean;
  created_at?: string;
  expires_at?: string | null;
  dias_semana?: number[] | null;
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

interface WorkoutSummary {
  nome: string; durSec: number; xp: number; total: number; feitos: number; pulados: number; series: number;
  itens: { nome: string; tipo: string; feito: boolean; pulado: boolean; carga: number | null; anterior: number | null }[];
}
const toKg = (v?: string | number | null) => {
  const n = v == null || v === '' ? NaN : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const fmtClock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen', 'Full body', 'Cardio'];
const TIPOS: { v: 'musculacao' | 'cardio' | 'alongamento'; l: string; icon: any }[] = [
  { v: 'musculacao', l: 'Musculação', icon: Dumbbell },
  { v: 'cardio', l: 'Cardio', icon: Heart },
  { v: 'alongamento', l: 'Alongamento', icon: StretchHorizontal },
];

export const DIAS_SEMANA = [
  { v: 0, l: 'Dom' }, { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' },
];

/** Sugestão de progressão de carga a partir da última carga registrada */
export const sugerirProgressao = (ultima?: number | null) => {
  if (ultima == null || !Number.isFinite(ultima) || ultima <= 0) return null;
  const inc = ultima < 10 ? 1 : ultima < 30 ? 2 : 2.5;
  return Math.round((ultima + inc) * 2) / 2;
};

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
  const { session: sessionState, setSession } = useFitnessActiveSession();
  const session = sessionState;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'session' | 'countdown' | 'summary'>('list');
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
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
    if (!data) return;
    setActiveId(data.id);
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
        cargaReal: e.carga_kg != null && e.carga_kg > 0 ? String(e.carga_kg) : '',
        cargaUltima: ultimasCargas.get(e.nome) ?? (e.carga_kg && e.carga_kg > 0 ? e.carga_kg : null),
      })),
      userId: au.id,
    };
    setActiveId(workoutId);
    setSession(newSession);
    setView('countdown');
  };

  const finalizarTreino = async (opts?: { endAt?: number; auto?: boolean }) => {
    // Lê do armazenamento: a tela do treino atualiza a sessão por lá
    const session = readSession() ?? sessionState;
    if (!session) return;
    const endAt = opts?.endAt ?? Date.now();
    const dur = elapsedSec(session, endAt);
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

    // Persiste as cargas usadas na ficha (para o próximo treino já vir preenchido)
    const cargasParaSalvar = session.exercises
      .map(e => {
        const n = e.cargaReal ? parseFloat(String(e.cargaReal).replace(',', '.')) : NaN;
        return Number.isFinite(n) && n > 0 && n !== e.carga_kg ? { id: e.id, carga_kg: n } : null;
      })
      .filter(Boolean) as { id: string; carga_kg: number }[];
    if (cargasParaSalvar.length) {
      await Promise.all(cargasParaSalvar.map(c =>
        supabase.from('fitness_workout_exercises').update({ carga_kg: c.carga_kg }).eq('id', c.id)
      ));
    }

    await upsertToday({ treino_feito: true });
    if (profile) {
      const hojeStr = new Date(endAt).toISOString().slice(0, 10);
      const ontemStr = new Date(endAt - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    toast.success(opts?.auto
      ? `Treino encerrado e salvo automaticamente após 2 horas sem atividade. +${xp} XP`
      : `Treino salvo! +${xp} XP 🔥`);
    // Resumo usa só o que foi registrado nesta sessão
    if (!opts?.auto) {
      setSummary({
        nome: session.workoutNome, durSec: dur, xp,
        total: session.exercises.length, feitos: exsFeitos.length,
        pulados: session.exercises.filter(e => e.pulado).length,
        series: exsFeitos.reduce((t, e) => t + (e.tipo === 'musculacao' ? (e.series || 0) : 0), 0),
        itens: session.exercises.map(e => ({
          nome: e.nome, tipo: e.tipo, feito: !!e.feito, pulado: !!e.pulado,
          carga: toKg(e.cargaReal), anterior: e.cargaUltima ?? null,
        })),
      });
    }
    setSession(null);
    setView(opts?.auto ? 'list' : 'summary');
    setActiveId(null);
  };

  // Encerra sozinho o treino parado há 2 horas (salva se algum exercício foi feito)
  const autoStopRef = useRef(false);
  useEffect(() => {
    const check = async () => {
      if (autoStopRef.current) return;
      const cur = readSession();
      if (!cur || !isWorkoutIdle(cur)) return;
      autoStopRef.current = true;
      try {
        if (cur.exercises.some(e => e.feito)) {
          await finalizarTreino({ endAt: lastActivityOf(cur) ?? Date.now(), auto: true });
        } else {
          setSession(null);
          setView('list');
          setActiveId(null);
          toast.info('Treino encerrado automaticamente após 2 horas sem atividade.');
        }
      } finally {
        autoStopRef.current = false;
      }
    };
    check();
    const id = setInterval(check, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

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
        onFinish={() => finalizarTreino()}
        onMinimize={() => navigate('/fitness')}
      />
    );
  }
  if (view === 'summary' && summary) {
    return <ResumoTreino summary={summary} onClose={() => { setSummary(null); setView('list'); }} />;
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
                    <p className="text-[11px] text-slate-400 truncate">
                      {w.grupo_muscular || 'Sem grupo'}
                      {w.dias_semana?.length
                        ? ` · ${w.dias_semana.map(d => DIAS_SEMANA.find(x => x.v === d)?.l).join(', ')}`
                        : ''}
                    </p>
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
        <label className="text-[10px] uppercase tracking-wide text-slate-400 mt-3 block">Dias da semana</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DIAS_SEMANA.map(d => {
            const sel = (w.dias_semana || []).includes(d.v);
            return (
              <button
                key={d.v}
                onClick={() => {
                  const atual = w.dias_semana || [];
                  const novo = sel ? atual.filter(x => x !== d.v) : [...atual, d.v].sort((a, b) => a - b);
                  salvarFicha({ dias_semana: novo });
                }}
                className={`text-[11px] h-9 px-3 rounded-full border ${
                  sel ? 'bg-fuchsia-400/15 border-fuchsia-400 text-fuchsia-200' : 'border-slate-700 text-slate-400'
                }`}
              >
                {d.l}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">Toque para marcar/desmarcar os dias desta ficha.</p>
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
  onMinimize,
}: {
  onCancel: () => void;
  onFinish: () => void;
  onMinimize: () => void;
}) => {
  const { profile } = useFitnessProfile();
  const { setAfkBlocked } = useAuth();
  const { session, setSession, patch, touch } = useFitnessActiveSession();
  const [, forceTick] = useState(0);

  // Qualquer toque/tecla na tela do treino conta como atividade (no máx. 1 registro por minuto)
  useEffect(() => {
    let last = 0;
    const onAct = () => {
      const now = Date.now();
      if (now - last < 60_000) return;
      last = now;
      touch();
    };
    const evs = ['pointerdown', 'keydown', 'touchstart'] as const;
    evs.forEach(e => window.addEventListener(e, onAct, { passive: true }));
    return () => evs.forEach(e => window.removeEventListener(e, onAct));
  }, [touch]);
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

  // Aviso quando o descanso termina
  useEffect(() => {
    const end = session?.restEndsAt;
    if (!end) return;
    const ms = end - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => { playSfx('restEnd'); toast.success('Descanso concluído — bora pro próximo! 💪'); }, ms);
    // Bipes nos últimos 3 segundos
    const ticks = [3, 2, 1].map(s => ms - s * 1000).filter(d => d > 0).map(d => setTimeout(() => playSfx('tick'), d));
    return () => { clearTimeout(t); ticks.forEach(clearTimeout); };
  }, [session?.restEndsAt]);

  const [muted, setMuted] = useState(isFitnessMuted());
  const [listOpen, setListOpen] = useState(false);
  const allDoneRef = useRef(false);
  useEffect(() => {
    const list = session?.exercises || [];
    const done = list.length > 0 && list.every(e => e.feito || e.pulado) && list.some(e => e.feito);
    if (done && !allDoneRef.current) { allDoneRef.current = true; celebrate(); }
    if (!done) allDoneRef.current = false;
  }, [session?.exercises]);

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

  const fmt = fmtClock;

  const togglePause = () => {
    if (pausado) {
      const pausedFor = Date.now() - (session.pausedAt as number);
      patch({ pausedAt: null, pausedAcc: session.pausedAcc + pausedFor });
    } else {
      patch({ pausedAt: Date.now() });
    }
  };

  const concluir = (id: string) => {
    const ex = exs.find(e => e.id === id);
    if (!ex) return;
    const updated: ActiveSessionExercise[] = exs.map(e =>
      e.id === id ? { ...e, feito: true, pulado: false } : e
    );
    const idx = exs.findIndex(e => e.id === id);
    const next = updated.findIndex((e, i) => i > idx && !e.feito && !e.pulado);
    const faltamExercicios = next >= 0;
    playSfx('done');
    patch({
      exercises: updated,
      currentIndex: next >= 0 ? next : session.currentIndex,
      // pergunta ao usuário se quer descansar (não inicia sozinho)
      pendingRestSeg: faltamExercicios ? (ex.descanso_seg || 60) : null,
      pendingRestExercicio: faltamExercicios ? ex.nome : null,
      restEndsAt: null,
    });
  };

  const toggleDone = (id: string) => {
    const ex = exs.find(e => e.id === id);
    if (!ex) return;
    if (ex.feito) {
      patch({ exercises: exs.map(e => e.id === id ? { ...e, feito: false } : e) });
      return;
    }
    concluir(id);
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
    concluir(atual.id);
  };

  /* --- Descanso opcional --- */
  const iniciarDescanso = (segs: number) => {
    playSfx('tap');
    patch({ restEndsAt: Date.now() + segs * 1000, restTotalSeg: segs, pendingRestSeg: null, pendingRestExercicio: null });
  };
  const dispensarDescanso = () => {
    patch({ pendingRestSeg: null, pendingRestExercicio: null, restEndsAt: null });
  };
  const addDescanso = (segs: number) => {
    const base = session.restEndsAt && session.restEndsAt > Date.now() ? session.restEndsAt : Date.now();
    const novoFim = base + segs * 1000;
    patch({ restEndsAt: novoFim, restTotalSeg: Math.max(session.restTotalSeg || 0, Math.ceil((novoFim - Date.now()) / 1000)) });
  };

  /* --- Progressão de carga --- */
  const aplicarSugestao = (id: string, valor: number) => {
    patch({ exercises: exs.map(e => e.id === id ? { ...e, cargaReal: String(valor) } : e) });
    toast.success(`Progressão aplicada: ${valor}kg 📈`);
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
  const curIdx = Math.min(session.currentIndex, Math.max(0, exs.length - 1));
  const current = exs[curIdx];
  const allFinished = exs.length > 0 && exs.every(e => e.feito || e.pulado);
  const cargaNum = current ? (parseFloat((current.cargaReal || '0').replace(',', '.')) || 0) : 0;
  const suggestion = current?.tipo === 'musculacao' ? sugerirProgressao(current.cargaUltima) : null;
  const showSuggestion = !!current && suggestion != null && !current.feito && !current.pulado && cargaNum < suggestion;

  // Descanso: tudo derivado de restEndsAt (o mesmo relógio de antes, sem timer extra)
  const restMs = session.restEndsAt ? Math.max(0, session.restEndsAt - Date.now()) : 0;
  const restTotal = Math.max(1, session.restTotalSeg || descansoSeg || 1);
  const restFrac = Math.min(1, restMs / (restTotal * 1000));
  const resting = descansoSeg > 0;
  const askRest = !!session.pendingRestSeg && !resting;
  const restJustEnded = !!session.restEndsAt && restMs === 0 && Date.now() - session.restEndsAt < 3500;

  const grupo = !current ? '' : current.tipo === 'cardio' ? 'Cardio' : current.tipo === 'alongamento' ? 'Alongamento'
    : (musclesForExercise(current.nome).map(m => MUSCLE_LABEL[m]).join(' · ') || 'Musculação');
  const indicators: { icon: any; label: string; value: string }[] = !current ? [] : current.tipo === 'musculacao'
    ? [
      { icon: Layers, label: 'Séries', value: String(current.series ?? '—') },
      { icon: Repeat, label: 'Repetições', value: String(current.repeticoes ?? '—') },
      { icon: Timer, label: 'Descanso', value: `${current.descanso_seg || 0}s` },
    ]
    : [
      { icon: Clock, label: 'Duração', value: `${current.duracao_min || 0} min` },
      { icon: Route, label: 'Distância', value: current.distancia_km ? `${current.distancia_km} km` : '—' },
      { icon: Gauge, label: current.tipo === 'alongamento' ? 'Observação' : 'Intensidade', value: current.intensidade || '—' },
    ];
  const img = current ? exerciseImage(current.nome) : null;

  const mainAction = () => {
    if (!current) return;
    if (allFinished) { onFinish(); return; }
    if (current.feito || current.pulado) {
      const next = exs.findIndex(e => !e.feito && !e.pulado);
      if (next >= 0) patch({ currentIndex: next });
    } else concluir(current.id);
  };
  const mainLabel = allFinished ? 'Finalizar treino' : current?.feito || current?.pulado ? 'Próximo exercício' : 'Concluir exercício';
  const RING = 2 * Math.PI * 96;

  return (
    <div className="fitness-theme fitness-workout h-[100dvh] flex flex-col overflow-hidden bg-background text-foreground">
      <div className="w-full max-w-lg mx-auto flex flex-col flex-1 min-h-0 px-4">
        {/* Cabeçalho */}
        <header className="pt-3 shrink-0" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <button onClick={onMinimize} aria-label="Minimizar treino" title="Minimizar treino"
              className="h-11 w-11 shrink-0 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition">
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate leading-tight">{w.nome}</h1>
              <p className="text-xs text-muted-foreground">Exercício {curIdx + 1} de {exs.length} · {feitos} concluído{feitos === 1 ? '' : 's'}</p>
            </div>
            <div className={`shrink-0 h-11 px-3 rounded-full border flex items-center gap-1.5 tabular-nums font-bold ${pausado ? 'border-border bg-card text-muted-foreground' : 'border-primary/40 bg-primary/10 text-primary'}`}
              aria-label="Tempo de treino">
              {pausado ? <Pause className="w-4 h-4" /> : <Timer className="w-4 h-4" />}{fmt(seg)}
            </div>
          </div>
          <div className="flex gap-1 mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={exs.length} aria-valuenow={feitos} aria-label="Progresso do treino">
            {exs.map((e, i) => (
              <span key={e.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${e.feito ? 'bg-primary' : e.pulado ? 'bg-muted-foreground/40' : i === curIdx ? 'bg-primary/40 fw-pulse' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={togglePause} className={`h-11 px-3.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition ${pausado ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
              {pausado ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}{pausado ? 'Retomar' : 'Pausar'}
            </button>
            <button onClick={onCancel} className="h-11 px-3.5 rounded-full border border-border bg-card text-sm font-semibold text-destructive flex items-center gap-1.5 active:scale-95 transition">
              <X className="w-4 h-4" />Cancelar
            </button>
            <span className="flex-1" />
            <button onClick={() => { setMuted(!muted); setFitnessMuted(!muted); }} aria-label={muted ? 'Ativar sons' : 'Silenciar sons'} title={muted ? 'Ativar sons' : 'Silenciar sons'}
              className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground active:scale-95 transition">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setListOpen(true)} aria-label="Ver exercícios" title="Ver exercícios"
              className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground active:scale-95 transition">
              <ListChecks className="w-4 h-4" />
            </button>
          </div>
        </header>

        {askRest || resting ? (
          /* Modo descanso */
          <main key="rest" className="fw-enter flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-5 py-4">
            {askRest ? <>
              <div className="fw-pop h-20 w-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
                <Check className="w-10 h-10" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-primary font-semibold">Exercício concluído</p>
                <h2 className="text-xl font-bold mt-1 break-words">{session.pendingRestExercicio}</h2>
                <p className="text-sm text-muted-foreground mt-2">Descansar antes do próximo?</p>
              </div>
              <button onClick={() => iniciarDescanso(session.pendingRestSeg as number)} className="fw-cta w-full h-14 rounded-2xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition">
                <Timer className="w-5 h-5" />Descansar {session.pendingRestSeg}s
              </button>
              <div className="flex gap-2 w-full">
                {[60, 90].filter(v => v !== session.pendingRestSeg).map(seconds => (
                  <button key={seconds} onClick={() => iniciarDescanso(seconds)} className="flex-1 h-12 rounded-xl bg-card border border-border font-semibold active:scale-95 transition">{seconds}s</button>
                ))}
                <button onClick={dispensarDescanso} className="flex-[2] h-12 rounded-xl bg-card border border-border font-semibold text-muted-foreground active:scale-95 transition">Seguir sem descanso</button>
              </div>
            </> : <>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">Descanso</p>
              <div className="relative w-56 h-56">
                <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90" aria-hidden>
                  <circle cx="110" cy="110" r="96" fill="none" strokeWidth="10" className="stroke-muted" />
                  <circle cx="110" cy="110" r="96" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-primary fw-ring"
                    strokeDasharray={RING} strokeDashoffset={RING * (1 - restFrac)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-6xl font-black tabular-nums ${descansoSeg <= 3 ? 'text-primary fw-pulse' : ''}`}>{fmt(descansoSeg)}</span>
                  <span className="text-xs text-muted-foreground mt-1">de {fmt(restTotal)}</span>
                </div>
              </div>
              {current && !allFinished && <p className="text-sm text-muted-foreground">A seguir: <span className="text-foreground font-semibold">{current.nome}</span></p>}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={() => addDescanso(-15)} className="h-12 rounded-xl bg-card border border-border font-semibold active:scale-95 transition">−15s</button>
                <button onClick={() => addDescanso(15)} className="h-12 rounded-xl bg-card border border-primary/40 text-primary font-semibold active:scale-95 transition">+15s</button>
                <button onClick={() => addDescanso(30)} className="h-12 rounded-xl bg-card border border-border font-semibold active:scale-95 transition">+30s</button>
              </div>
              <button onClick={dispensarDescanso} className="fw-cta w-full h-14 rounded-2xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition">
                <SkipForward className="w-5 h-5" />Pular descanso
              </button>
            </>}
          </main>
        ) : current ? <>
          {/* Exercício */}
          <main key={current.id} className="fw-enter flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 py-3">
            {restJustEnded && (
              <div className="fw-pop shrink-0 rounded-xl bg-primary/15 border border-primary/40 text-primary text-sm font-semibold text-center py-2">Descanso concluído — bora!</div>
            )}
            <div className="relative flex-1 basis-40 min-h-[120px] max-h-[300px] rounded-2xl overflow-hidden bg-card border border-border">
              {img
                ? <img src={img} alt={current.nome} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-primary/60"><Dumbbell className="w-16 h-16" /></div>}
              <div className="absolute inset-0 fw-image-fade" aria-hidden />
              <span className="absolute top-3 left-3 h-8 px-3 rounded-full bg-background/80 border border-border text-xs font-bold tabular-nums flex items-center">
                {String(curIdx + 1).padStart(2, '0')}<span className="text-muted-foreground">/{String(exs.length).padStart(2, '0')}</span>
              </span>
              {(current.feito || current.pulado) && (
                <span className={`absolute top-3 right-3 h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1 ${current.feito ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {current.feito ? <><Check className="w-3.5 h-3.5" />Concluído</> : <><SkipForward className="w-3.5 h-3.5" />Pulado</>}
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 p-4">
                <p className="text-[11px] uppercase tracking-widest text-primary font-semibold">{grupo}</p>
                <h2 className="text-2xl font-black leading-tight break-words">{current.nome}</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 shrink-0">
              {indicators.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-card border border-border px-2 py-2.5 text-center min-w-0">
                  <Icon className="w-4 h-4 mx-auto text-primary" />
                  <p className="text-lg font-black tabular-nums leading-tight mt-1 truncate">{value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {current.tipo === 'musculacao' && (
              <div className="shrink-0 rounded-2xl bg-card border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <label htmlFor="focus-load" className="uppercase tracking-wide font-semibold">Carga (kg)</label>
                  <span>{current.cargaUltima != null ? `Treino anterior: ${current.cargaUltima} kg` : 'Sem registro anterior'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button aria-label="Diminuir carga" onClick={() => setCargaReal(current.id, String(Math.max(0, cargaNum - 2.5)))}
                    className="h-14 w-14 shrink-0 rounded-2xl bg-muted border border-border flex items-center justify-center active:scale-90 transition"><Minus className="w-6 h-6" /></button>
                  <input id="focus-load" inputMode="decimal" value={current.cargaReal || ''} onChange={e => setCargaReal(current.id, e.target.value)} placeholder="0"
                    className="fitness-focus-load flex-1 min-w-0 h-14 rounded-2xl bg-background border border-border text-center font-black tabular-nums text-primary focus:outline-none focus:border-primary" />
                  <button aria-label="Aumentar carga" onClick={() => setCargaReal(current.id, String(cargaNum + 2.5))}
                    className="h-14 w-14 shrink-0 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center active:scale-90 transition"><Plus className="w-6 h-6" /></button>
                </div>
                {showSuggestion && (
                  <button onClick={() => aplicarSugestao(current.id, suggestion as number)} className="mt-2 w-full h-11 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition">
                    <TrendingUp className="w-4 h-4" />Progressão sugerida: usar {suggestion} kg
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Ações ao alcance do polegar */}
          <footer className="shrink-0 pt-2" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
            <button disabled={pausado} onClick={mainAction}
              className="fw-cta w-full h-14 rounded-2xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40">
              <Check className="w-5 h-5" />{pausado ? 'Treino pausado' : mainLabel}
            </button>
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              <button disabled={curIdx === 0} onClick={() => patch({ currentIndex: curIdx - 1 })} aria-label="Exercício anterior"
                className="h-11 rounded-xl text-sm font-medium text-muted-foreground flex items-center justify-center gap-1 disabled:opacity-30 active:bg-card transition"><ChevronLeft className="w-4 h-4" />Anterior</button>
              <button disabled={pausado || current.feito || !!current.pulado} onClick={() => pularEx(current.id)}
                className="h-11 rounded-xl text-sm font-medium text-muted-foreground flex items-center justify-center gap-1 disabled:opacity-30 active:bg-card transition"><SkipForward className="w-4 h-4" />Pular</button>
              <button disabled={curIdx >= exs.length - 1} onClick={() => patch({ currentIndex: curIdx + 1 })} aria-label="Exercício seguinte"
                className="h-11 rounded-xl text-sm font-medium text-muted-foreground flex items-center justify-center gap-1 disabled:opacity-30 active:bg-card transition">Próximo<ChevronRight className="w-4 h-4" /></button>
            </div>
          </footer>
        </> : <main className="flex-1 flex items-center justify-center text-muted-foreground">Treino sem exercícios</main>}
      </div>

      <FitnessPopup open={listOpen} onOpenChange={setListOpen} title={`Exercícios · ${feitos}/${exs.length}`} workout>
        <div className="space-y-1.5">
          {exs.map((ex, index) => {
            const isCur = index === curIdx;
            return (
              <button key={ex.id} onClick={() => { patch({ currentIndex: index }); setListOpen(false); }}
                className={`w-full min-h-14 rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition active:scale-[0.99] ${isCur ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${ex.feito ? 'bg-primary text-primary-foreground' : ex.pulado ? 'bg-muted text-muted-foreground' : isCur ? 'border border-primary text-primary' : 'border border-border text-muted-foreground'}`}>
                  {ex.feito ? <Check className="w-4 h-4" /> : ex.pulado ? <SkipForward className="w-4 h-4" /> : index + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block break-words font-semibold ${ex.pulado ? 'text-muted-foreground line-through' : ''}`}>{ex.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ex.tipo === 'musculacao' ? `${ex.series} × ${ex.repeticoes}${ex.cargaReal ? ` · ${ex.cargaReal} kg` : ''}` : `${ex.duracao_min || 0} min`}
                    {' · '}{ex.feito ? 'Concluído' : ex.pulado ? 'Pulado' : isCur ? 'Atual' : 'Pendente'}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
        <Button variant="outline" className="w-full h-12" disabled={!exs.length} onClick={() => { setListOpen(false); onFinish(); }}><Check />Finalizar treino</Button>
      </FitnessPopup>
    </div>
  );
};

/* ---------- Resumo do treino ---------- */
const ResumoTreino = ({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) => {
  const comCarga = summary.itens.filter(i => i.feito && i.carga != null);
  const subiram = comCarga.filter(i => i.anterior != null && (i.carga as number) > i.anterior).length;
  const stats = [
    { icon: Clock, label: 'Tempo total', value: fmtClock(summary.durSec) },
    { icon: Dumbbell, label: 'Exercícios', value: `${summary.feitos}/${summary.total}` },
    { icon: Layers, label: 'Séries', value: String(summary.series) },
  ];
  return (
    <div className="fitness-theme fitness-workout min-h-[100dvh] bg-background text-foreground">
      <div className="fw-enter max-w-lg mx-auto px-4 pb-28" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
        <div className="text-center">
          <div className="fw-pop mx-auto h-20 w-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-primary"><Trophy className="w-10 h-10" /></div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mt-4">Treino concluído</p>
          <h1 className="text-2xl font-black mt-1 break-words">{summary.nome}</h1>
          <p className="text-sm text-muted-foreground mt-1">+{summary.xp} XP{summary.pulados ? ` · ${summary.pulados} pulado${summary.pulados === 1 ? '' : 's'}` : ''}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-card border border-border px-2 py-3 text-center">
              <Icon className="w-4 h-4 mx-auto text-primary" />
              <p className="text-xl font-black tabular-nums mt-1">{value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {subiram > 0 && (
          <div className="mt-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold px-3 py-2.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 shrink-0" />Você aumentou a carga em {subiram} exercício{subiram === 1 ? '' : 's'} em relação ao treino anterior.
          </div>
        )}
        <h2 className="text-sm font-bold mt-6 mb-2">Exercícios e cargas</h2>
        <div className="space-y-1.5">
          {summary.itens.map((i, idx) => {
            const diff = i.feito && i.carga != null && i.anterior != null ? Math.round((i.carga - i.anterior) * 100) / 100 : null;
            return (
              <div key={idx} className="rounded-xl bg-card border border-border px-3 py-2.5 flex items-center gap-3">
                <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${i.feito ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i.feito ? <Check className="w-4 h-4" /> : i.pulado ? <SkipForward className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block break-words text-sm font-semibold ${i.feito ? '' : 'text-muted-foreground'}`}>{i.nome}</span>
                  <span className="block text-xs text-muted-foreground">{i.feito ? (i.carga != null ? `${i.carga} kg` : 'Concluído') : i.pulado ? 'Pulado' : 'Não realizado'}</span>
                </span>
                {diff != null && (
                  <span className={`shrink-0 text-xs font-bold tabular-nums flex items-center gap-1 ${diff > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Equal className="w-3.5 h-3.5" />}
                    {diff === 0 ? 'igual' : `${diff > 0 ? '+' : ''}${diff} kg`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-background/95 border-t border-border">
        <div className="max-w-lg mx-auto px-4 pt-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <button onClick={onClose} className="fw-cta w-full h-14 rounded-2xl font-extrabold uppercase tracking-wide active:scale-[0.98] transition">Concluir</button>
        </div>
      </div>
    </div>
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
