import { Package } from 'lucide-react';

interface InvexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export const InvexLogo = ({ className = '', size = 'md', iconOnly = false }: InvexLogoProps) => {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', sub: 'text-xs' },
  };

  const s = sizes[size];

  if (iconOnly) {
    return (
      <div className={`${s.icon} rounded-lg bg-primary/10 flex items-center justify-center ${className}`}>
        <Package className="w-2/3 h-2/3 text-primary" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${s.icon} rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
        <Package className="w-2/3 h-2/3 text-primary" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`${s.text} font-bold tracking-tight text-foreground`}>Invex</span>
        <span className={`${s.sub} font-medium text-muted-foreground tracking-wide uppercase`}>
          Sistema de Gestão Inteligente
        </span>
      </div>
    </div>
  );
};
