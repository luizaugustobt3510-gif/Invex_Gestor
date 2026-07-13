import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import DashboardSuperAdmin from "./DashboardSuperAdmin";
import DashboardEmpresa from "./DashboardEmpresa";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MODULES_CATALOG } from "@/config/modules";
import { LayoutDashboard, ArrowRight } from "lucide-react";

/**
 * Página inicial. Se o usuário não tem acesso ao módulo `dashboard`
 * (desativado especificamente para ele em Usuário × Módulos),
 * mostra atalhos rápidos aos módulos elegíveis e ativos.
 */
const Index = () => {
  const { user } = useAuth();
  const { canAccessModule, loading } = useModuleAccess();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  // SuperAdmin → platform management only
  if (user.role === 'superadm') return <DashboardSuperAdmin />;

  // Fitness user → go straight to Invex Fitness app
  if (user.role === 'fitness') return <Navigate to="/fitness" replace />;

  // Solicitante → go to solicitations directly
  if (user.role === 'solicitante') return <Navigate to="/solicitar-material" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Admin da empresa sempre tem dashboard
  const hasDashboard = user.role === 'admin' ? true : canAccessModule('dashboard');

  if (hasDashboard) return <DashboardEmpresa />;

  // Fallback: atalhos rápidos aos módulos elegíveis e ativos
  const shortcuts = MODULES_CATALOG.filter(
    (m) => m.key !== 'dashboard' && m.route && canAccessModule(m.key),
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold">Olá, {user.nome}</h1>
          <p className="text-muted-foreground text-sm">
            Escolha um módulo para começar
          </p>
        </div>

        {shortcuts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum módulo disponível para o seu usuário. Fale com o administrador.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((m) => (
              <button
                key={m.key}
                onClick={() => navigate(m.route!)}
                className="group text-left rounded-xl border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{m.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
