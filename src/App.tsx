import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CadastrarMaterial from "./pages/CadastrarMaterial";
import GerarOC from "./pages/GerarOC";
import AtualizarEstoque from "./pages/AtualizarEstoque";
import MovimentarEstoqueNew from "./pages/MovimentarEstoqueNew";
import CriarSetor from "./pages/CriarSetor";
import ListarSetores from "./pages/ListarSetores";
import SolicitarMaterial from "./pages/SolicitarMaterial";
import ListarSolicitacoes from "./pages/ListarSolicitacoes";
import CriarUsuario from "./pages/CriarUsuario";
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
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            
            {/* Rotas para superadm e admin */}
            <Route path="/cadastrar-material" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <CadastrarMaterial />
              </RoleProtectedRoute>
            } />
            <Route path="/gerar-oc" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <GerarOC />
              </RoleProtectedRoute>
            } />
            <Route path="/atualizar-estoque" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <AtualizarEstoque />
              </RoleProtectedRoute>
            } />
            <Route path="/movimentar-estoque" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <MovimentarEstoqueNew />
              </RoleProtectedRoute>
            } />
            <Route path="/criar-setor" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin']}>
                <CriarSetor />
              </RoleProtectedRoute>
            } />
            <Route path="/listar-setores" element={
              <RoleProtectedRoute allowedRoles={['superadm', 'admin', 'usuario almox']}>
                <ListarSetores />
              </RoleProtectedRoute>
            } />
            
            {/* Rotas para solicitantes */}
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
            
            {/* Rota exclusiva superadm */}
            <Route path="/criar-usuario" element={
              <RoleProtectedRoute allowedRoles={['superadm']}>
                <CriarUsuario />
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
