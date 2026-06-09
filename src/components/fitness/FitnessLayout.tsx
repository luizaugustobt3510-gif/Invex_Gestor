import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, TrendingUp, Apple, User, LogOut, History, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFitnessTheme } from '@/hooks/useFitnessTheme';
import { cn } from '@/lib/utils';

interface Props { children: ReactNode; hideNav?: boolean }

const navItems = [
  { to: '/fitness', icon: Home, label: 'Início' },
  { to: '/fitness/treinos', icon: Dumbbell, label: 'Treinos' },
  { to: '/fitness/historico', icon: History, label: 'Histórico' },
  { to: '/fitness/evolucao', icon: TrendingUp, label: 'Evolução' },
  { to: '/fitness/alimentacao', icon: Apple, label: 'Alimentação' },
  { to: '/fitness/emagrecimento', icon: Flame, label: 'Emagrecer' },
  { to: '/fitness/perfil', icon: User, label: 'Perfil' },
];

export const FitnessLayout = ({ children, hideNav }: Props) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isLight } = useFitnessTheme();

  const bgStyle = isLight
    ? {
        background:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse at bottom, rgba(232,121,249,0.06), transparent 60%), #f8fafc',
      }
    : {
        background:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(232,121,249,0.10), transparent 60%), #06070d',
      };

  const navBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 12, 20, 0.95)';
  const navBorder = isLight ? 'border-cyan-500/15' : 'border-cyan-500/20';
  const inactive = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div
      className={cn('fitness-theme min-h-[100dvh] relative overflow-x-hidden', isLight ? 'fitness-light text-slate-900' : 'text-white')}
      style={bgStyle}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0', isLight ? 'opacity-[0.04]' : 'opacity-[0.06]')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 pb-24">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-5 sm:pt-6">{children}</div>
      </div>

      {!hideNav && (
        <nav
          className={cn('fixed bottom-0 left-0 right-0 z-50 border-t', navBorder)}
          style={{ background: navBg, paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-3xl mx-auto grid grid-cols-6">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/fitness'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 py-2 text-[9px] sm:text-[10px] min-h-[56px]',
                    isActive ? 'text-cyan-500' : inactive
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', isActive && 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]')} />
                    <span className="leading-tight truncate max-w-[56px]">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <button
        onClick={() => { logout(); navigate('/fitness/login'); }}
        className={cn(
          'fixed top-3 right-3 z-40 p-2 rounded-full border transition',
          isLight ? 'bg-white/80 border-slate-200 text-slate-500 hover:text-rose-500' : 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:text-rose-400'
        )}
        aria-label="Sair"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
