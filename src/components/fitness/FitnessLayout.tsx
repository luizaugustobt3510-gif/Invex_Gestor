import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, TrendingUp, Trophy, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props { children: ReactNode; hideNav?: boolean }

const navItems = [
  { to: '/fitness', icon: Home, label: 'Início' },
  { to: '/fitness/treinos', icon: Dumbbell, label: 'Treinos' },
  { to: '/fitness/evolucao', icon: TrendingUp, label: 'Evolução' },
  { to: '/fitness/conquistas', icon: Trophy, label: 'Conquistas' },
  { to: '/fitness/perfil', icon: User, label: 'Perfil' },
];

export const FitnessLayout = ({ children, hideNav }: Props) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div
      className="fitness-theme min-h-[100dvh] text-white relative overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(232,121,249,0.10), transparent 60%), #06070d',
      }}
    >
      {/* grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 pb-24">
        <div className="max-w-3xl mx-auto px-4 pt-6">{children}</div>
      </div>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-500/20 backdrop-blur-xl"
          style={{ background: 'rgba(10, 12, 20, 0.85)' }}>
          <div className="max-w-3xl mx-auto grid grid-cols-5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/fitness'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-1 py-3 text-[11px] transition-all min-h-[60px]',
                    isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]')} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <button
        onClick={() => { logout(); navigate('/fitness/login'); }}
        className="fixed top-4 right-4 z-40 p-2 rounded-full bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 transition"
        aria-label="Sair"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
