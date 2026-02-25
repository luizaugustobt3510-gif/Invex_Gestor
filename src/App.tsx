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
import NotFound from "./pages/NotFound";

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
            
            <Route path="/" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'solicitante']}>
                <Index />
              </RoleProtectedRoute>
            } />
            
            <Route path="/cadastrar-material" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <CadastrarMaterial />
              </RoleProtectedRoute>
            } />
            <Route path="/atualizar-estoque" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <AtualizarEstoque />
              </RoleProtectedRoute>
            } />
            
            

            
            <Route path="/qr-scanner" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <QRScanner />
              </RoleProtectedRoute>
            } />
            
            <Route path="/gerar-qrcode" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <GerarQRCode />
              </RoleProtectedRoute>
            } />
            
            <Route path="/historico-movimentacoes" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <HistoricoMovimentacoes />
              </RoleProtectedRoute>
            } />
            
            <Route path="/conciliacao" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <Conciliacao />
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
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante']}>
                <SolicitarMaterial />
              </RoleProtectedRoute>
            } />
            <Route path="/listar-solicitacoes" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox', 'solicitante']}>
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
