import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, TrendingUp, LogOut } from 'lucide-react';

export const TopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img 
                src="https://cdn.openai.com/files/file_000000007e50720e957e1927fdf818ef.png" 
                alt="Invex Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-primary">Invex 5.0</span>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={isActive('/') ? 'default' : 'ghost'}
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant={isActive('/mass-update') ? 'default' : 'ghost'}
                onClick={() => navigate('/mass-update')}
                className="gap-2"
              >
                <Package className="w-4 h-4" />
                Atualizar Estoque
              </Button>
              <Button
                variant={isActive('/stock-movement') ? 'default' : 'ghost'}
                onClick={() => navigate('/stock-movement')}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Movimentar Estoque
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:block">
                <p className="text-sm text-muted-foreground">Bem-vindo,</p>
                <p className="text-sm font-semibold">{user.nome}</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
