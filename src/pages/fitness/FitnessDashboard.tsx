import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Droplet, Moon, Smile, Dumbbell, Plus, Minus, Gauge, ChevronRight } from 'lucide-react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { DialogBalloons } from '@/components/fitness/DialogBalloons';
import { XPBar } from '@/components/fitness/XPBar';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { Speedometer } from '@/components/fitness/Speedometer';

import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { useFitnessDailyLog } from '@/hooks/useFitnessDailyLog';
import { useFitnessTodayMeals } from '@/hooks/useFitnessTodayMeals';
import { useFitnessAchievementsAutoUnlock } from '@/hooks/useFitnessAchievementsAutoUnlock';
import { supabase } from '@/integrations/supabase/client';


const HUMORES = ['😄', '🙂', '😐', '😞', '😤'];

const FitnessDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading } = useFitnessProfile();
  const { log, upsertToday, loading: lLog } = useFitnessDailyLog();
  const { totals: mealTotals, meta: mealMeta } = useFitnessTodayMeals();
  useFitnessAchievementsAutoUnlock();
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [sonoLocal, setSonoLocal] = useState<string>('');
  const sonoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (profile && !profile.onboarding_completo) navigate('/fitness/onboarding', { replace: true });
  }, [profile, navigate]);

  // Sincroniza input local com o log diário (sem prender o usuário)
  useEffect(() => {
    if (log) setSonoLocal(log.sono_horas != null ? String(log.sono_horas) : '');
    else setSonoLocal('');
  }, [log?.id]);

  // Mensagem IA opcional
  useEffect(() => {
    if (!profile) return;
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hoje = diasSemana[new Date().getDay()];
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('fitness-coach-message', {
          body: {
            nome: profile.nome,
            mascote: profile.mascote_nome,
            streak: profile.streak_dias,
            humor: log?.humor,
            diaSemana: hoje,
          },
        });
        if (data?.mensagem) setAiMsg(data.mensagem);
      } catch { /* ignore */ }
    })();
  }, [profile?.id]);

  // Mensagens dinâmicas baseadas no estado atual
  const mensagens = useMemo(() => {
    if (!profile) return [] as string[];
    const nome = profile.nome.split(' ')[0];
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hoje = diasSemana[new Date().getDay()];
    const metaSono = Number(profile.meta_sono_horas ?? 8);
    const sono = log?.sono_horas != null ? Number(log.sono_horas) : null;
    const humor = log?.humor;
    const agua = log?.agua_ml || 0;
    const metaAgua = profile.agua_meta_ml || 2500;

    const arr: string[] = [];
    const lembretes: string[] = [];
    if (sono == null) lembretes.push(`${nome}, não esqueça de registrar seu sono hoje 😴`);
    if (!humor) lembretes.push('Como você está se sentindo hoje? Marca aí pra mim 💬');
    if (agua < metaAgua * 0.3) lembretes.push(`Já bebeu água hoje? Meta: ${metaAgua}ml 💧`);
    arr.push(...lembretes);
    arr.push(`Bom dia, ${nome}! Hoje é ${hoje}. Bora treinar?`);

    if (profile.streak_dias >= 3) {
      arr.push(`🔥 ${profile.streak_dias} dias seguidos! Não pare agora.`);
    } else {
      arr.push('Vamos começar uma nova sequência hoje!');
    }

    if (sono != null) {
      const diff = sono - metaSono;
      if (diff >= 0) arr.push(`Sono de ${sono}h — meta batida! Energia full ⚡`);
      else if (diff >= -1) arr.push(`Quase lá no sono (${sono}h/${metaSono}h). Hoje durma cedo!`);
      else arr.push(`Só ${sono}h de sono? Cuidado, foque em descansar hoje 😴`);
    } else {
      arr.push(`Sua meta de sono é ${metaSono}h. Registre como dormiu hoje.`);
    }

    if (humor === '😄' || humor === '🙂') arr.push('Energia boa hoje, aproveita pra um treino top!');
    else if (humor === '😐') arr.push('Dia neutro? Movimento ajuda a melhorar o humor 💪');
    else if (humor === '😞' || humor === '😤') arr.push('Vai com calma hoje, um treino leve já conta 💛');

    if (agua < metaAgua * 0.5) arr.push(`Você bebeu ${agua}ml. Lembre da hidratação 💧`);
    else if (agua >= metaAgua) arr.push('Hidratação batida! 💧✨');

    if (aiMsg) arr.unshift(aiMsg);

    return arr;
  }, [profile, log, aiMsg]);

  if (loading || lLog || !profile) {
    return (
      <FitnessLayout hideNav>
        <div className="flex items-center justify-center py-20 text-cyan-300">Carregando...</div>
      </FitnessLayout>
    );
  }

  const agua = log?.agua_ml || 0;
  const aguaMeta = profile.agua_meta_ml || 2500;
  const aguaPct = Math.min(100, (agua / aguaMeta) * 100);

  const updateAgua = async (delta: number) => {
    const novo = Math.max(0, agua + delta);
    await upsertToday({ agua_ml: novo });
  };

  const setHumor = async (h: string) => {
    await upsertToday({ humor: h });
  };

  const onSonoChange = (v: string) => {
    setSonoLocal(v);
    if (sonoDebounce.current) clearTimeout(sonoDebounce.current);
    sonoDebounce.current = setTimeout(() => {
      const n = v ? parseFloat(v.replace(',', '.')) : null;
      upsertToday({ sono_horas: Number.isFinite(n as number) ? (n as number) : null });
    }, 700);
  };

  const metaSono = Number(profile.meta_sono_horas ?? 8);
  const sonoNum = sonoLocal ? parseFloat(sonoLocal.replace(',', '.')) : null;
  const sonoStatus = (() => {
    if (sonoNum == null || !Number.isFinite(sonoNum)) return null;
    const diff = sonoNum - metaSono;
    if (diff >= 0) return { emoji: '⚡', txt: `+${diff.toFixed(1)}h acima da meta`, color: 'text-emerald-400' };
    if (diff >= -1) return { emoji: '💤', txt: `quase lá (${Math.abs(diff).toFixed(1)}h pra meta)`, color: 'text-amber-400' };
    return { emoji: '😴', txt: `${Math.abs(diff).toFixed(1)}h abaixo da meta`, color: 'text-rose-400' };
  })();

  const humorMsg: Record<string, string> = {
    '😄': 'Hoje é dia de quebrar recordes!',
    '🙂': 'Bem-estar leve, bora se mover.',
    '😐': 'Treino curto melhora o humor.',
    '😞': 'Cuida de você. Um alongamento já ajuda.',
    '😤': 'Canaliza essa energia no treino!',
  };

  return (
    <FitnessLayout>
      {/* Balões animados ao redor do avatar */}
      <div className="mt-2 mb-2">
        <DialogBalloons
          avatarId={profile.avatar_id}
          mascoteNome={profile.mascote_nome}
          mensagens={mensagens}
          intervaloMs={20000}
        />
      </div>

      <div className="text-center mb-4">
        <p className="text-[11px] uppercase tracking-widest text-cyan-300/70">Bem-vindo de volta</p>
        <h1 className="text-2xl font-black mt-0.5">{profile.nome}</h1>
      </div>

      <FitnessCard className="mb-4">
        <XPBar xp={profile.xp} />
      </FitnessCard>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <FitnessCard glow="fuchsia">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{profile.streak_dias}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">dias seguidos</p>
            </div>
          </div>
        </FitnessCard>
        <FitnessCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/20 text-cyan-300">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">
                {profile.peso_atual ? `${profile.peso_atual}` : '--'}
                <span className="text-xs text-slate-500 font-normal ml-1">kg</span>
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">peso atual</p>
            </div>
          </div>
        </FitnessCard>
      </div>

      <FitnessCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-300" />
            <span className="text-sm font-semibold">Hidratação</span>
          </div>
          <span className="text-xs text-slate-400">{agua}/{aguaMeta} ml</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800/60 overflow-hidden mb-3">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${aguaPct}%`, background: 'linear-gradient(90deg, #22d3ee, #67e8f9)' }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateAgua(-250)}
            className="flex-1 h-10 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-center active:scale-95"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateAgua(250)}
            className="flex-[2] h-10 rounded-lg flex items-center justify-center gap-2 font-semibold text-slate-900 active:scale-95"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #06b6d4)' }}
          >
            <Plus className="w-4 h-4" /> 250 ml
          </button>
        </div>
      </FitnessCard>

      <FitnessCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Smile className="w-4 h-4 text-fuchsia-300" />
          <span className="text-sm font-semibold">Como você está hoje?</span>
          {log?.humor && <span className="ml-auto text-[10px] text-emerald-400">✓ registrado · reseta amanhã</span>}
        </div>
        {log?.humor ? (
          <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-400/30 p-4 text-center">
            <div className="text-4xl mb-1">{log.humor}</div>
            <p className="text-xs text-fuchsia-200">{humorMsg[log.humor]}</p>
            <p className="text-[10px] text-slate-500 mt-2">Veja a evolução no histórico</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {HUMORES.map(h => (
              <button
                key={h}
                onClick={() => setHumor(h)}
                className="h-12 rounded-xl text-2xl transition-all bg-slate-800/40 border border-slate-700 active:scale-95"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </FitnessCard>

      <FitnessCard className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-300" />
            <div>
              <p className="text-sm font-semibold">Sono</p>
              <p className="text-[10px] text-slate-500">meta: {metaSono}h</p>
            </div>
          </div>
          {log?.sono_horas != null ? (
            <div className="text-right">
              <p className="text-xl font-black text-indigo-300">{log.sono_horas}h</p>
              <p className="text-[10px] text-emerald-400">✓ reseta amanhã</p>
            </div>
          ) : (
            <input
              type="text"
              inputMode="decimal"
              value={sonoLocal}
              onChange={e => onSonoChange(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0"
              className="w-20 h-10 rounded-lg bg-slate-800/60 border border-slate-700 px-3 text-right focus:outline-none focus:border-indigo-400 text-base"
            />
          )}
        </div>
        {sonoStatus && (
          <div className={`flex items-center gap-1.5 mt-2 text-xs ${sonoStatus.color}`}>
            <span className="text-base">{sonoStatus.emoji}</span>
            <span>{sonoStatus.txt}</span>
          </div>
        )}
      </FitnessCard>




      <button
        onClick={() => navigate('/fitness/treinos')}
        className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 mb-4 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
          boxShadow: '0 8px 24px rgba(34,211,238,0.25)',
        }}
      >
        <Dumbbell className="w-5 h-5" /> Iniciar Treino
      </button>
    </FitnessLayout>
  );
};

export default FitnessDashboard;
