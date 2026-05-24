import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Droplet, Moon, Smile, Dumbbell, Plus, Minus } from 'lucide-react';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { AvatarMascote } from '@/components/fitness/AvatarMascote';
import { XPBar } from '@/components/fitness/XPBar';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';

const HUMORES = ['😄', '🙂', '😐', '😞', '😤'];

const FitnessDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading, update } = useFitnessProfile();
  const [mensagem, setMensagem] = useState<string>('');

  useEffect(() => {
    if (profile && !profile.onboarding_completo) navigate('/fitness/onboarding', { replace: true });
  }, [profile, navigate]);

  // Mensagem do coach IA
  useEffect(() => {
    if (!profile) return;
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hoje = diasSemana[new Date().getDay()];
    const localMsgs = [
      `Bom dia, ${profile.nome.split(' ')[0]}! Hoje é ${hoje}. Bora treinar?`,
      profile.streak_dias >= 3
        ? `🔥 Você está há ${profile.streak_dias} dias seguidos! Não pare agora.`
        : 'Vamos começar uma nova sequência de treinos hoje!',
      'Lembre-se de beber água ao longo do dia 💧',
    ];
    setMensagem(localMsgs[Math.floor(Math.random() * localMsgs.length)]);

    // Tentar IA (fallback silencioso)
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('fitness-coach-message', {
          body: {
            nome: profile.nome,
            mascote: profile.mascote_nome,
            streak: profile.streak_dias,
            humor: profile.humor,
            diaSemana: hoje,
          },
        });
        if (data?.mensagem) setMensagem(data.mensagem);
      } catch { /* ignore */ }
    })();
  }, [profile?.id]);

  const aguaResetada = useMemo(() => {
    if (!profile) return 0;
    const hoje = new Date().toISOString().slice(0, 10);
    return profile.agua_data === hoje ? (profile.agua_hoje_ml || 0) : 0;
  }, [profile]);

  if (loading || !profile) {
    return (
      <FitnessLayout hideNav>
        <div className="flex items-center justify-center py-20 text-cyan-300">Carregando...</div>
      </FitnessLayout>
    );
  }

  const updateAgua = async (delta: number) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const base = profile.agua_data === hoje ? (profile.agua_hoje_ml || 0) : 0;
    const novo = Math.max(0, base + delta);
    await update({ agua_hoje_ml: novo, agua_data: hoje });
  };

  const setHumor = async (h: string) => update({ humor: h });

  const aguaMeta = profile.agua_meta_ml || 2500;
  const aguaPct = Math.min(100, (aguaResetada / aguaMeta) * 100);

  return (
    <FitnessLayout>
      {/* Saudação + Mascote */}
      <div className="flex flex-col items-center mt-2 mb-6">
        <AvatarMascote
          avatarId={profile.avatar_id}
          mascoteNome={profile.mascote_nome}
          mensagem={mensagem}
          size="md"
        />
      </div>

      {/* Header com nome */}
      <div className="text-center mb-4">
        <p className="text-[11px] uppercase tracking-widest text-cyan-300/70">Bem-vindo de volta</p>
        <h1 className="text-2xl font-black mt-0.5">{profile.nome}</h1>
      </div>

      {/* XP Bar */}
      <FitnessCard className="mb-4">
        <XPBar xp={profile.xp} />
      </FitnessCard>

      {/* Stats em grid */}
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

      {/* Água */}
      <FitnessCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-300" />
            <span className="text-sm font-semibold">Hidratação</span>
          </div>
          <span className="text-xs text-slate-400">{aguaResetada}/{aguaMeta} ml</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800/60 overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aguaPct}%` }}
            className="h-full"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #67e8f9)' }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateAgua(-250)}
            className="flex-1 h-10 rounded-lg bg-slate-800/60 border border-slate-700 hover:bg-slate-800 flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateAgua(250)}
            className="flex-[2] h-10 rounded-lg flex items-center justify-center gap-2 font-semibold text-slate-900"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #06b6d4)' }}
          >
            <Plus className="w-4 h-4" /> 250 ml
          </button>
        </div>
      </FitnessCard>

      {/* Humor */}
      <FitnessCard className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Smile className="w-4 h-4 text-fuchsia-300" />
          <span className="text-sm font-semibold">Como você está hoje?</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {HUMORES.map(h => (
            <button
              key={h}
              onClick={() => setHumor(h)}
              className={`h-12 rounded-xl text-2xl transition ${
                profile.humor === h
                  ? 'bg-fuchsia-500/20 border-2 border-fuchsia-400'
                  : 'bg-slate-800/40 border border-slate-700 hover:bg-slate-800'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </FitnessCard>

      {/* CTA principal */}
      <button
        onClick={() => navigate('/fitness/treinos')}
        className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 mb-4 active:scale-[0.98] transition"
        style={{
          background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
          boxShadow: '0 8px 32px rgba(34,211,238,0.3)',
        }}
      >
        <Dumbbell className="w-5 h-5" /> Iniciar Treino
      </button>

      {/* Sono */}
      <FitnessCard className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-300" />
            <span className="text-sm font-semibold">Sono</span>
          </div>
          <input
            type="number"
            step="0.5"
            min="0"
            max="14"
            value={profile.sono_horas || ''}
            onChange={e => update({ sono_horas: parseFloat(e.target.value) || null })}
            placeholder="0h"
            className="w-20 h-9 rounded-lg bg-slate-800/60 border border-slate-700 px-3 text-right text-sm focus:outline-none focus:border-indigo-400 text-base"
          />
        </div>
      </FitnessCard>
    </FitnessLayout>
  );
};

export default FitnessDashboard;
