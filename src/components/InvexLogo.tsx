import logoFull from '@/assets/invex-logo.png';
import logoIcon from '@/assets/invex-icon.png';

interface InvexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export const InvexLogo = ({ className = '', size = 'md', iconOnly = false }: InvexLogoProps) => {
  const heights = { sm: 'h-8', md: 'h-12', lg: 'h-20' };
  const h = heights[size];

  if (iconOnly) {
    return (
      <img
        src={logoIcon}
        alt="Invex"
        className={`${h} w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src={logoFull}
      alt="Invex Gestor Soluções"
      className={`${h} w-auto object-contain ${className}`}
    />
  );
};
