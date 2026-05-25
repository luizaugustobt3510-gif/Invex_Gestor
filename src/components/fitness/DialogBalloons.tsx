import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatar } from '@/pages/fitness/avatars';

interface Props {
  avatarId: string;
  mascoteNome: string;
  mensagens: string[];
  intervaloMs?: number;
}

// 4 posições ao redor do avatar
const POSITIONS = [
  { top: '-10%', left: '-55%', origin: 'bottom right' },
  { top: '-5%', left: '60%', origin: 'bottom left' },
  { top: '55%', left: '-65%', origin: 'top right' },
  { top: '60%', left: '60%', origin: 'top left' },
];

export const DialogBalloons = ({ avatarId, mascoteNome, mensagens, intervaloMs = 20000 }: Props) => {
  const av = getAvatar(avatarId);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [mensagens.length]);

  useEffect(() => {
    if (mensagens.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % mensagens.length), intervaloMs);
    return () => clearInterval(t);
  }, [mensagens.length, intervaloMs]);

  const pos = POSITIONS[idx % POSITIONS.length];
  const msg = mensagens[idx];

  return (
    <div className="relative flex flex-col items-center w-full" style={{ minHeight: 220 }}>
      <div className="relative w-32 h-32">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full h-full"
        >
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{ background: av.cor, filter: 'blur(18px)' }}
          />
          <img src={av.src} alt={av.nome} className="relative w-full h-full object-contain" />
        </motion.div>

        <AnimatePresence mode="wait">
          {msg && (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -6 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute z-20 max-w-[200px] px-3 py-2 rounded-2xl text-xs font-medium shadow-lg"
              style={{
                top: pos.top,
                left: pos.left,
                transformOrigin: pos.origin,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.22), rgba(232,121,249,0.18))',
                border: '1px solid rgba(34,211,238,0.45)',
                color: '#e0f2fe',
                backdropFilter: 'blur(6px)',
              }}
            >
              <span className="block text-[9px] uppercase tracking-widest text-cyan-300/80 mb-0.5">
                {mascoteNome}
              </span>
              {msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mensagens.length > 1 && (
        <div className="flex gap-1.5 mt-3">
          {mensagens.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-5 bg-cyan-400' : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
