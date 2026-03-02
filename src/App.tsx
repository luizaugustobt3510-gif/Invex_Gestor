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
import Indicadores from "./pages/rh/Indicadores";
import ASOControl from "./pages/rh/ASOControl";

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
            
            <Route path="/" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador']}>
                <Index />
              </RoleProtectedRoute>
            } />
            
            <Route path="/cadastrar-material" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <CadastrarMaterial />
              </RoleProtectedRoute>
            } />
            <Route path="/atualizar-estoque" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'logistica']}>
                <AtualizarEstoque />
              </RoleProtectedRoute>
            } />
            
            

            
            <Route path="/qr-scanner" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'logistica']}>
                <QRScanner />
              </RoleProtectedRoute>
            } />
            
            <Route path="/gerar-qrcode" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <GerarQRCode />
              </RoleProtectedRoute>
            } />
            
            <Route path="/historico-movimentacoes" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'logistica']}>
                <HistoricoMovimentacoes />
              </RoleProtectedRoute>
            } />
            
            <Route path="/conciliacao" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <Conciliacao />
              </RoleProtectedRoute>
            } />
            
            <Route path="/recontagem" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <Recontagem />
              </RoleProtectedRoute>
            } />
            
            <Route path="/gerar-oc" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <GerarOC />
              </RoleProtectedRoute>
            } />
            
            <Route path="/gerenciar-oc" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <GerenciarOC />
              </RoleProtectedRoute>
            } />
            
            <Route path="/criar-setor" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <CriarSetor />
              </RoleProtectedRoute>
            } />
            <Route path="/listar-setores" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <ListarSetores />
              </RoleProtectedRoute>
            } />
            
            <Route path="/solicitar-material" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica']}>
                <SolicitarMaterial />
              </RoleProtectedRoute>
            } />
            <Route path="/listar-solicitacoes" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica']}>
                <ListarSolicitacoes />
              </RoleProtectedRoute>
            } />
            
            <Route path="/importar-planilha" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <ImportarPlanilha />
              </RoleProtectedRoute>
            } />
            
            <Route path="/criar-usuario" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <CriarUsuario />
              </RoleProtectedRoute>
            } />
            <Route path="/listar-empresas" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <ListarEmpresas />
              </RoleProtectedRoute>
            } />

            <Route path="/instalar-app" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <InstalarApp />
              </RoleProtectedRoute>
            } />

            <Route path="/gestao-empresas" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <GestaoEmpresas />
              </RoleProtectedRoute>
            } />
            <Route path="/gestao-modulos" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <GestaoModulos />
              </RoleProtectedRoute>
            } />
            <Route path="/gestao-planos" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <GestaoPlanos />
              </RoleProtectedRoute>
            } />
            <Route path="/config-sistema" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <ConfigSistema />
              </RoleProtectedRoute>
            } />
            <Route path="/logs-auditoria" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <LogsAuditoria />
              </RoleProtectedRoute>
            } />

            <Route path="/meu-perfil" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador']}>
                <MeuPerfil />
              </RoleProtectedRoute>
            } />

            <Route path="/itens-criticos" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'logistica']}>
                <ItensCriticos />
              </RoleProtectedRoute>
            } />

            {/* Módulo RH — visualizador tem acesso somente leitura */}
            <Route path="/rh" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <DashboardRH />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/colaboradores" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Colaboradores />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/ferias" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Ferias />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/atestados" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Atestados />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/treinamentos" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Treinamentos />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/banco-de-horas" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <BancoDeHoras />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/avaliacoes" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Avaliacoes />
              </RoleProtectedRoute>
            } />
            <Route path="/rh/indicadores" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'rh', 'visualizador']}>
                <Indicadores />
              </RoleProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
