import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: 'cyan' | 'fuchsia' | 'none';
}

// Otimizado: removido backdrop-blur (caro em mobile), simplificado background.
export const FitnessCard = ({ children, glow = 'cyan', className, ...rest }: Props) => {
  const border =
    glow === 'cyan' ? 'border-cyan-500/25' : glow === 'fuchsia' ? 'border-fuchsia-500/25' : 'border-slate-700/40';
  return (
    <div
      {...rest}
      className={cn('rounded-2xl border p-4 bg-slate-900/70', border, className)}
      style={rest.style}
    >
      {children}
    </div>
  );
};
