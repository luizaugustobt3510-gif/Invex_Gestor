import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { EmailRestrictedRoute } from "./components/EmailRestrictedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CadastrarMaterial from "./pages/CadastrarMaterial";
import GerarOC from "./pages/GerarOC";
import AtualizarEstoque from "./pages/AtualizarEstoque";
import DashboardLogistica from "./pages/DashboardLogistica";

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
import FitnessLogin from "./pages/fitness/FitnessLogin";
import FitnessOnboarding from "./pages/fitness/FitnessOnboarding";
import FitnessDashboard from "./pages/fitness/FitnessDashboard";
import FitnessPerfil from "./pages/fitness/FitnessPerfil";
import FitnessTreinos from "./pages/fitness/FitnessTreinos";
import FitnessEvolucao from "./pages/fitness/FitnessEvolucao";
import FitnessHistorico from "./pages/fitness/FitnessHistorico";
import FitnessConquistas from "./pages/fitness/FitnessConquistas";
import FitnessAlimentacao from "./pages/fitness/FitnessAlimentacao";
import { FitnessProtectedRoute } from "./components/FitnessProtectedRoute";
import DashboardFinanceiro from "./pages/financeiro/DashboardFinanceiro";
import Lancamentos from "./pages/financeiro/Lancamentos";
import FluxoCaixa from "./pages/financeiro/FluxoCaixa";
import RelatoriosFinanceiros from "./pages/financeiro/RelatoriosFinanceiros";
import DashboardVendas from "./pages/vendas/DashboardVendas";
import PDV from "./pages/vendas/PDV";
import HistoricoVendas from "./pages/vendas/HistoricoVendas";
import RelatoriosVendas from "./pages/vendas/RelatoriosVendas";
import Fornecedores from "./pages/logistica/Fornecedores";
import Reposicao from "./pages/logistica/Reposicao";
import CurvaABCInteligente from "./pages/logistica/CurvaABCInteligente";
import EstoqueInteligente from "./pages/logistica/EstoqueInteligente";
import DashboardManutencao from "./pages/manutencao/DashboardManutencao";
import CadastroManutencao from "./pages/manutencao/CadastroManutencao";
import ListagemManutencao from "./pages/manutencao/ListagemManutencao";
import SolicitacaoOS from "./pages/manutencao/SolicitacaoOS";
import DashboardBeneficios from "./pages/beneficios/DashboardBeneficios";
import CadastroBeneficios from "./pages/beneficios/CadastroBeneficios";
import VinculoBeneficios from "./pages/beneficios/VinculoBeneficios";
import ControleMensalBeneficios from "./pages/beneficios/ControleMensalBeneficios";
import DashboardFolha from "./pages/folha/DashboardFolha";
import ConfiguracaoFolha from "./pages/folha/ConfiguracaoFolha";
import SimulacaoFolha from "./pages/folha/SimulacaoFolha";
import HistoricoFolha from "./pages/folha/HistoricoFolha";
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
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador', 'usuario almox', 'manutencao', 'fitness']}>
                <Index />
              </RoleProtectedRoute>
            } />
            
            {/* === LOGÍSTICA === */}
            <Route path="/logistica/dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.dashboard"><DashboardLogistica /></RoleProtectedRoute>} />
            <Route path="/cadastrar-material" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica" submoduleKey="logistica.estoque"><CadastrarMaterial /></RoleProtectedRoute>} />
            <Route path="/atualizar-estoque" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica" submoduleKey="logistica.estoque"><AtualizarEstoque /></RoleProtectedRoute>} />
            <Route path="/gerar-oc" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica" submoduleKey="logistica.ordem_compra"><GerarOC /></RoleProtectedRoute>} />
            <Route path="/gerenciar-oc" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica" submoduleKey="logistica.ordem_compra"><GerenciarOC /></RoleProtectedRoute>} />
            <Route path="/criar-setor" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><CriarSetor /></RoleProtectedRoute>} />
            <Route path="/listar-setores" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><ListarSetores /></RoleProtectedRoute>} />
            <Route path="/conciliacao" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica" submoduleKey="logistica.conciliacao_estoque"><Conciliacao /></RoleProtectedRoute>} />
            <Route path="/qr-scanner" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><QRScanner /></RoleProtectedRoute>} />
            <Route path="/gerar-qrcode" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><GerarQRCode /></RoleProtectedRoute>} />
            <Route path="/historico-movimentacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><HistoricoMovimentacoes /></RoleProtectedRoute>} />
            <Route path="/importar-planilha" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><ImportarPlanilha /></RoleProtectedRoute>} />
            <Route path="/recontagem" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><Recontagem /></RoleProtectedRoute>} />
            <Route path="/itens-criticos" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><ItensCriticos /></RoleProtectedRoute>} />
            <Route path="/reposicao" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.estoque"><Reposicao /></RoleProtectedRoute>} />
            <Route path="/conferencia-temperatura" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox']} moduleKey="logistica" submoduleKey="logistica.conferencia"><ConferenciaTemperatura /></RoleProtectedRoute>} />
            <Route path="/fornecedores" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><Fornecedores /></RoleProtectedRoute>} />
            <Route path="/curva-abc" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><CurvaABCInteligente /></RoleProtectedRoute>} />
            <Route path="/estoque-inteligente" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="logistica"><EstoqueInteligente /></RoleProtectedRoute>} />

            {/* === SOLICITAÇÕES === */}
            <Route path="/solicitar-material" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox', 'solicitante']} moduleKey="logistica" submoduleKey="logistica.solicitacoes"><SolicitarMaterial /></RoleProtectedRoute>} />
            <Route path="/listar-solicitacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'usuario almox', 'solicitante']} moduleKey="logistica" submoduleKey="logistica.solicitacoes"><ListarSolicitacoes /></RoleProtectedRoute>} />
            
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
            <Route path="/meu-perfil" element={<RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador', 'manutencao']}><MeuPerfil /></RoleProtectedRoute>} />

            {/* === GESTÃO DE PESSOAS === */}
            <Route path="/rh" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.dashboard"><DashboardRH /></RoleProtectedRoute>} />
            <Route path="/rh/colaboradores" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.dashboard"><Colaboradores /></RoleProtectedRoute>} />
            <Route path="/rh/ferias" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.ferias"><Ferias /></RoleProtectedRoute>} />
            <Route path="/rh/atestados" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.atestados"><Atestados /></RoleProtectedRoute>} />
            <Route path="/rh/treinamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.treinamentos"><Treinamentos /></RoleProtectedRoute>} />
            <Route path="/rh/banco-de-horas" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.dashboard"><BancoDeHoras /></RoleProtectedRoute>} />
            <Route path="/rh/avaliacoes" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.avaliacoes"><Avaliacoes /></RoleProtectedRoute>} />
            <Route path="/rh/analises" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.analises_indicadores"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/indicadores" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.analises_indicadores"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/graficos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.analises_indicadores"><AnalisesIndicadores /></RoleProtectedRoute>} />
            <Route path="/rh/aso" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.aso"><ASOControl /></RoleProtectedRoute>} />
            <Route path="/rh/ocorrencias" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.ocorrencias"><Ocorrencias /></RoleProtectedRoute>} />
            <Route path="/rh/desenvolvimento" element={<Navigate to="/rh/dashboard" replace />} />
            <Route path="/rh/painel-diario" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.dashboard"><PainelDiario /></RoleProtectedRoute>} />
            <Route path="/rh/desligamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']} moduleKey="rh" submoduleKey="rh.desligamentos"><Desligamentos /></RoleProtectedRoute>} />
            <Route path="/rh/turnover" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'visualizador']} moduleKey="rh" submoduleKey="rh.turnover"><Turnover /></RoleProtectedRoute>} />
            <Route path="/rh/importar-funcionarios" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']} moduleKey="rh" submoduleKey="rh.dashboard"><ImportarFuncionarios /></RoleProtectedRoute>} />

            {/* === INVEX FITNESS — exclusivo empresa Invex Fitness === */}
            <Route path="/fitness/login" element={<FitnessLogin />} />
            <Route path="/academia" element={<Navigate to="/fitness" replace />} />
            <Route path="/academia/*" element={<Navigate to="/fitness" replace />} />
            <Route path="/fitness" element={<FitnessProtectedRoute><FitnessDashboard /></FitnessProtectedRoute>} />
            <Route path="/fitness/onboarding" element={<FitnessProtectedRoute><FitnessOnboarding /></FitnessProtectedRoute>} />
            <Route path="/fitness/perfil" element={<FitnessProtectedRoute><FitnessPerfil /></FitnessProtectedRoute>} />
            <Route path="/fitness/treinos" element={<FitnessProtectedRoute><FitnessTreinos /></FitnessProtectedRoute>} />
            <Route path="/fitness/evolucao" element={<FitnessProtectedRoute><FitnessEvolucao /></FitnessProtectedRoute>} />
            <Route path="/fitness/historico" element={<FitnessProtectedRoute><FitnessHistorico /></FitnessProtectedRoute>} />
            <Route path="/fitness/conquistas" element={<FitnessProtectedRoute><FitnessConquistas /></FitnessProtectedRoute>} />
            <Route path="/fitness/alimentacao" element={<FitnessProtectedRoute><FitnessAlimentacao /></FitnessProtectedRoute>} />

            
            
            {/* === FINANCEIRO === */}
            <Route path="/financeiro" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro" submoduleKey="financeiro.dashboard"><DashboardFinanceiro /></RoleProtectedRoute>} />
            <Route path="/financeiro/lancamentos" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro" submoduleKey="financeiro.lancamentos"><Lancamentos /></RoleProtectedRoute>} />
            <Route path="/financeiro/fluxo-caixa" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro" submoduleKey="financeiro.fluxo_caixa"><FluxoCaixa /></RoleProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<RoleProtectedRoute allowedRoles={['admin', 'financeiro', 'logistica']} moduleKey="financeiro" submoduleKey="financeiro.relatorios"><RelatoriosFinanceiros /></RoleProtectedRoute>} />

            {/* === VENDAS === */}
            <Route path="/vendas" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'financeiro']} moduleKey="vendas"><DashboardVendas /></RoleProtectedRoute>} />
            <Route path="/vendas/pdv" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica']} moduleKey="vendas"><PDV /></RoleProtectedRoute>} />
            <Route path="/vendas/historico" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'financeiro']} moduleKey="vendas"><HistoricoVendas /></RoleProtectedRoute>} />
            <Route path="/vendas/relatorios" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'financeiro']} moduleKey="vendas"><RelatoriosVendas /></RoleProtectedRoute>} />

            {/* === MANUTENÇÃO === */}
            <Route path="/manutencao" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'manutencao']} moduleKey="manutencao"><DashboardManutencao /></RoleProtectedRoute>} />
            <Route path="/manutencao/cadastro" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'manutencao']} moduleKey="manutencao"><CadastroManutencao /></RoleProtectedRoute>} />
            <Route path="/manutencao/listagem" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'manutencao', 'solicitante', 'visualizador']} moduleKey="manutencao"><ListagemManutencao /></RoleProtectedRoute>} />
            <Route path="/manutencao/solicitacao-os" element={<RoleProtectedRoute allowedRoles={['admin', 'logistica', 'manutencao', 'solicitante']} moduleKey="manutencao"><SolicitacaoOS /></RoleProtectedRoute>} />

            {/* === BENEFÍCIOS === */}
            <Route path="/beneficios" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro', 'visualizador']}><DashboardBeneficios /></RoleProtectedRoute>} />
            <Route path="/beneficios/cadastro" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']}><CadastroBeneficios /></RoleProtectedRoute>} />
            <Route path="/beneficios/vinculo" element={<RoleProtectedRoute allowedRoles={['admin', 'rh']}><VinculoBeneficios /></RoleProtectedRoute>} />
            <Route path="/beneficios/controle-mensal" element={<RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro']}><ControleMensalBeneficios /></RoleProtectedRoute>} />
            <Route path="/folha" element={<EmailRestrictedRoute allowedEmails={['teste@invex.com']}><RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro']}><DashboardFolha /></RoleProtectedRoute></EmailRestrictedRoute>} />
            <Route path="/folha/configuracao" element={<EmailRestrictedRoute allowedEmails={['teste@invex.com']}><RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro']}><ConfiguracaoFolha /></RoleProtectedRoute></EmailRestrictedRoute>} />
            <Route path="/folha/simulacao" element={<EmailRestrictedRoute allowedEmails={['teste@invex.com']}><RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro']}><SimulacaoFolha /></RoleProtectedRoute></EmailRestrictedRoute>} />
            <Route path="/folha/historico" element={<EmailRestrictedRoute allowedEmails={['teste@invex.com']}><RoleProtectedRoute allowedRoles={['admin', 'rh', 'financeiro']}><HistoricoFolha /></RoleProtectedRoute></EmailRestrictedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
