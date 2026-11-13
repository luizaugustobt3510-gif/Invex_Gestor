import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  Factory,
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
  Stethoscope,
  GraduationCap,
  Clock,
  Star,
  BarChart3,
  Thermometer,
  Target,
  UserMinus,
  Dumbbell,
  DollarSign,
  Wallet,
  BarChart2,
  FileBarChart,
  Receipt,
  ShoppingCart,
  Truck,
  Wrench,
  Heart,
  Gift,
  Calculator,
  PenLine,
  Sparkles,
  CalendarClock,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
} from "lucide-react";
import { InvexLogo } from "@/components/InvexLogo";
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
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useIsNursingAdmin } from "@/hooks/useIsNursingAdmin";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
  submoduleKey?: string; // composite key like "logistica.estoque"
  requireNursingAdmin?: boolean;
}

interface MenuGroup {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
  allowedRoles: UserRole[];
  moduleKey?: string;
  /** Itens aparecem como links diretos, sem grupo recolhível */
  flat?: boolean;
}

const SIDEBAR_SCROLL_KEY = "invex:sidebar-scroll-top";
let persistedSidebarScrollTop = 0;

const getStoredSidebarScrollTop = () => {
  if (typeof window === "undefined") return persistedSidebarScrollTop;
  const stored = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
  return stored ? Number(stored) || 0 : persistedSidebarScrollTop;
};

const SIDEBAR_OPEN_KEY = "invex:sidebar-open-groups";
let persistedOpenGroups: Record<string, boolean> | null = null;

const getOpenGroups = (): Record<string, boolean> => {
  if (persistedOpenGroups) return persistedOpenGroups;
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(SIDEBAR_OPEN_KEY) : null;
    persistedOpenGroups = raw ? JSON.parse(raw) : {};
  } catch {
    persistedOpenGroups = {};
  }
  return persistedOpenGroups!;
};

const setOpenGroup = (key: string, open: boolean) => {
  persistedOpenGroups = { ...getOpenGroups(), [key]: open };
  try {
    window.sessionStorage.setItem(SIDEBAR_OPEN_KEY, JSON.stringify(persistedOpenGroups));
  } catch {
    /* ignore */
  }
};

// ─── LOGÍSTICA ───
const logisticsGroups: MenuGroup[] = [
  {
    label: "Visão geral",
    icon: <LayoutDashboard className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "usuario almox"],
    moduleKey: "logistica",
    flat: true,
    items: [
      {
        path: "/logistica/dashboard",
        label: "Visão geral",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.dashboard",
      },
    ],
  },
  {
    label: "Estoque",
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "usuario almox", "solicitante"],
    moduleKey: "logistica",
    items: [
      {
        path: "/cadastrar-material",
        label: "Cadastrar Material",
        icon: <PackagePlus className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/atualizar-estoque",
        label: "Atualizar Estoque",
        icon: <RefreshCw className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/itens-criticos",
        label: "Itens Críticos",
        icon: <AlertTriangle className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/controle-validades",
        label: "Controle de Validades",
        icon: <CalendarClock className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/reposicao",
        label: "Reposição",
        icon: <RefreshCw className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/qr-scanner",
        label: "Escanear QR Code",
        icon: <ScanLine className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/gerar-qrcode",
        label: "Gerar QR Code",
        icon: <QrCode className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/historico-movimentacoes",
        label: "Histórico",
        icon: <History className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/importar-planilha",
        label: "Importar Planilha",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
      {
        path: "/recontagem",
        label: "Recontagem",
        icon: <ClipboardCheck className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.estoque",
      },
    ],
  },
  {
    label: "Ordens de Compra",
    icon: <FileText className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "logistica",
    items: [
      {
        path: "/gerar-oc",
        label: "Gerar OC",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.ordem_compra",
      },
      {
        path: "/gerenciar-oc",
        label: "Gerenciar OC",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.ordem_compra",
      },
    ],
  },
  {
    label: "Conciliação",
    icon: <ClipboardList className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "logistica",
    items: [
      {
        path: "/conciliacao",
        label: "Conciliar",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.conciliacao_estoque",
      },
    ],
  },
  {
    label: "Solicitar Materiais",
    icon: <Send className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "usuario almox", "solicitante", "enfermagem", "enfermeiro", "recepcionista", "clinica"],
    moduleKey: "solicitacao_materiais",
    items: [
      {
        path: "/solicitar-material",
        label: "Solicitar Material",
        icon: <Send className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox", "solicitante", "enfermagem", "enfermeiro", "recepcionista", "clinica"],
      },
    ],
  },
  {
    label: "Solicitações",
    icon: <Inbox className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "usuario almox"],
    moduleKey: "logistica",
    items: [
      {
        path: "/listar-solicitacoes",
        label: "Gerenciar Solicitações",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.solicitacoes",
      },
    ],
  },
  {
    label: "Fornecedores",
    icon: <Truck className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "logistica",
    items: [
      {
        path: "/fornecedores",
        label: "Gestão de Fornecedores",
        icon: <Truck className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.fornecedores",
      },
    ],
  },
  {
    label: "Curva ABC",
    icon: <TrendingUp className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "logistica",
    items: [
      {
        path: "/curva-abc",
        label: "Curva ABC Inteligente",
        icon: <TrendingUp className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.curva_abc",
      },
      {
        path: "/estoque-inteligente",
        label: "Mín/Máx Inteligente",
        icon: <Target className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
        submoduleKey: "logistica.curva_abc",
      },
      {
        path: "/logistica/indicadores",
        label: "Indicadores",
        icon: <BarChart3 className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox"],
        submoduleKey: "logistica.indicadores",
      },
      {
        path: "/estoque-setores",
        label: "Estoque por Setor",
        icon: <Building2 className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "usuario almox", "enfermagem", "enfermeiro", "clinica"],
        submoduleKey: "logistica.estoque_setores",
      },
    ],
  },

  {
    label: "Setores",
    icon: <Building2 className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "setores",
    items: [
      {
        path: "/criar-setor",
        label: "Cadastrar Setor",
        icon: <PackagePlus className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
      },
      {
        path: "/listar-setores",
        label: "Listar Setores",
        icon: <List className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
      },
    ],
  },
];


// ─── INVEX FITNESS (app pessoal — link rápido, só p/ empresa Invex Fitness) ───
const academiaGroups: MenuGroup[] = [
  {
    label: "Invex Fitness",
    icon: <Dumbbell className="w-4 h-4" />,
    allowedRoles: ["admin", "usuario almox", "solicitante", "logistica", "rh", "financeiro", "visualizador", "manutencao"],
    items: [
      {
        path: "/fitness",
        label: "Abrir App Fitness",
        icon: <Dumbbell className="w-4 h-4" />,
        allowedRoles: ["admin", "usuario almox", "solicitante", "logistica", "rh", "financeiro", "visualizador", "manutencao"],
      },
    ],
  },
];

// ─── CLÍNICA (Prontuário + Agenda) ───
const clinicaGroups: MenuGroup[] = [
  {
    label: "Clínica",
    icon: <Stethoscope className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "rh", "visualizador", "enfermagem", "enfermeiro", "recepcionista"],
    items: [
      {
        path: "/clinica/pacientes",
        label: "Pacientes",
        icon: <Stethoscope className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "rh", "visualizador", "enfermagem", "enfermeiro", "recepcionista"],
        submoduleKey: "prontuario",
      },
      {
        path: "/clinica/agenda",
        label: "Agenda",
        icon: <Calendar className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "rh", "visualizador", "enfermagem", "enfermeiro", "recepcionista"],
        submoduleKey: "agenda",
      },
    ],
  },
  {
    label: "Anamnese Digital",
    icon: <ClipboardList className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro"],
    moduleKey: "anamnese",
    items: [
      {
        path: "/clinica/enfermagem/dashboard",
        label: "Dashboard Enfermagem",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro"],
        requireNursingAdmin: true,
      },
      {
        path: "/clinica/anamnese/nova",
        label: "Nova Anamnese",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro"],
      },
      {
        path: "/clinica/anamnese/modelos",
        label: "Modelos",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro"],
      },
      {
        path: "/clinica/anamnese/rapidas",
        label: "Respostas Rápidas",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro"],
      },
      {
        path: "/clinica/anamnese/regioes",
        label: "Regiões Anatômicas",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin"],
      },
    ],
  },
  {
    label: "Evolução Clínica",
    icon: <Stethoscope className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista"],
    moduleKey: "evolucao",
    items: [
      {
        path: "/clinica/evolucao",
        label: "Registrar Evolução",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista"],
      },
      {
        path: "/clinica/evolucao/mensagens",
        label: "Mensagens Rápidas",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica"],
      },
    ],
  },
  {
    label: "Receituário",
    icon: <FileText className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista"],
    moduleKey: "receituario",
    items: [
      {
        path: "/clinica/receituario",
        label: "Nova Receita",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista"],
      },
      {
        path: "/clinica/receituario/rapidas",
        label: "Prescrições Rápidas",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermeiro"],
      },
    ],
  },
  {
    label: "Modelos de Prescrição",
    icon: <Sparkles className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "enfermeiro"],
    moduleKey: "receituario",
    items: [
      {
        path: "/clinica/receituario/rapidas",
        label: "Modelos de Prescrição",
        icon: <Sparkles className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermeiro"],
      },
    ],
  },
  {
    label: "Dispensação",
    icon: <ClipboardCheck className="w-4 h-4" />,
    allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista", "logistica", "usuario almox"],
    moduleKey: "dispensacao",
    items: [
      {
        path: "/dispensacao",
        label: "Dispensar Material",
        icon: <ClipboardCheck className="w-4 h-4" />,
        allowedRoles: ["admin", "clinica", "enfermagem", "enfermeiro", "recepcionista", "logistica", "usuario almox"],
      },
    ],
  },
  {
    label: "Faturamento",
    icon: <ClipboardCheck className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro", "clinica"],
    moduleKey: "faturamento",
    items: [
      {
        path: "/faturamento",
        label: "Faturamento",
        icon: <ClipboardCheck className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "clinica"],
      },
    ],
  },
];


// ─── VENDAS (inclui Produção) ───
const vendasGroups: MenuGroup[] = [
  {
    label: "Visão geral",
    icon: <LayoutDashboard className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "financeiro"],
    moduleKey: "vendas",
    flat: true,
    items: [
      {
        path: "/vendas",
        label: "Visão geral",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "financeiro"],
      },
    ],
  },
  {
    label: "Ponto de Venda",
    icon: <ShoppingCart className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "financeiro"],
    moduleKey: "vendas",
    items: [
      {
        path: "/vendas/pdv",
        label: "PDV",
        icon: <ShoppingCart className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
      },
      {
        path: "/vendas/historico",
        label: "Histórico de Vendas",
        icon: <History className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "financeiro"],
      },
    ],
  },
  {
    label: "Produção",
    icon: <Factory className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica"],
    moduleKey: "producao",
    items: [
      {
        path: "/producao",
        label: "Entrada e Produção",
        icon: <Factory className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica"],
      },
    ],
  },
  {
    label: "Relatórios",
    icon: <BarChart2 className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "financeiro"],
    moduleKey: "vendas",
    items: [
      {
        path: "/vendas/relatorios",
        label: "Relatórios de Vendas",
        icon: <BarChart2 className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "financeiro"],
      },
    ],
  },
];

// ─── FINANCEIRO ───
const financeiroGroups: MenuGroup[] = [
  {
    label: "Visão geral",
    icon: <LayoutDashboard className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro", "logistica"],
    moduleKey: "financeiro",
    flat: true,
    items: [
      {
        path: "/financeiro",
        label: "Visão geral",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.dashboard",
      },
    ],
  },
  {
    label: "Lançamentos",
    icon: <Receipt className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro", "logistica"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/lancamentos",
        label: "Lançamentos",
        icon: <Receipt className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.lancamentos",
      },
      {
        path: "/financeiro/importar",
        label: "Importar Lançamentos",
        icon: <FileSpreadsheet className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.lancamentos",
      },
    ],
  },
  {
    label: "Contas",
    icon: <CalendarClock className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro", "logistica"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/contas-pagar",
        label: "Contas a Pagar",
        icon: <ArrowDownCircle className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.contas_pagar",
      },
      {
        path: "/financeiro/contas-receber",
        label: "Contas a Receber",
        icon: <ArrowUpCircle className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.contas_receber",
      },
      {
        path: "/financeiro/vencimentos",
        label: "Vencimentos",
        icon: <CalendarClock className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.vencimentos",
      },
    ],
  },
  {
    label: "Caixa e Bancos",
    icon: <DollarSign className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro", "logistica"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/fluxo-caixa",
        label: "Fluxo de Caixa",
        icon: <DollarSign className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro", "logistica"],
        submoduleKey: "financeiro.fluxo_caixa",
      },
      {
        path: "/financeiro/conciliacao",
        label: "Conciliação Bancária",
        icon: <Landmark className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.conciliacao",
      },
    ],
  },
  {
    label: "Planejamento",
    icon: <Target className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/orcamentos",
        label: "Orçamentos",
        icon: <Target className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.orcamentos",
      },
      {
        path: "/financeiro/centros-custo",
        label: "Centros de Custo",
        icon: <Building2 className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.centros_custo",
      },
    ],
  },
  {
    label: "Relatórios",
    icon: <FileBarChart className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/relatorios",
        label: "Relatórios",
        icon: <BarChart2 className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.relatorios",
      },
      {
        path: "/financeiro/dre",
        label: "DRE",
        icon: <FileBarChart className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.dre",
      },
    ],
  },
  {
    label: "Pessoal",
    icon: <Wallet className="w-4 h-4" />,
    allowedRoles: ["admin", "financeiro"],
    moduleKey: "financeiro",
    items: [
      {
        path: "/financeiro/pessoal",
        label: "Invex Finanças (pessoal)",
        icon: <Wallet className="w-4 h-4" />,
        allowedRoles: ["admin", "financeiro"],
        submoduleKey: "financeiro.dashboard",
      },
    ],
  },
];

// ─── GESTÃO DE PESSOAS (RH) ───
const rhModuleKey = "rh";
const rhGroups: MenuGroup[] = [
  {
    label: "Visão Geral",
    icon: <LayoutDashboard className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.dashboard",
      },
      {
        path: "/rh/painel-diario",
        label: "Painel Diário",
        icon: <Calendar className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.dashboard",
      },
    ],
  },
  {
    label: "Colaboradores",
    icon: <Users className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/colaboradores",
        label: "Colaboradores",
        icon: <Users className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.dashboard",
      },
      {
        path: "/rh/importar-funcionarios",
        label: "Importar Funcionários",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
        submoduleKey: "rh.dashboard",
      },
    ],
  },
  {
    label: "Movimentação",
    icon: <UserMinus className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/desligamentos",
        label: "Desligamentos",
        icon: <UserMinus className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
        submoduleKey: "rh.desligamentos",
      },
      {
        path: "/rh/turnover",
        label: "Turnover",
        icon: <TrendingUp className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.turnover",
      },
      {
        path: "/rh/ocorrencias",
        label: "Ocorrências",
        icon: <AlertTriangle className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.ocorrencias",
      },
    ],
  },
  {
    label: "Saúde & Segurança",
    icon: <HeartPulse className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/atestados",
        label: "Atestados",
        icon: <FileText className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.atestados",
      },
      {
        path: "/rh/aso",
        label: "ASO",
        icon: <HeartPulse className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.aso",
      },
    ],
  },
  {
    label: "Tempo & Jornada",
    icon: <Clock className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/ferias",
        label: "Férias",
        icon: <Calendar className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.ferias",
      },
      {
        path: "/rh/banco-de-horas",
        label: "Banco de Horas",
        icon: <Clock className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.dashboard",
      },
    ],
  },
  {
    label: "Desenvolvimento",
    icon: <GraduationCap className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/treinamentos",
        label: "Treinamentos",
        icon: <GraduationCap className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.treinamentos",
      },
      {
        path: "/rh/avaliacoes",
        label: "Avaliações",
        icon: <Star className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.avaliacoes",
      },
    ],
  },
  {
    label: "Benefícios",
    icon: <Gift className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "financeiro", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/beneficios",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro", "visualizador"],
        submoduleKey: "rh.beneficios",
      },
      {
        path: "/beneficios/cadastro",
        label: "Catálogo",
        icon: <Heart className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
        submoduleKey: "rh.beneficios",
      },
      {
        path: "/beneficios/vinculo",
        label: "Vínculos",
        icon: <Users className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
        submoduleKey: "rh.beneficios",
      },
      {
        path: "/beneficios/controle-mensal",
        label: "Controle Mensal",
        icon: <Calendar className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
        submoduleKey: "rh.beneficios",
      },
    ],
  },
  {
    label: "Análises",
    icon: <BarChart3 className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "visualizador"],
    moduleKey: "rh",
    items: [
      {
        path: "/rh/analises",
        label: "Análises e Indicadores",
        icon: <BarChart3 className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "visualizador"],
        submoduleKey: "rh.analises_indicadores",
      },
    ],
  },
];

// ─── MANUTENÇÃO ───
const manutencaoGroups: MenuGroup[] = [
  {
    label: "Manutenção",
    icon: <Wrench className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "manutencao"],
    moduleKey: "manutencao",
    items: [
      {
        path: "/manutencao",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "manutencao"],
        submoduleKey: "manutencao.dashboard",
      },
      {
        path: "/manutencao/cadastro",
        label: "Cadastrar Manutenção",
        icon: <PackagePlus className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "manutencao"],
        submoduleKey: "manutencao.cadastro",
      },
      {
        path: "/manutencao/listagem",
        label: "Listagem",
        icon: <List className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "manutencao", "solicitante", "visualizador"],
        submoduleKey: "manutencao.listagem",
      },
      {
        path: "/manutencao/solicitacao-os",
        label: "Solicitação de OS",
        icon: <ClipboardList className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "manutencao", "solicitante"],
        submoduleKey: "manutencao.os",
      },
    ],
  },
  {
    label: "Conferência de Temperatura",
    icon: <Thermometer className="w-4 h-4" />,
    allowedRoles: ["admin", "logistica", "manutencao", "usuario almox"],
    moduleKey: "conferencia_temperatura",
    items: [
      {
        path: "/conferencia-temperatura",
        label: "Controle Temperatura",
        icon: <Thermometer className="w-4 h-4" />,
        allowedRoles: ["admin", "logistica", "manutencao", "usuario almox"],
      },
    ],
  },
];


// ─── BENEFÍCIOS ───
const beneficiosGroups: MenuGroup[] = [
  {
    label: "Benefícios",
    icon: <Gift className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "financeiro", "visualizador"],
    items: [
      {
        path: "/beneficios",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro", "visualizador"],
      },
      {
        path: "/beneficios/cadastro",
        label: "Catálogo",
        icon: <Heart className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
      },
      {
        path: "/beneficios/vinculo",
        label: "Vínculos",
        icon: <Users className="w-4 h-4" />,
        allowedRoles: ["admin", "rh"],
      },
      {
        path: "/beneficios/controle-mensal",
        label: "Controle Mensal",
        icon: <Calendar className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
      },
    ],
  },
];

// ─── FOLHA DE PAGAMENTO ───
const folhaGroups: MenuGroup[] = [
  {
    label: "Folha de Pagamento",
    icon: <Receipt className="w-4 h-4" />,
    allowedRoles: ["admin", "rh", "financeiro"],
    items: [
      {
        path: "/folha",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
      },
      {
        path: "/folha/simulacao",
        label: "Nova Simulação",
        icon: <Calculator className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
      },
      {
        path: "/folha/configuracao",
        label: "Configuração",
        icon: <Settings className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
      },
      {
        path: "/folha/historico",
        label: "Histórico",
        icon: <History className="w-4 h-4" />,
        allowedRoles: ["admin", "rh", "financeiro"],
      },
    ],
  },
];

const adminGroups: MenuGroup[] = [
  {
    label: "Administração",
    icon: <UserPlus className="w-4 h-4" />,
    allowedRoles: ["admin"],
    items: [
      {
        path: "/criar-usuario",
        label: "Criar Usuário",
        icon: <UserPlus className="w-4 h-4" />,
        allowedRoles: ["admin"],
      },
      { path: "/instalar-app", label: "Instalar App", icon: <Download className="w-4 h-4" />, allowedRoles: ["admin"] },
    ],
  },
  {
    label: "Sistema (SuperAdmin)",
    icon: <Shield className="w-4 h-4" />,
    allowedRoles: ["superadm"],
    items: [
      {
        path: "/gestao-empresas",
        label: "Empresas",
        icon: <Building className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      { path: "/gestao-usuarios", label: "Usuários", icon: <Users className="w-4 h-4" />, allowedRoles: ["superadm"] },
      { path: "/criar-usuario", label: "Convidar / Criar Usuário", icon: <UserPlus className="w-4 h-4" />, allowedRoles: ["superadm"] },
      { path: "/gestao-modulos", label: "Módulos", icon: <Puzzle className="w-4 h-4" />, allowedRoles: ["superadm"] },
      { path: "/configuracoes/perfis", label: "Perfis × Módulos", icon: <Shield className="w-4 h-4" />, allowedRoles: ["superadm"] },
      { path: "/gestao-usuarios-modulos", label: "Usuários × Módulos", icon: <Users className="w-4 h-4" />, allowedRoles: ["superadm"] },
      {
        path: "/gestao-planos",
        label: "Planos e Limites",
        icon: <CreditCard className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/config-sistema",
        label: "Configurações",
        icon: <Settings className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/logs-auditoria",
        label: "Logs / Auditoria",
        icon: <ScrollText className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/gestao-changelog",
        label: "Novidades / Changelog",
        icon: <ScrollText className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/gestao-suporte",
        label: "Central de Suporte",
        icon: <ScrollText className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/gestao-contas-apps",
        label: "Contas dos apps",
        icon: <Users className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
      {
        path: "/gestao-downloads",
        label: "Downloads do site",
        icon: <ScrollText className="w-4 h-4" />,
        allowedRoles: ["superadm"],
      },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission, isLoading } = useAuth();
  const { canAccessModule, loading: moduleLoading } = useModuleAccess();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPos = useRef<number>(getStoredSidebarScrollTop());

  const saveSidebarScroll = () => {
    const nextScrollTop = scrollRef.current?.scrollTop ?? scrollPos.current;
    scrollPos.current = nextScrollTop;
    persistedSidebarScrollTop = nextScrollTop;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nextScrollTop));
    }
  };

  const restoreSidebarScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollPos.current;
  };

  const sidebarReady = !isLoading && !moduleLoading;

  // Preserva a posição de scroll do sidebar entre navegações.
  // Só depois que o menu real aparece (o esqueleto de carregamento não tem rolagem).
  useLayoutEffect(() => {
    if (!sidebarReady) return;
    const el = scrollRef.current;
    if (!el) return;
    scrollPos.current = getStoredSidebarScrollTop();
    el.scrollTop = scrollPos.current;
    const raf = requestAnimationFrame(restoreSidebarScroll);
    const onScroll = saveSidebarScroll;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [sidebarReady, location.pathname]);

  // Grupos recolhíveis: SuperAdmin sempre aberto; demais lembram o que o usuário abriu
  // e abrem automaticamente o grupo da página atual.
  const [, forceOpenRender] = useState(0);
  const isGroupOpen = (group: MenuGroup, scope: string) => {
    if (user?.role === "superadm") return true;
    if (group.items.some((item) => location.pathname === item.path)) return true;
    return getOpenGroups()[`${scope}:${group.label}`] ?? false;
  };
  const toggleGroup = (group: MenuGroup, scope: string, open: boolean) => {
    setOpenGroup(`${scope}:${group.label}`, open);
    forceOpenRender((n) => n + 1);
  };

  const navigatePreservingScroll = (path: string) => {
    saveSidebarScroll();
    navigate(path);
  };
  const { isNursingAdmin } = useIsNursingAdmin();


  const isActive = (path: string) => location.pathname === path;
  const isSuperAdmin = user?.role === "superadm";

  // Filter items by role AND submodule access
  const filterItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter((item) => {
      if (!hasPermission(item.allowedRoles)) return false;
      if (item.requireNursingAdmin && !isNursingAdmin) return false;
      if (item.submoduleKey && !canAccessModule(item.submoduleKey)) return false;
      return true;
    });
  };

  // Filter groups by role AND module access, then filter items within
  const filterGroups = (groups: MenuGroup[]): MenuGroup[] => {
    return groups
      .filter((group) => {
        if (!hasPermission(group.allowedRoles)) return false;
        if (group.moduleKey && !canAccessModule(group.moduleKey)) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: filterItems(group.items),
      }))
      .filter((group) => group.items.length > 0);
  };

  const visibleLogistics = !isSuperAdmin ? filterGroups(logisticsGroups) : [];
  const isFitnessCompany = user?.companyId === "f54ebd25-21cc-43e8-888f-ffbbed1d4b7f";
  const visibleAcademia = !isSuperAdmin && isFitnessCompany ? filterGroups(academiaGroups) : [];
  const visibleClinica = !isSuperAdmin ? filterGroups(clinicaGroups) : [];
  const visibleVendas = !isSuperAdmin ? filterGroups(vendasGroups) : [];
  const visibleFinanceiro = !isSuperAdmin ? filterGroups(financeiroGroups) : [];
  const visibleManutencao = !isSuperAdmin ? filterGroups(manutencaoGroups) : [];
  const visibleBeneficios: MenuGroup[] = [];
  const canSeeFolha = user?.email?.toLowerCase() === "teste@invex.com";
  const visibleFolha = !isSuperAdmin && canSeeFolha ? filterGroups(folhaGroups) : [];
  const visibleAdmin = filterGroups(adminGroups);

  // RH menu: filter groups using same logic as other modules
  const showRHMenu = !isSuperAdmin && hasPermission(["admin", "rh", "visualizador"]) && canAccessModule(rhModuleKey);
  const visibleRHGroups = showRHMenu ? filterGroups(rhGroups) : [];

  const showDashboard =
    !isSuperAdmin &&
    hasPermission(["admin", "logistica", "usuario almox", "solicitante", "financeiro", "rh", "visualizador"]);

  const renderGroup = (group: MenuGroup) => {
    if (group.items.length === 0) return null;

    return (
      <Collapsible
        key={group.label}
        open={isGroupOpen(group, "main")}
        onOpenChange={(open) => toggleGroup(group, "main", open)}
        className="group/collapsible"
      >
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
                      onClick={() => navigatePreservingScroll(item.path)}
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "w-full justify-start gap-3 pl-6 text-sm transition-colors",
                        isActive(item.path)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
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

  // Seção com título (ex.: LOGÍSTICA) e subgrupos em negrito, recolhíveis.
  const renderSection = (title: string, icon: React.ReactNode, groups: MenuGroup[], scope: string) => (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {groups.map((group) => {
          if (group.flat) {
            return (
              <SidebarMenu key={group.label}>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigatePreservingScroll(item.path)}
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "w-full justify-start gap-2 px-2 py-2 text-sm font-semibold transition-colors",
                        isActive(item.path)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-sidebar-accent",
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            );
          }
          return (
            <Collapsible
              key={group.label}
              open={isGroupOpen(group, scope)}
              onOpenChange={(open) => toggleGroup(group, scope, open)}
              className="group/collapsible"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {group.icon}
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigatePreservingScroll(item.path)}
                        isActive={isActive(item.path)}
                        tooltip={item.label}
                        className={cn(
                          "w-full justify-start gap-3 pl-8 py-2 text-sm transition-colors",
                          isActive(item.path)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarGroupContent>
    </SidebarGroup>
  );

  // Flash-fix: skeleton até auth+módulos carregarem
  if (isLoading || moduleLoading) {
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <InvexLogo size="sm" />
        </SidebarHeader>
        <SidebarContent className="px-2 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigatePreservingScroll("/")}>
          <InvexLogo size="sm" />
        </div>
      </SidebarHeader>

      <SidebarContent ref={scrollRef} className="px-2">
        {/* Dashboard link */}
        {(showDashboard || isSuperAdmin) && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigatePreservingScroll("/")}
                  isActive={isActive("/")}
                  tooltip={isSuperAdmin ? "Painel SuperAdmin" : "Dashboard"}
                  className={cn(
                    "w-full justify-start gap-3 font-medium transition-colors",
                    isActive("/") && "bg-primary/10 text-primary",
                  )}
                >
                  {isSuperAdmin ? <Shield className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                  <span>{isSuperAdmin ? "Painel SuperAdmin" : "Dashboard"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="my-2" />
          </>
        )}

        {/* Logística - parent group with collapsible subgroups */}
        {visibleLogistics.length > 0 && renderSection("Logística", <Package className="w-4 h-4" />, visibleLogistics, "logistica")}

        {/* Gestão de Pessoas (RH) - parent group with collapsible subgroups */}
        {visibleRHGroups.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {renderSection("Gestão de Pessoas", <Users className="w-4 h-4" />, visibleRHGroups, "rh")}
          </>
        )}

        {/* Vendas - parent group with collapsible subgroups */}
        {visibleVendas.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {renderSection("Vendas", <ShoppingCart className="w-4 h-4" />, visibleVendas, "vendas")}
          </>
        )}

        {/* Financeiro - parent group with collapsible subgroups */}
        {visibleFinanceiro.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {renderSection("Financeiro", <Wallet className="w-4 h-4" />, visibleFinanceiro, "financeiro")}
          </>
        )}

        {/* Academia */}
        {visibleAcademia.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleAcademia.map(renderGroup)}
          </>
        )}

        {/* Clínica (Prontuário + Agenda) */}
        {visibleClinica.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleClinica.map(renderGroup)}
          </>
        )}



        {/* Manutenção */}
        {visibleManutencao.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleManutencao.map(renderGroup)}
          </>
        )}

        {visibleBeneficios.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleBeneficios.map(renderGroup)}
          </>
        )}

        {visibleFolha.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            {visibleFolha.map(renderGroup)}
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
              onClick={() => navigatePreservingScroll("/meu-perfil")}
              tooltip="Meu Perfil"
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-4 h-4" />
              <span className="truncate">{user?.nome || "Perfil"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigatePreservingScroll("/assinaturas")}
                tooltip="Minhas Assinaturas"
                className="text-muted-foreground hover:text-foreground"
              >
                <PenLine className="w-4 h-4" />
                <span>Assinaturas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
