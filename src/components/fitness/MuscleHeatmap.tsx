import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FitnessCard } from './FitnessCard';
import { lastTrainedDays, heatLevel, Muscle, MUSCLE_LABEL, HeatLog } from '@/lib/muscleHeat';

const COLORS = ['#f43f5e', '#f59e0b', '#22d3ee', '#334155'];
const LEGEND = ['Treinado agora', 'Recuperando', 'Pronto p/ treinar', 'Sem treino'];

export function MuscleHeatmap() {
  const [days, setDays] = useState<Record<Muscle, number | null> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date(Date.now() - 8 * 86_400_000).toISOString();
      const { data } = await supabase
        .from('fitness_workout_logs')
        .select('created_at, exercicios, fitness_workouts(grupo_muscular)')
        .eq('user_id', user.id)
        .gte('created_at', since);
      const logs: HeatLog[] = ((data as any[]) || []).map(l => ({
        created_at: l.created_at,
        exercicios: Array.isArray(l.exercicios) ? l.exercicios : [],
        grupo: l.fitness_workouts?.grupo_muscular ?? null,
      }));
      setDays(lastTrainedDays(logs));
    })();
  }, []);

  const c = (m: Muscle) => COLORS[heatLevel(days?.[m] ?? null)];
  const glow = (m: Muscle) => heatLevel(days?.[m] ?? null) < 3 ? `drop-shadow(0 0 4px ${c(m)})` : undefined;
  const P = (m: Muscle, d: string, k?: string) => (
    <path key={k || d} d={d} fill={c(m)} style={{ filter: glow(m), transition: 'fill .4s' }} />
  );

  const Body = ({ back }: { back?: boolean }) => (
    <svg viewBox="0 0 100 200" className="w-full h-44">
      <circle cx="50" cy="16" r="11" fill="#1e293b" stroke="#475569" />
      <rect x="45" y="26" width="10" height="6" fill="#1e293b" />
      {P('ombros', 'M28 34 Q22 36 21 46 L30 46 L32 36 Z', 'oe')}
      {P('ombros', 'M72 34 Q78 36 79 46 L70 46 L68 36 Z', 'od')}
      {back
        ? P('costas', 'M33 34 L67 34 L66 80 Q50 88 34 80 Z')
        : P('peito', 'M33 34 L67 34 L66 56 Q50 62 34 56 Z')}
      {!back && P('abdomen', 'M37 59 Q50 64 63 59 L61 92 L39 92 Z')}
      {back && <path d="M36 82 Q50 90 64 82 L62 94 L38 94 Z" fill="#1e293b" />}
      {P('bracos', 'M20 48 L30 48 L28 96 L19 96 Z', 'be')}
      {P('bracos', 'M80 48 L70 48 L72 96 L81 96 Z', 'bd')}
      {P('pernas', 'M38 96 L49 96 L48 178 L38 178 Z', 'pe')}
      {P('pernas', 'M51 96 L62 96 L62 178 L52 178 Z', 'pd')}
    </svg>
  );

  return (
    <FitnessCard className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold">Mapa muscular · 7 dias</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Body /><p className="text-[10px] text-center text-slate-400">Frente</p></div>
        <div><Body back /><p className="text-[10px] text-center text-slate-400">Costas</p></div>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {LEGEND.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />{l}
          </span>
        ))}
      </div>
      {days && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(Object.keys(MUSCLE_LABEL) as Muscle[]).map(m => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">
              {MUSCLE_LABEL[m]}: {days[m] == null ? '—' : days[m] === 0 ? 'hoje' : `${days[m]}d`}
            </span>
          ))}
        </div>
      )}
    </FitnessCard>
  );
}
