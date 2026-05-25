import { motion } from 'framer-motion';
import { getAvatar } from '@/pages/fitness/avatars';

interface Props {
  avatarId: string;
  mascoteNome: string;
  mensagem?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarMascote = ({ avatarId, mascoteNome, mensagem, size = 'md' }: Props) => {
  const av = getAvatar(avatarId);
  const dims = size === 'lg' ? 'w-40 h-40' : size === 'md' ? 'w-28 h-28' : 'w-16 h-16';

  return (
    <div className="relative flex flex-col items-center">
      {mensagem && (
        <div
          className="mb-3 max-w-[260px] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm font-medium"
          style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(232,121,249,0.12))',
            border: '1px solid rgba(34,211,238,0.35)',
            color: '#e0f2fe',
          }}
        >
          <span className="block text-[10px] uppercase tracking-widest text-cyan-300/80 mb-0.5">
            {mascoteNome}
          </span>
          {mensagem}
        </div>
      )}

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={`relative ${dims}`}
      >
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{ background: av.cor, filter: 'blur(20px)' }}
        />
        <img
          src={av.src}
          alt={av.nome}
          width={256}
          height={256}
          className="relative w-full h-full object-contain"
        />
      </motion.div>
    </div>
  );
};
