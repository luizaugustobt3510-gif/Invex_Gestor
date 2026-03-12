import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  RefreshCw,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Building2,
  Building,
  List,
  Send,
  ClipboardList,
  Inbox,
  UserPlus,
  LogOut,
  ChevronDown,
  QrCode,
  History,
  ScanLine,
  ClipboardCheck,
  Puzzle,
  CreditCard,
  Settings,
  ScrollText,
  Download,
  Shield,
  User,
  AlertTriangle,
  Users,
  Calendar,
  HeartPulse,
  GraduationCap,
  Clock,
  Star,
  BarChart3,
  Thermometer,
} from 'lucide-react';
import { InvexLogo } from '@/components/InvexLogo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
}

interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
  allowedRoles: UserRole[];
}

// Logistics module groups with granular permissions per spec
const logisticsGroups: MenuGroup[] = [
  {
    label: 'Estoque',
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'],
    items: [
      { path: '/cadastrar-material', label: 'Cadastrar Material', icon: <PackagePlus className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/atualizar-estoque', label: 'Atualizar Estoque', icon: <RefreshCw className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/itens-criticos', label: 'Itens Críticos', icon: <AlertTriangle className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
      { path: '/qr-scanner', label: 'Escanear QR Code', icon: <ScanLine className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
      { path: '/gerar-qrcode', label: 'Gerar QR Code', icon: <QrCode className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
      { path: '/historico-movimentacoes', label: 'Histórico', icon: <History className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
      { path: '/importar-planilha', label: 'Importar Planilha', icon: <FileSpreadsheet className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
      { path: '/recontagem', label: 'Recontagem', icon: <ClipboardCheck className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
    ],
  },
  {
    label: 'Ordens',
    icon: <FileText className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    items: [
      { path: '/gerar-oc', label: 'Gerar OC', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/gerenciar-oc', label: 'Gerenciar OC', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
  {
    label: 'Setores',
    icon: <Building2 className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    items: [
      { path: '/criar-setor', label: 'Criar Setor', icon: <Building2 className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/listar-setores', label: 'Setores Cadastrados', icon: <List className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
  {
    label: 'Conciliação',
    icon: <ClipboardList className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    items: [
      { path: '/conciliacao', label: 'Conciliar', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
  {
    label: 'Solicitações',
    icon: <Inbox className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'],
    items: [
      { path: '/solicitar-material', label: 'Solicitar Material', icon: <Send className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'] },
      { path: '/listar-solicitacoes', label: 'Solicitações', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'] },
    ],
  },
  {
    label: 'Conferência',
    icon: <Thermometer className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox'],
    items: [
      { path: '/conferencia-temperatura', label: 'Controle Temperatura', icon: <Thermometer className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'] },
    ],
  },
];

// RH module groups
const rhMenuItems: MenuItem[] = [
  { path: '/rh', label: 'Gestão de Pessoas', icon: <HeartPulse className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/colaboradores', label: 'Colaboradores', icon: <Users className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/ferias', label: 'Férias', icon: <Calendar className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/atestados', label: 'Atestados', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/aso', label: 'ASO', icon: <HeartPulse className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/treinamentos', label: 'Treinamentos', icon: <GraduationCap className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/banco-de-horas', label: 'Banco de Horas', icon: <Clock className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/avaliacoes', label: 'Avaliações', icon: <Star className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/ocorrencias', label: 'Ocorrências', icon: <AlertTriangle className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/desenvolvimento', label: 'Desenvolvimento', icon: <GraduationCap className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/painel-diario', label: 'Painel Diário', icon: <Calendar className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
  { path: '/rh/indicadores', label: 'Indicadores', icon: <BarChart3 className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'] },
];

// Admin groups
const adminGroups: MenuGroup[] = [
  {
    label: 'Administração',
    icon: <UserPlus className="w-4 h-4" />,
    allowedRoles: ['admin'],
    items: [
      { path: '/criar-usuario', label: 'Criar Usuário', icon: <UserPlus className="w-4 h-4" />, allowedRoles: ['admin'] },
      { path: '/instalar-app', label: 'Instalar App', icon: <Download className="w-4 h-4" />, allowedRoles: ['admin'] },
    ],
  },
  {
    label: 'Sistema (SuperAdmin)',
    icon: <Shield className="w-4 h-4" />,
    allowedRoles: ['superadm'],
    items: [
      { path: '/gestao-empresas', label: 'Empresas', icon: <Building className="w-4 h-4" />, allowedRoles: ['superadm'] },
      { path: '/gestao-usuarios', label: 'Usuários', icon: <Users className="w-4 h-4" />, allowedRoles: ['superadm'] },
      { path: '/gestao-modulos', label: 'Módulos', icon: <Puzzle className="w-4 h-4" />, allowedRoles: ['superadm'] },
      { path: '/gestao-planos', label: 'Planos e Limites', icon: <CreditCard className="w-4 h-4" />, allowedRoles: ['superadm'] },
      { path: '/config-sistema', label: 'Configurações', icon: <Settings className="w-4 h-4" />, allowedRoles: ['superadm'] },
      { path: '/logs-auditoria', label: 'Logs / Auditoria', icon: <ScrollText className="w-4 h-4" />, allowedRoles: ['superadm'] },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const isRHOnly = user?.role === 'rh' || user?.role === 'visualizador';
  const isSuperAdmin = user?.role === 'superadm';
  const isSolicitante = user?.role === 'solicitante';

  // Build visible groups based on role isolation
  const visibleGroups: MenuGroup[] = [];

  // Logistics groups: NOT for RH/visualizador/superadm
  if (!isRHOnly && !isSuperAdmin) {
    logisticsGroups.forEach(group => {
      if (hasPermission(group.allowedRoles)) {
        visibleGroups.push(group);
      }
    });
  }

  // Admin groups
  adminGroups.forEach(group => {
    if (hasPermission(group.allowedRoles)) {
      visibleGroups.push(group);
    }
  });

  // RH menu: for RH, visualizador, admin — NOT for superadm
  const showRHMenu = !isSuperAdmin && hasPermission(['admin', 'rh', 'visualizador']);
  const visibleRHItems = showRHMenu ? rhMenuItems.filter(item => hasPermission(item.allowedRoles)) : [];

  // Dashboard link: for logistics users and admin
  const showLogisticsDashboard = !isRHOnly && !isSuperAdmin && hasPermission(['admin', 'logistica', 'usuario almox']);
  // Solicitante sees only solicitações, no dashboard
  const showSolicitanteDashboard = isSolicitante;

  const renderGroup = (group: MenuGroup) => {
    const visibleItems = group.items.filter(item => hasPermission(item.allowedRoles));
    if (visibleItems.length === 0) return null;
    const isGroupActive = visibleItems.some(item => isActive(item.path));

    return (
      <Collapsible key={group.label} defaultOpen={isGroupActive} className="group/collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors px-2 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-2">
                {group.icon}
                <span>{group.label}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "w-full justify-start gap-3 pl-6 text-sm transition-colors",
                        isActive(item.path) 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <InvexLogo size="sm" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Dashboard link */}
        {(showLogisticsDashboard || isSuperAdmin) && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/')}
                  isActive={isActive('/')}
                  tooltip={isSuperAdmin ? "Painel SuperAdmin" : "Dashboard"}
                  className={cn(
                    "w-full justify-start gap-3 font-medium transition-colors",
                    isActive('/') && "bg-primary/10 text-primary"
                  )}
                >
                  {isSuperAdmin ? <Shield className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                  <span>{isSuperAdmin ? 'Painel SuperAdmin' : 'Dashboard'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="my-2" />
          </>
        )}

        {/* Logistics groups */}
        {visibleGroups.filter(g => logisticsGroups.includes(g)).map(renderGroup)}

        {/* RH Menu */}
        {visibleRHItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {isRHOnly ? (
              <SidebarGroup>
                <SidebarGroupLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Gestão de Pessoas</span>
                  </div>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleRHItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.path)}
                          isActive={isActive(item.path)}
                          tooltip={item.label}
                          className={cn(
                            "w-full justify-start gap-3 pl-6 text-sm transition-colors",
                            isActive(item.path) 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <Collapsible defaultOpen={location.pathname.startsWith('/rh')} className="group/collapsible">
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors px-2 py-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Gestão de Pessoas</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {visibleRHItems.map((item) => (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              onClick={() => navigate(item.path)}
                              isActive={isActive(item.path)}
                              tooltip={item.label}
                              className={cn(
                                "w-full justify-start gap-3 pl-6 text-sm transition-colors",
                                isActive(item.path) 
                                  ? "bg-primary/10 text-primary font-medium" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                              )}
                            >
                              {item.icon}
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
          </>
        )}

        {/* Admin groups */}
        {adminGroups.filter(g => hasPermission(g.allowedRoles)).map(renderGroup)}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && !isCollapsed && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-foreground truncate">{user.nome}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/meu-perfil')}
              isActive={isActive('/meu-perfil')}
              tooltip="Meu Perfil"
              className={cn(
                "w-full justify-start gap-3 transition-colors",
                isActive('/meu-perfil') && "bg-primary/10 text-primary"
              )}
            >
              <User className="w-4 h-4" />
              <span>Meu Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
