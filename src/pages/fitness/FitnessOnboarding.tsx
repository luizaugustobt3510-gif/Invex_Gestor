import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FITNESS_AVATARS } from './avatars';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';

const FitnessOnboarding = () => {
  const navigate = useNavigate();
  const { profile, update, loading } = useFitnessProfile();
  const [step, setStep] = useState(0);
  const [avatarId, setAvatarId] = useState('mei');
  const [mascoteNome, setMascoteNome] = useState('Jax');

  if (loading || !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-white" style={{ background: '#06070d' }}>
        Carregando...
      </div>
    );
  }

  const finalizar = async () => {
    await update({ avatar_id: avatarId, mascote_nome: mascoteNome, onboarding_completo: true });
    toast.success(`Bem-vindo, ${profile.nome}!`);
    navigate('/fitness');
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 text-white"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.15), transparent 60%), radial-gradient(ellipse at bottom, rgba(232,121,249,0.12), transparent 60%), #06070d',
      }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {step === 0 && (
          <div className="text-center space-y-6">
            <Sparkles className="w-12 h-12 text-cyan-400 mx-auto" />
            <h1 className="text-3xl font-black">Escolha seu parceiro</h1>
            <p className="text-slate-400 text-sm">Seu mascote vai te acompanhar nessa jornada</p>
            <div className="grid grid-cols-2 gap-3">
              {FITNESS_AVATARS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAvatarId(a.id)}
                  className={`rounded-2xl p-3 border-2 transition ${
                    avatarId === a.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-slate-900/40'
                  }`}
                  style={avatarId === a.id ? { boxShadow: `0 0 24px ${a.cor}66` } : undefined}
                >
                  <img src={a.src} alt={a.nome} width={160} height={160} className="w-full h-32 object-contain" />
                  <p className="mt-2 font-bold">{a.nome}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-xl font-bold text-slate-900 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-black">Dê um nome ao seu parceiro</h1>
            <p className="text-slate-400 text-sm">Ele vai falar com você todos os dias</p>
            <input
              value={mascoteNome}
              onChange={e => setMascoteNome(e.target.value.slice(0, 20))}
              placeholder="Ex: Jax, Nova, Spark..."
              className="w-full h-14 px-5 rounded-xl bg-slate-900/60 border-2 border-cyan-500/40 text-white text-center text-xl font-bold focus:outline-none focus:border-cyan-400 text-base"
            />
            <button
              onClick={finalizar}
              disabled={!mascoteNome.trim()}
              className="w-full h-12 rounded-xl font-bold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)' }}
            >
              Começar minha jornada <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FitnessOnboarding;
