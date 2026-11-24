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

} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { playSfx, celebrate, isFitnessMuted, setFitnessMuted } from '@/lib/fitnessFeedback';
import {
  useFitnessActiveSession, ActiveSession, ActiveSessionExercise, elapsedSec, writeSession, readSession,
} from '@/hooks/useFitnessActiveSession';
import { isWorkoutIdle, lastActivityOf } from '@/lib/fitnessSessionIdle';

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
    setSession(null);
    setView('list');
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
}: {
  onCancel: () => void;
  onFinish: () => void;
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
  const [focusOpen, setFocusOpen] = useState(true);
  const [modo, setModo] = useState<'foco' | 'lista'>(() => (localStorage.getItem('fitness_session_mode') as any) === 'lista' ? 'lista' : 'foco');
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

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

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
  const pct = exs.length ? (feitos / exs.length) * 100 : 0;
  const current = exs[Math.min(session.currentIndex, Math.max(0, exs.length - 1))];
  const allFinished = exs.length > 0 && exs.every(e => e.feito || e.pulado);
  const controls = <div className="flex justify-center gap-2">
    <Button variant="outline" className="h-11" onClick={togglePause}>{pausado ? <Play /> : <Pause />}{pausado ? 'Retomar' : 'Pausar'}</Button>
    <Button variant="outline" className="h-11 text-destructive" onClick={onCancel}><X />Cancelar</Button>
  </div>;
  const exerciseContent = current && <>
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>Exercício {session.currentIndex + 1}/{exs.length}</span><span className="tabular-nums">{fmt(seg)}{pausado ? ' · pausado' : ''}</span>
    </div>
    {controls}
    {session.pendingRestSeg && descansoSeg === 0 ? <div className="space-y-3 py-4 text-center">
      <h2 className="font-semibold">Descansar antes do próximo?</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {[session.pendingRestSeg, 60, 90].filter((v, i, a) => a.indexOf(v) === i).map(seconds => <Button key={seconds} onClick={() => iniciarDescanso(seconds)}>{seconds}s</Button>)}
      </div>
      <Button variant="outline" className="w-full h-12" onClick={dispensarDescanso}>Seguir sem descanso</Button>
    </div> : descansoSeg > 0 ? <div className="text-center space-y-4 py-4">
      <h2 className="font-semibold">Descanso</h2><p className="text-5xl font-bold tabular-nums text-primary">{fmt(descansoSeg)}</p>
      <div className="flex justify-center gap-2"><Button variant="outline" onClick={() => addDescanso(-15)}>-15s</Button><Button variant="outline" onClick={() => addDescanso(30)}>+30s</Button><Button onClick={dispensarDescanso}>Pular</Button></div>
    </div> : <>
      {exerciseImage(current.nome) && <img src={exerciseImage(current.nome)} alt={current.nome} className="w-32 h-32 object-cover rounded-lg mx-auto" />}
      <div className="text-center">
        <h2 className="text-xl font-bold leading-snug break-words">{current.nome}</h2>
        <p className="text-sm text-muted-foreground mt-2">{current.tipo === 'musculacao' ? `${current.series} séries × ${current.repeticoes} reps · ${current.descanso_seg || 0}s descanso` : `${current.duracao_min || 0} min${current.intensidade ? ` · ${current.intensidade}` : ''}${current.distancia_km ? ` · ${current.distancia_km} km` : ''}`}</p>
        {current.feito && <p className="text-primary mt-2">Concluído</p>}
        {current.pulado && <p className="text-muted-foreground mt-2">Pulado</p>}
      </div>
      {current.tipo === 'musculacao' && <div>
        <label htmlFor="focus-load" className="block text-center text-sm text-muted-foreground mb-2">Carga (kg){current.cargaUltima != null ? ` · anterior ${current.cargaUltima}` : ''}</label>
        <div className="flex justify-center items-center gap-3">
          <Button variant="outline" size="icon" className="h-12 w-12" aria-label="Diminuir carga" onClick={() => setCargaReal(current.id, String(Math.max(0, (parseFloat((current.cargaReal || '0').replace(',', '.')) || 0) - 2.5)))}>−</Button>
          <input id="focus-load" inputMode="decimal" value={current.cargaReal || ''} onChange={e => setCargaReal(current.id, e.target.value)} placeholder="0" className="fitness-focus-load w-28 h-14 rounded-lg border border-input bg-muted text-center font-bold" />
          <Button variant="outline" size="icon" className="h-12 w-12" aria-label="Aumentar carga" onClick={() => setCargaReal(current.id, String((parseFloat((current.cargaReal || '0').replace(',', '.')) || 0) + 2.5))}>+</Button>
        </div>
        {(() => { const suggestion = sugerirProgressao(current.cargaUltima); return suggestion != null && !current.feito && !current.pulado && (parseFloat((current.cargaReal || '0').replace(',', '.')) || 0) < suggestion ? <Button variant="ghost" className="w-full mt-2" onClick={() => aplicarSugestao(current.id, suggestion)}><TrendingUp />Usar {suggestion} kg</Button> : null; })()}
      </div>}
      <Button className="w-full h-14 text-base" disabled={pausado} onClick={() => { if (allFinished) { onFinish(); return; } if (current.feito || current.pulado) { const next = exs.findIndex(e => !e.feito && !e.pulado); if (next >= 0) patch({ currentIndex: next }); } else concluir(current.id); }}><Check />{allFinished ? 'Finalizar treino' : current.feito || current.pulado ? 'Próximo exercício' : 'Concluir exercício'}</Button>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" aria-label="Exercício anterior" disabled={session.currentIndex === 0} onClick={() => patch({ currentIndex: session.currentIndex - 1 })}>←</Button>
        <Button variant="outline" disabled={pausado || current.feito || current.pulado} onClick={() => pularEx(current.id)}><SkipForward />Pular</Button>
        <Button variant="outline" aria-label="Exercício seguinte" disabled={session.currentIndex >= exs.length - 1} onClick={() => patch({ currentIndex: session.currentIndex + 1 })}>→</Button>
      </div>
    </>}
  </>;
  return <FitnessLayout hideNav>
    <div className="max-w-md mx-auto space-y-5 text-foreground">
      <h1 className="text-xl font-bold pr-10 break-words">{w.nome}</h1>
      <div className="flex items-center justify-between"><span className="text-3xl font-bold tabular-nums">{fmt(seg)}</span><span className="text-sm text-muted-foreground">{feitos}/{exs.length} concluídos</span></div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      {controls}
      <div className="flex items-center gap-2">
        <Button variant={modo === 'foco' ? 'default' : 'outline'} className="flex-1" onClick={() => { setModo('foco'); setFocusOpen(true); localStorage.setItem('fitness_session_mode', 'foco'); }}>Modo foco</Button>
        <Button variant={modo === 'lista' ? 'default' : 'outline'} className="flex-1" onClick={() => { setModo('lista'); setFocusOpen(false); localStorage.setItem('fitness_session_mode', 'lista'); }}>Exercícios</Button>
        <Button variant="outline" size="icon" aria-label={muted ? 'Ativar sons' : 'Silenciar sons'} title={muted ? 'Ativar sons' : 'Silenciar sons'} onClick={() => { setMuted(!muted); setFitnessMuted(!muted); }}>{muted ? '🔇' : '🔊'}</Button>
      </div>
      {modo === 'foco' ? <Button variant="outline" className="w-full h-auto py-5 whitespace-normal text-left justify-between" onClick={() => setFocusOpen(true)}><span><span className="block text-xs text-muted-foreground mb-1">Exercício atual</span>{current?.nome || 'Treino'}</span><ChevronRight /></Button> : <div className="divide-y divide-border">
        {exs.map((ex, index) => <Button key={ex.id} variant="ghost" className="w-full h-auto min-h-16 whitespace-normal justify-start py-3 rounded-none" onClick={() => { patch({ currentIndex: index }); setFocusOpen(true); }}>
          <span className="w-7 shrink-0 text-primary">{ex.feito ? <Check /> : ex.pulado ? <SkipForward /> : index + 1}</span>
          <span className="flex-1 text-left break-words">{ex.nome}<span className="block text-xs text-muted-foreground">{ex.tipo === 'musculacao' ? `${ex.series} × ${ex.repeticoes}${ex.cargaReal ? ` · ${ex.cargaReal} kg` : ''}` : `${ex.duracao_min || 0} min`}</span></span><ChevronRight />
        </Button>)}
      </div>}
      <Button variant="outline" className="w-full h-12" disabled={!exs.length} onClick={onFinish}><Check />Finalizar treino</Button>
    </div>
    <FitnessPopup open={focusOpen} onOpenChange={setFocusOpen} title="Treino · foco">{exerciseContent}</FitnessPopup>
  </FitnessLayout>;
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
