import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import {
  LayoutDashboard, Package, PackagePlus, RefreshCw, TrendingUp, FileText,
  FileSpreadsheet, Building2, Building, List, Send, ClipboardList, Inbox,
  UserPlus, LogOut, ChevronDown, QrCode, History, ScanLine, ClipboardCheck,
  Puzzle, CreditCard, Settings, ScrollText, Download, Shield, User,
  AlertTriangle, Users, Calendar, HeartPulse, GraduationCap, Clock, Star,
  BarChart3, Thermometer, Target, UserMinus, Dumbbell, DollarSign, Wallet,
  BarChart2, Receipt, ShoppingCart, Truck,
} from 'lucide-react';
import { InvexLogo } from '@/components/InvexLogo';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
  submoduleKey?: string; // composite key like "logistica.estoque"
}

interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
  allowedRoles: UserRole[];
  moduleKey?: string;
}

// ─── LOGÍSTICA ───
const logisticsGroups: MenuGroup[] = [
  {
    label: 'Logística',
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox'],
    moduleKey: 'logistica',
    items: [
      { path: '/logistica/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.dashboard' },
    ],
  },
  {
    label: 'Estoque',
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'],
    moduleKey: 'logistica',
    items: [
      { path: '/cadastrar-material', label: 'Cadastrar Material', icon: <PackagePlus className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'], submoduleKey: 'logistica.estoque' },
      { path: '/atualizar-estoque', label: 'Atualizar Estoque', icon: <RefreshCw className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'], submoduleKey: 'logistica.estoque' },
      { path: '/itens-criticos', label: 'Itens Críticos', icon: <AlertTriangle className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
      { path: '/qr-scanner', label: 'Escanear QR Code', icon: <ScanLine className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
      { path: '/gerar-qrcode', label: 'Gerar QR Code', icon: <QrCode className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
      { path: '/historico-movimentacoes', label: 'Histórico', icon: <History className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
      { path: '/importar-planilha', label: 'Importar Planilha', icon: <FileSpreadsheet className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
      { path: '/recontagem', label: 'Recontagem', icon: <ClipboardCheck className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.estoque' },
    ],
  },
  {
    label: 'Ordens de Compra',
    icon: <FileText className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    moduleKey: 'logistica',
    items: [
      { path: '/gerar-oc', label: 'Gerar OC', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'], submoduleKey: 'logistica.ordem_compra' },
      { path: '/gerenciar-oc', label: 'Gerenciar OC', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'], submoduleKey: 'logistica.ordem_compra' },
    ],
  },
  {
    label: 'Conciliação',
    icon: <ClipboardList className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    moduleKey: 'logistica',
    items: [
      { path: '/conciliacao', label: 'Conciliar', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'], submoduleKey: 'logistica.conciliacao_estoque' },
    ],
  },
  {
    label: 'Solicitações',
    icon: <Inbox className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'],
    moduleKey: 'logistica',
    items: [
      { path: '/solicitar-material', label: 'Solicitar Material', icon: <Send className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'], submoduleKey: 'logistica.solicitacoes' },
      { path: '/listar-solicitacoes', label: 'Solicitações', icon: <ClipboardList className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox', 'solicitante'], submoduleKey: 'logistica.solicitacoes' },
    ],
  },
  {
    label: 'Fornecedores',
    icon: <Truck className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    moduleKey: 'logistica',
    items: [
      { path: '/fornecedores', label: 'Gestão de Fornecedores', icon: <Truck className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
  {
    label: 'Curva ABC',
    icon: <TrendingUp className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    moduleKey: 'logistica',
    items: [
      { path: '/curva-abc', label: 'Curva ABC Inteligente', icon: <TrendingUp className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
  {
    label: 'Conferência',
    icon: <Thermometer className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'usuario almox'],
    moduleKey: 'logistica',
    items: [
      { path: '/conferencia-temperatura', label: 'Controle Temperatura', icon: <Thermometer className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'usuario almox'], submoduleKey: 'logistica.conferencia' },
    ],
  },
];

// ─── ACADEMIA ───
const academiaGroups: MenuGroup[] = [
  {
    label: 'Academia',
    icon: <Dumbbell className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica'],
    moduleKey: 'academia',
    items: [
      { path: '/academia', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/academia/alunos', label: 'Alunos', icon: <Users className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/academia/mensalidades', label: 'Mensalidades', icon: <DollarSign className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
    ],
  },
];

// ─── VENDAS ───
const vendasGroups: MenuGroup[] = [
  {
    label: 'Vendas',
    icon: <ShoppingCart className="w-4 h-4" />,
    allowedRoles: ['admin', 'logistica', 'financeiro'],
    moduleKey: 'vendas',
    items: [
      { path: '/vendas', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'financeiro'] },
      { path: '/vendas/pdv', label: 'PDV', icon: <ShoppingCart className="w-4 h-4" />, allowedRoles: ['admin', 'logistica'] },
      { path: '/vendas/historico', label: 'Histórico', icon: <History className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'financeiro'] },
      { path: '/vendas/relatorios', label: 'Relatórios', icon: <BarChart2 className="w-4 h-4" />, allowedRoles: ['admin', 'logistica', 'financeiro'] },
    ],
  },
];

// ─── FINANCEIRO ───
const financeiroGroups: MenuGroup[] = [
  {
    label: 'Financeiro',
    icon: <Wallet className="w-4 h-4" />,
    allowedRoles: ['admin', 'financeiro', 'logistica'],
    moduleKey: 'financeiro',
    items: [
      { path: '/financeiro', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['admin', 'financeiro', 'logistica'], submoduleKey: 'financeiro.dashboard' },
      { path: '/financeiro/lancamentos', label: 'Lançamentos', icon: <Receipt className="w-4 h-4" />, allowedRoles: ['admin', 'financeiro', 'logistica'], submoduleKey: 'financeiro.lancamentos' },
      { path: '/financeiro/fluxo-caixa', label: 'Fluxo de Caixa', icon: <DollarSign className="w-4 h-4" />, allowedRoles: ['admin', 'financeiro', 'logistica'], submoduleKey: 'financeiro.fluxo_caixa' },
      { path: '/financeiro/relatorios', label: 'Relatórios', icon: <BarChart2 className="w-4 h-4" />, allowedRoles: ['admin', 'financeiro'], submoduleKey: 'financeiro.relatorios' },
    ],
  },
];

// ─── GESTÃO DE PESSOAS (RH) ───
const rhModuleKey = 'rh';
const rhMenuItems: MenuItem[] = [
  { path: '/rh', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.dashboard' },
  { path: '/rh/colaboradores', label: 'Colaboradores', icon: <Users className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.dashboard' },
  { path: '/rh/desligamentos', label: 'Desligamentos', icon: <UserMinus className="w-4 h-4" />, allowedRoles: ['admin', 'rh'], submoduleKey: 'rh.desligamentos' },
  { path: '/rh/turnover', label: 'Turnover', icon: <TrendingUp className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.turnover' },
  { path: '/rh/ferias', label: 'Férias', icon: <Calendar className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.ferias' },
  { path: '/rh/atestados', label: 'Atestados', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.atestados' },
  { path: '/rh/aso', label: 'ASO', icon: <HeartPulse className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.aso' },
  { path: '/rh/treinamentos', label: 'Treinamentos', icon: <GraduationCap className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.treinamentos' },
  { path: '/rh/banco-de-horas', label: 'Banco de Horas', icon: <Clock className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.dashboard' },
  { path: '/rh/avaliacoes', label: 'Avaliações', icon: <Star className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.avaliacoes' },
  { path: '/rh/ocorrencias', label: 'Ocorrências', icon: <AlertTriangle className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.ocorrencias' },
  { path: '/rh/desenvolvimento', label: 'Desenvolvimento', icon: <Target className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.treinamentos' },
  { path: '/rh/importar-funcionarios', label: 'Importar Funcionários', icon: <FileText className="w-4 h-4" />, allowedRoles: ['admin', 'rh'], submoduleKey: 'rh.dashboard' },
  { path: '/rh/analises', label: 'Análises e Indicadores', icon: <BarChart3 className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.analises_indicadores' },
  { path: '/rh/painel-diario', label: 'Painel Diário', icon: <Calendar className="w-4 h-4" />, allowedRoles: ['admin', 'rh', 'visualizador'], submoduleKey: 'rh.dashboard' },
];

// ─── ADMIN ───
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
  const { canAccessModule } = useModuleAccess();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isSuperAdmin = user?.role === 'superadm';

  // Filter items by role AND submodule access
  const filterItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!hasPermission(item.allowedRoles)) return false;
      if (item.submoduleKey && !canAccessModule(item.submoduleKey)) return false;
      return true;
    });
  };

  // Filter groups by role AND module access, then filter items within
  const filterGroups = (groups: MenuGroup[]): MenuGroup[] => {
    return groups
      .filter(group => {
        if (!hasPermission(group.allowedRoles)) return false;
        if (group.moduleKey && !canAccessModule(group.moduleKey)) return false;
        return true;
      })
      .map(group => ({
        ...group,
        items: filterItems(group.items),
      }))
      .filter(group => group.items.length > 0);
  };

  const visibleLogistics = !isSuperAdmin ? filterGroups(logisticsGroups) : [];
  const visibleAcademia = !isSuperAdmin ? filterGroups(academiaGroups) : [];
  const visibleVendas = !isSuperAdmin ? filterGroups(vendasGroups) : [];
  const visibleFinanceiro = !isSuperAdmin ? filterGroups(financeiroGroups) : [];
  const visibleAdmin = filterGroups(adminGroups);

  // RH menu: check module access then filter by submodule
  const showRHMenu = !isSuperAdmin && hasPermission(['admin', 'rh', 'visualizador']) && canAccessModule(rhModuleKey);
  const visibleRHItems = showRHMenu ? filterItems(rhMenuItems) : [];

  const showDashboard = !isSuperAdmin && hasPermission(['admin', 'logistica', 'usuario almox', 'solicitante', 'financeiro', 'rh', 'visualizador']);

  const renderGroup = (group: MenuGroup) => {
    if (group.items.length === 0) return null;
    const isGroupActive = group.items.some(item => isActive(item.path));

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
                {group.items.map((item) => (
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
        {(showDashboard || isSuperAdmin) && (
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
        {visibleLogistics.map(renderGroup)}

        {/* RH Menu */}
        {visibleRHItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {(user?.role === 'rh' || user?.role === 'visualizador') ? (
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
              <Collapsible defaultOpen={visibleRHItems.some(i => isActive(i.path))} className="group/collapsible">
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

        {/* Vendas */}
        {visibleVendas.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleVendas.map(renderGroup)}
          </>
        )}

        {/* Financeiro */}
        {visibleFinanceiro.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleFinanceiro.map(renderGroup)}
          </>
        )}

        {/* Academia */}
        {visibleAcademia.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleAcademia.map(renderGroup)}
          </>
        )}

        {/* Admin */}
        {visibleAdmin.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleAdmin.map(renderGroup)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/meu-perfil')}
              tooltip="Meu Perfil"
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-4 h-4" />
              <span className="truncate">{user?.nome || 'Perfil'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
