import { useMemo } from 'react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { useFitnessDailyLog } from '@/hooks/useFitnessDailyLog';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { Moon, Smile, Droplet, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const last7 = (history: any[]) => history.slice(0, 7);
const prev7 = (history: any[]) => history.slice(7, 14);

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const FitnessHistorico = () => {
  const { profile, loading: lp } = useFitnessProfile();
  const { history, loading: lh } = useFitnessDailyLog();

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
    </FitnessLayout>
  );
};

export default FitnessHistorico;
