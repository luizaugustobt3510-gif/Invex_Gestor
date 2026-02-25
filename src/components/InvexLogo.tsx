import invexLogo from '@/assets/invex-logo.png';
import invexIcon from '@/assets/invex-icon.png';

interface InvexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export const InvexLogo = ({ className = '', size = 'md', iconOnly = false }: InvexLogoProps) => {
  const sizes = {
    sm: { logo: 'h-10', icon: 'h-10 w-10' },
    md: { logo: 'h-14', icon: 'h-14 w-14' },
    lg: { logo: 'h-20', icon: 'h-20 w-20' },
  };

  const { logo, icon } = sizes[size];

  if (iconOnly) {
    return <img src={invexIcon} alt="Invex" className={`${icon} object-contain ${className}`} />;
  }

  return <img src={invexLogo} alt="Invex" className={`${logo} object-contain ${className}`} />;
};
