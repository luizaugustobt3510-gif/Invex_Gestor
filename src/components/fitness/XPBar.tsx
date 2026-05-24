import { motion } from 'framer-motion';
import { calcLevel } from '@/hooks/useFitnessProfile';

export const XPBar = ({ xp }: { xp: number }) => {
  const { nivel, xpAtual, xpProximo, progresso } = calcLevel(xp);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-900">
            NÍVEL {nivel}
          </div>
        </div>
        <span className="text-xs font-mono text-cyan-200/80">
          {xpAtual}/{xpProximo} XP
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800/60 overflow-hidden border border-cyan-500/20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #22d3ee, #e879f9)',
            boxShadow: '0 0 12px rgba(34,211,238,0.6)',
          }}
        />
      </div>
    </div>
  );
};
