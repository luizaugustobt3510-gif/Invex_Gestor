import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  LogOut, 
  Download,
  FileText,
  Building2,
  ClipboardList,
  UserPlus,
  Menu,
  PackagePlus
} from 'lucide-react';
import { InvexLogo } from '@/components/InvexLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavProps {
  onExportReport?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox', 'solicitante'] },
  { path: '/cadastrar-material', label: 'Cadastrar Material', icon: <PackagePlus className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox'] },
  { path: '/atualizar-estoque', label: 'Atualizar Estoque', icon: <Package className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox'] },
  { path: '/movimentar-estoque', label: 'Movimentar Estoque', icon: <TrendingUp className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox'] },
  { path: '/gerar-oc', label: 'Gerar OC', icon: <FileText className="w-4 h-4" />, allowedRoles: ['superadm', 'admin'] },
  { path: '/criar-setor', label: 'Criar Setor', icon: <Building2 className="w-4 h-4" />, allowedRoles: ['superadm', 'admin'] },
  { path: '/listar-setores', label: 'Setores', icon: <Building2 className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox'] },
  { path: '/solicitar-material', label: 'Solicitar Material', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox', 'solicitante'] },
  { path: '/listar-solicitacoes', label: 'Solicitações', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['superadm', 'admin', 'usuario almox', 'solicitante'] },
  { path: '/criar-usuario', label: 'Criar Usuário', icon: <UserPlus className="w-4 h-4" />, allowedRoles: ['superadm'] },
];

export const TopNav = ({ onExportReport }: TopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const visibleNavItems = navItems.filter(item => hasPermission(item.allowedRoles));

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <InvexLogo size="sm" />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {visibleNavItems.slice(0, 5).map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  onClick={() => navigate(item.path)}
                  className="gap-2"
                  size="sm"
                >
                  {item.icon}
                  <span className="hidden xl:inline">{item.label}</span>
                </Button>
              ))}
              {visibleNavItems.length > 5 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Mais...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {visibleNavItems.slice(5).map((item) => (
                      <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                        <span className="flex items-center gap-2">
                          {item.icon}
                          {item.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {visibleNavItems.map((item) => (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                      <span className="flex items-center gap-2">
                        {item.icon}
                        {item.label}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportReport && location.pathname === '/' && (
              <Button 
                onClick={onExportReport}
                className="gap-2 bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Exportar</span>
              </Button>
            )}
            {user && (
              <div className="hidden md:block text-right">
                <p className="text-xs text-muted-foreground">{user.nome}</p>
                <p className="text-xs font-semibold text-primary">{user.role}</p>
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
