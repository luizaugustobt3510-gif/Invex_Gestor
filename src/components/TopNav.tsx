import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, TrendingUp, LogOut, Download } from 'lucide-react';
import { InvexLogo } from '@/components/InvexLogo';

interface TopNavProps {
  onExportReport?: () => void;
}

export const TopNav = ({ onExportReport }: TopNavProps) => {
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
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <InvexLogo size="sm" />
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
            {onExportReport && location.pathname === '/' && (
              <Button 
                onClick={onExportReport}
                className="gap-2 bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Exportar Relatório</span>
              </Button>
            )}
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