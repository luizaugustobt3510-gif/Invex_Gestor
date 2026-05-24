import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const FitnessLogin = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email.trim(), senha);
    setLoading(false);
    if (r.success) {
      toast.success(r.message);
      navigate('/fitness');
    } else toast.error(r.message);
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-5 text-white relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.18), transparent 60%), radial-gradient(ellipse at bottom, rgba(232,121,249,0.15), transparent 60%), #06070d',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #e879f9)',
              boxShadow: '0 0 32px rgba(34,211,238,0.5)',
            }}
          >
            <Dumbbell className="w-8 h-8 text-slate-900" />
          </div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #67e8f9, #f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            INVEX FITNESS
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">Sua evolução começa aqui</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="email"
              inputMode="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 text-base"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="password"
              placeholder="senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 text-base"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold text-slate-900 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            style={{
              background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
              boxShadow: '0 0 24px rgba(34,211,238,0.4)',
            }}
          >
            {loading ? 'Entrando...' : <>Entrar <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso liberado pelo administrador do Invex Fitness.
        </p>
        <p className="mt-2 text-center text-xs">
          <a href="/login" className="text-cyan-400 hover:text-cyan-300">Login corporativo Invex →</a>
        </p>
      </motion.div>
    </div>
  );
};

export default FitnessLogin;
