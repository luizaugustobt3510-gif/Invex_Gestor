import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CadastrarMaterial from "./pages/CadastrarMaterial";
import GerarOC from "./pages/GerarOC";
import AtualizarEstoque from "./pages/AtualizarEstoque";

import CriarSetor from "./pages/CriarSetor";
import ListarSetores from "./pages/ListarSetores";
import SolicitarMaterial from "./pages/SolicitarMaterial";
import ListarSolicitacoes from "./pages/ListarSolicitacoes";
import CriarUsuario from "./pages/CriarUsuario";
import GerenciarOC from "./pages/GerenciarOC";
import ListarEmpresas from "./pages/ListarEmpresas";
import ImportarPlanilha from "./pages/ImportarPlanilha";
import QRScanner from "./pages/QRScanner";
import GerarQRCode from "./pages/GerarQRCode";
import HistoricoMovimentacoes from "./pages/HistoricoMovimentacoes";
import Conciliacao from "./pages/Conciliacao";
import Recontagem from "./pages/Recontagem";
import InstalarApp from "./pages/InstalarApp";
import GestaoEmpresas from "./pages/GestaoEmpresas";
import GestaoModulos from "./pages/GestaoModulos";
import GestaoPlanos from "./pages/GestaoPlanos";
import ConfigSistema from "./pages/ConfigSistema";
import LogsAuditoria from "./pages/LogsAuditoria";
import NotFound from "./pages/NotFound";
import MeuPerfil from "./pages/MeuPerfil";
import ResetPassword from "./pages/ResetPassword";
import DemoMode from "./pages/DemoMode";
import ItensCriticos from "./pages/ItensCriticos";
import DashboardRH from "./pages/rh/DashboardRH";
import Colaboradores from "./pages/rh/Colaboradores";
import Ferias from "./pages/rh/Ferias";
import Atestados from "./pages/rh/Atestados";
import Treinamentos from "./pages/rh/Treinamentos";
import BancoDeHoras from "./pages/rh/BancoDeHoras";
import Avaliacoes from "./pages/rh/Avaliacoes";
import AnalisesIndicadores from "./pages/rh/AnalisesIndicadores";
import ASOControl from "./pages/rh/ASOControl";
import Ocorrencias from "./pages/rh/Ocorrencias";
import Desenvolvimento from "./pages/rh/Desenvolvimento";
import PainelDiario from "./pages/rh/PainelDiario";
import Desligamentos from "./pages/rh/Desligamentos";
import ImportarFuncionarios from "./pages/rh/ImportarFuncionarios";
import Turnover from "./pages/rh/Turnover";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import ConferenciaTemperatura from "./pages/logistica/ConferenciaTemperatura";
import DashboardAcademia from "./pages/academia/DashboardAcademia";
import Alunos from "./pages/academia/Alunos";
import Mensalidades from "./pages/academia/Mensalidades";
import DashboardFinanceiro from "./pages/financeiro/DashboardFinanceiro";
import Lancamentos from "./pages/financeiro/Lancamentos";
import FluxoCaixa from "./pages/financeiro/FluxoCaixa";
import RelatoriosFinanceiros from "./pages/financeiro/RelatoriosFinanceiros";
import PDV from "./pages/vendas/PDV";
import HistoricoVendas from "./pages/vendas/HistoricoVendas";
import RelatoriosVendas from "./pages/vendas/RelatoriosVendas";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/demo" element={<DemoMode />} />
            
            {/* Home — all authenticated roles */}
            <Route path="/" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador', 'usuario almox']}>
                <Index />
              </RoleProtectedRoute>
            } />
            
            {/* === LOGÍSTICA === */}
            <Route path="/cadastrar-material" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><CadastrarMaterial /></RoleProtectedRoute>} />
            <Route path="/atualizar-estoque" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><AtualizarEstoque /></RoleProtectedRoute>} />
            <Route path="/gerar-oc" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><GerarOC /></RoleProtectedRoute>} />
            <Route path="/gerenciar-oc" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><GerenciarOC /></RoleProtectedRoute>} />
            <Route path="/criar-setor" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><CriarSetor /></RoleProtectedRoute>} />
            <Route path="/listar-setores" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><ListarSetores /></RoleProtectedRoute>} />
            <Route path="/conciliacao" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><Conciliacao /></RoleProtectedRoute>} />
            <Route path="/qr-scanner" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><QRScanner /></RoleProtectedRoute>} />
            <Route path="/gerar-qrcode" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><GerarQRCode /></RoleProtectedRoute>} />
            <Route path="/historico-movimentacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><HistoricoMovimentacoes /></RoleProtectedRoute>} />
            <Route path="/importar-planilha" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><ImportarPlanilha /></RoleProtectedRoute>} />
            <Route path="/recontagem" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><Recontagem /></RoleProtectedRoute>} />
            <Route path="/itens-criticos" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><ItensCriticos /></RoleProtectedRoute>} />
            <Route path="/conferencia-temperatura" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica"><ConferenciaTemperatura /></RoleProtectedRoute>} />

            {/* === SOLICITAÇÕES === */}
            <Route path="/solicitar-material" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox', 'solicitante']} moduleKey="logistica"><SolicitarMaterial /></RoleProtectedRoute>} />
            <Route path="/listar-solicitacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox', 'solicitante']} moduleKey="logistica"><ListarSolicitacoes /></RoleProtectedRoute>} />
            
            {/* === ADMIN === */}
            <Route path="/criar-usuario" element={<RoleProtectedRoute allowedRoles={['superadm', 'admin']}><CriarUsuario /></RoleProtectedRoute>} />
            <Route path="/instalar-app" element={<RoleProtectedRoute allowedRoles={['admin']}><InstalarApp /></RoleProtectedRoute>} />

            {/* === SUPERADMIN === */}
            <Route path="/listar-empresas" element={<RoleProtectedRoute allowedRoles={['superadm']}><ListarEmpresas /></RoleProtectedRoute>} />
            <Route path="/gestao-empresas" element={<RoleProtectedRoute allowedRoles={['superadm']}><GestaoEmpresas /></RoleProtectedRoute>} />
            <Route path="/gestao-usuarios" element={<RoleProtectedRoute allowedRoles={['superadm']}><GestaoUsuarios /></RoleProtectedRoute>} />
            <Route path="/gestao-modulos" element={<RoleProtectedRoute allowedRoles={['superadm']}><GestaoModulos /></RoleProtectedRoute>} />
            <Route path="/gestao-planos" element={<RoleProtectedRoute allowedRoles={['superadm']}><GestaoPlanos /></RoleProtectedRoute>} />
            <Route path="/config-sistema" element={<RoleProtectedRoute allowedRoles={['superadm']}><ConfigSistema /></RoleProtectedRoute>} />
            <Route path="/logs-auditoria" element={<RoleProtectedRoute allowedRoles={['superadm']}><LogsAuditoria /></RoleProtectedRoute>} />

            {/* === PERFIL === */}
            <Route path="/meu-perfil" element={<RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador']}><MeuPerfil /></RoleProtectedRoute>} />

            {/* === GESTÃO DE PESSOAS === */}
            <Route path="/rh" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><DashboardRH /></RoleProtectedRoute>} />
            <Route path="/rh/colaboradores" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Colaboradores /></RoleProtectedRoute>} />
            <Route path="/rh/ferias" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Ferias /></RoleProtectedRoute>} />
            <Route path="/rh/atestados" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Atestados /></RoleProtectedRoute>} />
            <Route path="/rh/treinamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Treinamentos /></RoleProtectedRoute>} />
            <Route path="/rh/banco-de-horas" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><BancoDeHoras /></RoleProtectedRoute>} />
            <Route path="/rh/avaliacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Avaliacoes /></RoleProtectedRoute>} />
            <Route path="/rh/analises" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/indicadores" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/graficos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/aso" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><ASOControl /></RoleProtectedRoute>} />
            <Route path="/rh/ocorrencias" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Ocorrencias /></RoleProtectedRoute>} />
            <Route path="/rh/desenvolvimento" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Desenvolvimento /></RoleProtectedRoute>} />
            <Route path="/rh/painel-diario" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><PainelDiario /></RoleProtectedRoute>} />
            <Route path="/rh/desligamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']} moduleKey="rh"><Desligamentos /></RoleProtectedRoute>} />
            <Route path="/rh/turnover" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh"><Turnover /></RoleProtectedRoute>} />
            <Route path="/rh/importar-funcionarios" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']} moduleKey="rh"><ImportarFuncionarios /></RoleProtectedRoute>} />

            {/* === ACADEMIA === */}
            <Route path="/academia" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="academia"><DashboardAcademia /></RoleProtectedRoute>} />
            <Route path="/academia/alunos" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="academia"><Alunos /></RoleProtectedRoute>} />
            <Route path="/academia/mensalidades" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="academia"><Mensalidades /></RoleProtectedRoute>} />
            
            {/* === FINANCEIRO === */}
            <Route path="/financeiro" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro"><DashboardFinanceiro /></RoleProtectedRoute>} />
            <Route path="/financeiro/lancamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro"><Lancamentos /></RoleProtectedRoute>} />
            <Route path="/financeiro/fluxo-caixa" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro"><FluxoCaixa /></RoleProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro"><RelatoriosFinanceiros /></RoleProtectedRoute>} />

            {/* === VENDAS === */}
            <Route path="/vendas/pdv" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="vendas"><PDV /></RoleProtectedRoute>} />
            <Route path="/vendas/historico" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'financeiro']} moduleKey="vendas"><HistoricoVendas /></RoleProtectedRoute>} />
            <Route path="/vendas/relatorios" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'financeiro']} moduleKey="vendas"><RelatoriosVendas /></RoleProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
