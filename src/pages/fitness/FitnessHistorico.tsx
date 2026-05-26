import { useEffect, useMemo, useState } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { useFitnessDailyLog } from '@/hooks/useFitnessDailyLog';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { Moon, Smile, Droplet, TrendingUp, TrendingDown, Minus, Dumbbell, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const last7 = (history: any[]) => history.slice(0, 7);
const prev7 = (history: any[]) => history.slice(7, 14);

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const FitnessHistorico = () => {
  const { profile, loading: lp } = useFitnessProfile();
  const { history, loading: lh } = useFitnessDailyLog();
  const [logs, setLogs] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDur, setEditDur] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au) return;
      const { data } = await supabase
        .from('fitness_workout_logs')
        .select('*, fitness_workouts(nome, cor)')
        .eq('user_id', au.id)
        .order('data_treino', { ascending: false })
        .limit(30);
      setLogs(data || []);
    })();
  }, []);

  const podeEditar = (data: string) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const d = new Date(data + 'T00:00');
    const diff = (hoje.getTime() - d.getTime()) / (24 * 60 * 60 * 1000);
    return diff <= 1;
  };

  const excluirLog = async (id: string) => {
    if (!confirm('Excluir este treino do histórico?')) return;
    await supabase.from('fitness_workout_logs').delete().eq('id', id);
    setLogs(prev => prev.filter(l => l.id !== id));
    toast.success('Treino removido');
  };

  const salvarEdicao = async (id: string) => {
    const dur = parseInt(editDur) || 0;
    await supabase.from('fitness_workout_logs').update({ duracao_min: dur }).eq('id', id);
    setLogs(prev => prev.map(l => l.id === id ? { ...l, duracao_min: dur } : l));
    setEditing(null);
    toast.success('Atualizado');
  };

  const stats = useMemo(() => {
    const a = last7(history);
    const b = prev7(history);
    const sonoA = avg(a.map(x => Number(x.sono_horas)).filter(n => Number.isFinite(n) && n > 0));
    const sonoB = avg(b.map(x => Number(x.sono_horas)).filter(n => Number.isFinite(n) && n > 0));
    const aguaA = avg(a.map(x => Number(x.agua_ml || 0)));
    const aguaB = avg(b.map(x => Number(x.agua_ml || 0)));
    const treinosA = a.filter(x => x.treino_feito).length;
    const treinosB = b.filter(x => x.treino_feito).length;
    const moodCount = (arr: any[]) => arr.filter(x => ['😄', '🙂'].includes(x.humor)).length;
    const moodA = moodCount(a);
    const moodB = moodCount(b);
    return { sonoA, sonoB, aguaA, aguaB, treinosA, treinosB, moodA, moodB, total: a.length };
  }, [history]);

  if (lp || lh || !profile) {
    return <FitnessLayout><div className="text-center py-20 text-cyan-300">Carregando histórico...</div></FitnessLayout>;
  }

  const metaSono = Number(profile.meta_sono_horas ?? 8);
  const metaAgua = profile.agua_meta_ml ?? 2500;
  const metaTreinos = profile.meta_freq_semanal ?? 4;

  const cards = [
    {
      icon: <Moon className="w-5 h-5" />,
      label: 'Sono médio',
      atual: stats.sonoA,
      anterior: stats.sonoB,
      meta: metaSono,
      unidade: 'h',
      color: 'indigo',
      msg: stats.sonoA >= metaSono
        ? `Excelente! Acima da meta de ${metaSono}h.`
        : `Faltam ${(metaSono - stats.sonoA).toFixed(1)}h pra meta diária.`,
    },
    {
      icon: <Droplet className="w-5 h-5" />,
      label: 'Hidratação média',
      atual: stats.aguaA,
      anterior: stats.aguaB,
      meta: metaAgua,
      unidade: 'ml',
      color: 'cyan',
      decimals: 0,
      msg: stats.aguaA >= metaAgua
        ? 'Hidratação no ponto!'
        : `Beba mais ${Math.round(metaAgua - stats.aguaA)} ml/dia.`,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Treinos na semana',
      atual: stats.treinosA,
      anterior: stats.treinosB,
      meta: metaTreinos,
      unidade: '',
      color: 'fuchsia',
      decimals: 0,
      msg: stats.treinosA >= metaTreinos
        ? `Meta de ${metaTreinos} treinos batida!`
        : `Faltam ${metaTreinos - stats.treinosA} treinos pra meta.`,
    },
    {
      icon: <Smile className="w-5 h-5" />,
      label: 'Dias bem',
      atual: stats.moodA,
      anterior: stats.moodB,
      meta: 5,
      unidade: ' dias',
      color: 'amber',
      decimals: 0,
      msg: stats.moodA >= 5 ? 'Semana leve!' : 'Cuide do seu bem-estar 💛',
    },
  ];

  const evolucaoMsg = (() => {
    if (stats.treinosA > stats.treinosB) return `Você treinou +${stats.treinosA - stats.treinosB} vezes que a semana passada!`;
    if (stats.sonoA > stats.sonoB + 0.5) return 'Seu sono melhorou — corpo agradece!';
    if (stats.aguaA > stats.aguaB) return 'Sua hidratação subiu, segue assim 💧';
    return 'Vamos buscar uma evolução maior essa semana!';
  })();

  return (
    <FitnessLayout>
      <h1 className="text-2xl font-black mb-1">Histórico</h1>
      <p className="text-sm text-slate-400 mb-4">Últimos 7 dias vs 7 anteriores</p>

      <FitnessCard className="mb-4">
        <div className="flex items-center gap-4">
          <AvatarMascote avatarId={profile.avatar_id} mascoteNome={profile.mascote_nome} size="sm" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-cyan-300/80">{profile.mascote_nome} analisou</p>
            <p className="text-sm font-semibold mt-0.5">{evolucaoMsg}</p>
          </div>
        </div>
      </FitnessCard>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {cards.map((c, i) => {
          const diff = c.atual - c.anterior;
          const Trend = diff > 0.05 ? TrendingUp : diff < -0.05 ? TrendingDown : Minus;
          const trendColor = diff > 0.05 ? 'text-emerald-400' : diff < -0.05 ? 'text-rose-400' : 'text-slate-500';
          const pctMeta = c.meta > 0 ? Math.min(100, (c.atual / c.meta) * 100) : 0;
          return (
            <FitnessCard key={i} glow={i % 2 === 0 ? 'cyan' : 'fuchsia'}>
              <div className="flex items-center gap-2 mb-2 text-cyan-300">
                {c.icon}
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black">
                  {c.atual.toFixed(c.decimals ?? 1)}
                </p>
                <span className="text-xs text-slate-500">{c.unidade}</span>
              </div>
              <div className={`flex items-center gap-1 text-[11px] mt-1 ${trendColor}`}>
                <Trend className="w-3 h-3" />
                <span>
                  {diff > 0 ? '+' : ''}{diff.toFixed(c.decimals ?? 1)} vs semana ant.
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden mt-2">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pctMeta}%`,
                    background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{c.msg}</p>
            </FitnessCard>
          );
        })}
      </div>

      <FitnessCard className="mb-4">
        <h2 className="text-sm font-semibold mb-3">Diário recente</h2>
        {history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Sem registros ainda. Comece hoje!</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 14).map(h => (
              <div key={h.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-300 font-mono">
                  {new Date(h.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}
                </span>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-300" />
                    {h.sono_horas ? `${h.sono_horas}h` : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-cyan-300" />
                    {h.agua_ml || 0}ml
                  </span>
                  <span className="text-base">{h.humor || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </FitnessCard>

      <FitnessCard className="mb-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-cyan-300" /> Treinos realizados
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Nenhum treino registrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(l => {
              const editavel = podeEditar(l.data_treino);
              const feitos = Array.isArray(l.exercicios) ? l.exercicios.filter((e: any) => e.feito).length : 0;
              const total = Array.isArray(l.exercicios) ? l.exercicios.length : 0;
              const cor = l.fitness_workouts?.cor || '#22d3ee';
              return (
                <div key={l.id} className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-10 rounded-full" style={{ background: cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{l.fitness_workouts?.nome || 'Treino'}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(l.data_treino + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {' · '}
                        {editing === l.id ? (
                          <>
                            <input value={editDur} onChange={e => setEditDur(e.target.value.replace(/\D/g, ''))}
                              className="w-12 h-6 px-1 rounded bg-slate-800 border border-slate-700 text-center inline-block" />
                            <span className="ml-1">min</span>
                          </>
                        ) : (
                          <>{l.duracao_min}min</>
                        )}
                        {' · '}{feitos}/{total} ex · +{l.xp_ganho} XP
                      </p>
                    </div>
                    {editavel && (
                      editing === l.id ? (
                        <>
                          <button onClick={() => salvarEdicao(l.id)} className="p-1.5 text-emerald-400"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 text-slate-500"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditing(l.id); setEditDur(String(l.duracao_min || 0)); }} className="p-1.5 text-slate-400 hover:text-cyan-300">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => excluirLog(l.id)} className="p-1.5 text-slate-400 hover:text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )
                    )}
                  </div>
                  {Array.isArray(l.exercicios) && l.exercicios.length > 0 && (
                    <div className="mt-2 pl-4 text-[11px] text-slate-400 space-y-0.5">
                      {l.exercicios.slice(0, 5).map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={e.feito ? 'text-emerald-400' : e.pulado ? 'text-amber-400' : 'text-slate-500'}>
                            {e.feito ? '✓' : e.pulado ? '⤳' : '·'}
                          </span>
                          <span className="truncate flex-1">{e.nome}</span>
                          {e.tipo === 'cardio'
                            ? <span className="text-slate-500">{e.duracao_min}min {e.distancia_km ? `· ${e.distancia_km}km` : ''}</span>
                            : e.tipo === 'alongamento'
                              ? <span className="text-slate-500">{e.duracao_min}min</span>
                              : <span className="text-slate-500">{e.series}x{e.reps}{e.carga ? ` · ${e.carga}kg` : ''}</span>}
                        </div>
                      ))}
                      {l.exercicios.length > 5 && <span className="text-slate-600">+{l.exercicios.length - 5} mais...</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FitnessCard>
    </FitnessLayout>
  );
};

export default FitnessHistorico;
