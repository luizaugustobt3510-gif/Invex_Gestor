import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: 'cyan' | 'fuchsia' | 'none';
}

export const FitnessCard = ({ children, glow = 'cyan', className, ...rest }: Props) => {
  const border =
    glow === 'cyan' ? 'border-cyan-500/25' : glow === 'fuchsia' ? 'border-fuchsia-500/25' : 'border-slate-700/40';
  const shadow =
    glow === 'cyan' ? '0 0 24px rgba(34,211,238,0.10)' : glow === 'fuchsia' ? '0 0 24px rgba(232,121,249,0.10)' : 'none';
  return (
    <div
      {...rest}
      className={cn('rounded-2xl border backdrop-blur-md p-4', border, className)}
      style={{
        background: 'linear-gradient(160deg, rgba(15,23,42,0.7), rgba(8,11,20,0.85))',
        boxShadow: shadow,
        ...(rest.style || {}),
      }}
    >
      {children}
    </div>
  );
};
