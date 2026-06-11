import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatar } from '@/pages/fitness/avatars';

export type RexAnim = 'idle' | 'exercise' | 'celebrate' | 'dance';

interface Props {
  avatarId: string;
  mascoteNome: string;
  mensagens: string[];
  intervaloMs?: number;
  rexAnim?: RexAnim;
}

const POSITIONS = [
  { className: 'top-0 left-2 sm:left-6', origin: 'bottom right', tail: 'br' },
  { className: 'top-0 right-2 sm:right-6', origin: 'bottom left', tail: 'bl' },
  { className: 'bottom-0 left-2 sm:left-6', origin: 'top right', tail: 'tr' },
  { className: 'bottom-0 right-2 sm:right-6', origin: 'top left', tail: 'tl' },
] as const;

export const DialogBalloons = ({ avatarId, mascoteNome, mensagens, intervaloMs = 20000, rexAnim = 'idle' }: Props) => {
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

  const isRex = avatarId === 'rex';
  const animClass = isRex && rexAnim !== 'idle' ? `rex-anim-${rexAnim}` : '';

  return (
    <div className="relative flex flex-col items-center w-full">
      <div className="relative w-full max-w-md h-[210px] sm:h-[230px] mx-auto">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 z-10">
          <motion.div
            animate={animClass ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full h-full"
          >
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{ background: av.cor, filter: 'blur(18px)' }}
            />
            <img
              src={av.src}
              alt={av.nome}
              className={`relative w-full h-full object-contain ${animClass}`}
            />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {msg && (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`dialog-balloon absolute z-20 w-[160px] sm:w-[200px] px-3 py-2 rounded-2xl text-xs font-medium shadow-lg ${pos.className}`}
              style={{
                transformOrigin: pos.origin,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.22), rgba(232,121,249,0.18))',
                border: '1px solid rgba(34,211,238,0.45)',
                color: '#e0f2fe',
              }}
            >
              <span className="dialog-balloon-tag block text-[9px] uppercase tracking-widest text-cyan-300/80 mb-0.5">
                {mascoteNome}
              </span>
              <span className="leading-snug">{msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mensagens.length > 1 && (
        <div className="flex gap-1.5 mt-2">
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
